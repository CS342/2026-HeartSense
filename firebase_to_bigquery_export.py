"""
HeartSense — Firebase (Firestore) → BigQuery Export Script
==========================================================
Exports all 11 Firestore collections to BigQuery tables:
  · activities
  · daily_engagement_logs
  · engagement_alerts
  · engagement_stats
  · health_data
  · medical_conditions
  · profiles
  · symptoms
  · user_milestones
  · user_preferences
  · well_being_ratings

Requirements:
    pip install firebase-admin google-cloud-bigquery

Authentication:
    Set GOOGLE_APPLICATION_CREDENTIALS to the path of a service account JSON
    that has Firestore read access + BigQuery Data Editor and Job User roles.

Usage:
    # Full export — replaces all BigQuery tables (WRITE_TRUNCATE)
    python firebase_to_bigquery_export.py

    # Incremental — only records since a given date (WRITE_APPEND)
    python firebase_to_bigquery_export.py --since 2026-01-01

    # Single collection
    python firebase_to_bigquery_export.py --collection symptoms

Notes on naming conventions:
    Firestore collections are inconsistent — some use camelCase (activities,
    symptoms, engagement_*, user_milestones, daily_engagement_logs) and some
    use snake_case (health_data, medical_conditions, profiles, user_preferences,
    well_being_ratings). Schemas reflect the exact field names from Firestore.

    health_data.created_at and health_data.recorded_at are stored as ISO strings,
    not Firestore Timestamps. Incremental filtering is skipped for that collection.

    user_preferences documents use the userId as the document ID — userId is
    extracted from doc_id automatically during export.

    user_milestones and medical_conditions have no createdAt/created_at field;
    incremental filtering falls back to achievedAt / occurred_at respectively.
"""

import argparse
import logging
import os
from datetime import datetime, timezone
from typing import Any

import firebase_admin
from firebase_admin import credentials, firestore
from google.cloud import bigquery

# ── Configuration ──────────────────────────────────────────────────────────────

FIREBASE_PROJECT_ID = "cs342-2026-wong-3qriyd12e"
BIGQUERY_PROJECT_ID = "heartsense-488403"
BIGQUERY_DATASET    = "heartsense_data"

COLLECTIONS = [
    "activities",
    "daily_engagement_logs",
    "engagement_alerts",
    "engagement_stats",
    "health_data",
    "medical_conditions",
    "profiles",
    "symptoms",
    "user_milestones",
    "user_preferences",
    "well_being_ratings",
]

# Per-collection field used for incremental (--since) filtering.
# None = skip incremental filter for that collection (full fetch every time).
INCREMENTAL_FIELD: dict[str, str | None] = {
    "activities":            "createdAt",
    "daily_engagement_logs": "createdAt",
    "engagement_alerts":     "createdAt",
    "engagement_stats":      "createdAt",
    "health_data":           None,          # stored as ISO string, not Timestamp
    "medical_conditions":    "occurred_at",
    "profiles":              "created_at",
    "symptoms":              "createdAt",
    "user_milestones":       "achievedAt",
    "user_preferences":      "created_at",
    "well_being_ratings":    "recorded_at",
}

# ── BigQuery Schemas ───────────────────────────────────────────────────────────
# All field names are exact matches to Firestore field names.

SCHEMAS: dict[str, list[bigquery.SchemaField]] = {

    # Confirmed from Firestore console (first screenshot)
    "activities": [
        bigquery.SchemaField("doc_id",          "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",          "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("activityType",    "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("caloriesBurned",  "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("distanceKm",      "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("durationMinutes", "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("indoor",          "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("intensity",       "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("source",          "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("description",     "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("healthkitUuid",   "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("occurredAt",      "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("createdAt",       "TIMESTAMP", mode="NULLABLE"),
    ],

    "daily_engagement_logs": [
        bigquery.SchemaField("doc_id",                  "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",                  "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("date",                    "STRING",    mode="NULLABLE"),  # "2026-03-03"
        bigquery.SchemaField("activityCount",           "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("entryCount",              "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("symptomCount",            "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("medicalConditionLogged",  "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("wellbeingRatingLogged",   "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("createdAt",               "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updatedAt",               "TIMESTAMP", mode="NULLABLE"),
    ],

    "engagement_alerts": [
        bigquery.SchemaField("doc_id",      "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",      "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("alertType",   "STRING",    mode="NULLABLE"),  # e.g. "inactivity_warning"
        bigquery.SchemaField("title",       "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("message",     "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("priority",    "STRING",    mode="NULLABLE"),  # e.g. "low"
        bigquery.SchemaField("isRead",      "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("isDismissed", "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("notifiedAt",  "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("createdAt",   "TIMESTAMP", mode="NULLABLE"),
    ],

    "engagement_stats": [
        bigquery.SchemaField("doc_id",                "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",                "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("totalEntriesLogged",    "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("totalDaysActive",       "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("monthlyEntryCount",     "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("weeklyEntryCount",      "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("lastActivityDate",      "STRING",    mode="NULLABLE"),  # "2026-03-04"
        bigquery.SchemaField("lastActivityTimestamp", "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("createdAt",             "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updatedAt",             "TIMESTAMP", mode="NULLABLE"),
    ],

    # snake_case throughout; created_at and recorded_at are ISO strings, not Timestamps
    "health_data": [
        bigquery.SchemaField("doc_id",     "STRING",  mode="REQUIRED"),
        bigquery.SchemaField("user_id",    "STRING",  mode="NULLABLE"),
        bigquery.SchemaField("data_type",  "STRING",  mode="NULLABLE"),  # e.g. "dailySteps"
        bigquery.SchemaField("value",      "FLOAT",   mode="NULLABLE"),
        bigquery.SchemaField("unit",       "STRING",  mode="NULLABLE"),  # e.g. "count"
        bigquery.SchemaField("recorded_at","STRING",  mode="NULLABLE"),  # "2026-02-17" string
        bigquery.SchemaField("created_at", "STRING",  mode="NULLABLE"),  # ISO string
    ],

    # snake_case; no createdAt — occurred_at used for incremental
    "medical_conditions": [
        bigquery.SchemaField("doc_id",         "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("user_id",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("condition_type", "STRING",    mode="NULLABLE"),  # e.g. "New Medication"
        bigquery.SchemaField("description",    "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("occurred_at",    "TIMESTAMP", mode="NULLABLE"),
    ],

    # snake_case throughout
    "profiles": [
        bigquery.SchemaField("doc_id",                      "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("email",                       "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("full_name",                   "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("gender",                      "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("date_of_birth",               "STRING",    mode="NULLABLE"),  # "2001-10-26"
        bigquery.SchemaField("height_cm",                   "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("weight_kg",                   "FLOAT",     mode="NULLABLE"),
        bigquery.SchemaField("apple_watch_consent",         "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("apple_watch_consent_at",      "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("email_verified",              "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("email_verification_sent_at",  "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("onboarding_completed",        "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("onboarding_completed_at",     "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("created_at",                  "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at",                  "TIMESTAMP", mode="NULLABLE"),
    ],

    # camelCase; description is free-text notes field
    "symptoms": [
        bigquery.SchemaField("doc_id",       "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",       "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("symptomType",  "STRING",    mode="NULLABLE"),  # e.g. "Racing Heart"
        bigquery.SchemaField("severity",     "INTEGER",   mode="NULLABLE"),  # 1–5 scale
        bigquery.SchemaField("description",  "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("occurredAt",   "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("createdAt",    "TIMESTAMP", mode="NULLABLE"),
    ],

    # camelCase; no createdAt — achievedAt used for incremental
    "user_milestones": [
        bigquery.SchemaField("doc_id",        "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("milestoneType", "STRING",    mode="NULLABLE"),  # e.g. "first_entry"
        bigquery.SchemaField("notified",      "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("achievedAt",    "TIMESTAMP", mode="NULLABLE"),
    ],

    # snake_case; doc ID = userId (extracted automatically below)
    "user_preferences": [
        bigquery.SchemaField("doc_id",                          "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("userId",                          "STRING",    mode="NULLABLE"),  # = doc_id
        bigquery.SchemaField("elevated_heart_rate_threshold_bpm","INTEGER",  mode="NULLABLE"),
        bigquery.SchemaField("notify_elevated_heart_rate",      "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("notify_daily_reminder",           "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("notify_activity_milestones",      "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("notify_health_insights",          "BOOLEAN",   mode="NULLABLE"),
        bigquery.SchemaField("created_at",                      "TIMESTAMP", mode="NULLABLE"),
        bigquery.SchemaField("updated_at",                      "TIMESTAMP", mode="NULLABLE"),
    ],

    # snake_case; no separate createdAt — recorded_at used for incremental
    "well_being_ratings": [
        bigquery.SchemaField("doc_id",       "STRING",    mode="REQUIRED"),
        bigquery.SchemaField("user_id",      "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("mood_rating",  "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("energy_level", "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("stress_level", "INTEGER",   mode="NULLABLE"),
        bigquery.SchemaField("notes",        "STRING",    mode="NULLABLE"),
        bigquery.SchemaField("recorded_at",  "TIMESTAMP", mode="NULLABLE"),
    ],
}

# ── Logging ────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("heartsense_export")

# ── Firebase ───────────────────────────────────────────────────────────────────

def init_firebase() -> firestore.Client:
    if not firebase_admin._apps:
        cred_path = os.environ.get("FIREBASE_CREDENTIALS") or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
        cred = (
            credentials.Certificate(cred_path)
            if cred_path
            else credentials.ApplicationDefault()
        )
        firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID})
    return firestore.client()


def make_bigquery_client() -> bigquery.Client:
    bq_cred_path = os.environ.get("BIGQUERY_CREDENTIALS")
    if bq_cred_path:
        from google.oauth2 import service_account as sa
        bq_creds = sa.Credentials.from_service_account_file(
            bq_cred_path,
            scopes=["https://www.googleapis.com/auth/bigquery"],
        )
        return bigquery.Client(project=BIGQUERY_PROJECT_ID, credentials=bq_creds)
    return bigquery.Client(project=BIGQUERY_PROJECT_ID)


def fetch_collection(
    db: firestore.Client,
    collection: str,
    since: datetime | None = None,
) -> list[dict[str, Any]]:
    """
    Fetch all documents from a Firestore collection.
    Applies a >= filter on the per-collection timestamp field when --since is given.
    If the collection has no suitable timestamp field (e.g. health_data), fetches all docs.
    """
    ref = db.collection(collection)
    ts_field = INCREMENTAL_FIELD.get(collection)

    if since and ts_field:
        ref = ref.where(ts_field, ">=", since)
    elif since and not ts_field:
        log.warning(
            "  '%s' has no Firestore Timestamp field for incremental filtering — "
            "fetching all documents.", collection
        )

    rows = []
    for doc in ref.stream():
        data = doc.to_dict()
        data["doc_id"] = doc.id
        # user_preferences: doc ID is the userId
        if collection == "user_preferences":
            data.setdefault("userId", doc.id)
        rows.append(data)

    log.info("  Fetched %d documents from '%s'", len(rows), collection)
    return rows

# ── Serialization ──────────────────────────────────────────────────────────────

def _coerce(value: Any) -> Any:
    """Convert Firestore types to BigQuery-compatible Python types."""
    # Firestore Timestamp / DatetimeWithNanoseconds
    if hasattr(value, "timestamp") and callable(value.timestamp) and not isinstance(value, str):
        try:
            return value.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            pass
    if isinstance(value, datetime):
        return value.replace(tzinfo=timezone.utc).isoformat()
    # Firestore can return lists for multi-value fields — flatten to string
    if isinstance(value, list):
        return ", ".join(str(v) for v in value)
    return value


def serialize_rows(
    rows: list[dict[str, Any]],
    schema: list[bigquery.SchemaField],
) -> list[dict[str, Any]]:
    """Keep only schema-defined fields and coerce types. Unknown fields are dropped."""
    field_names = {f.name for f in schema}
    return [
        {k: _coerce(v) for k, v in row.items() if k in field_names}
        for row in rows
    ]

# ── BigQuery ───────────────────────────────────────────────────────────────────

def ensure_dataset(client: bigquery.Client) -> None:
    dataset_ref = bigquery.Dataset(f"{BIGQUERY_PROJECT_ID}.{BIGQUERY_DATASET}")
    dataset_ref.location = "US"
    client.create_dataset(dataset_ref, exists_ok=True)
    log.info("Dataset '%s.%s' ready.", BIGQUERY_PROJECT_ID, BIGQUERY_DATASET)


def load_to_bigquery(
    client: bigquery.Client,
    collection: str,
    rows: list[dict[str, Any]],
    schema: list[bigquery.SchemaField],
    incremental: bool = False,
) -> None:
    """
    Load rows into BigQuery.
      incremental=False → WRITE_TRUNCATE (full replace, safe to re-run)
      incremental=True  → WRITE_APPEND   (add new rows only)
    """
    if not rows:
        log.info("  No rows to load for '%s', skipping.", collection)
        return

    table_ref = f"{BIGQUERY_PROJECT_ID}.{BIGQUERY_DATASET}.{collection}"
    write_disposition = (
        bigquery.WriteDisposition.WRITE_APPEND
        if incremental
        else bigquery.WriteDisposition.WRITE_TRUNCATE
    )

    job_config = bigquery.LoadJobConfig(
        schema=schema,
        write_disposition=write_disposition,
        source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
    )

    job = client.load_table_from_json(rows, table_ref, job_config=job_config)
    job.result()  # blocks until complete

    dest = client.get_table(table_ref)
    log.info(
        "  Loaded %d rows → %s  (%d total rows in table)",
        len(rows), table_ref, dest.num_rows,
    )

# ── Export orchestration ───────────────────────────────────────────────────────

def export(collections: list[str], since: datetime | None = None) -> None:
    incremental = since is not None
    mode = f"incremental since {since.date()}" if incremental else "full (WRITE_TRUNCATE)"
    log.info("HeartSense export starting — mode: %s", mode)
    log.info("Firebase : %s", FIREBASE_PROJECT_ID)
    log.info("BigQuery : %s  /  dataset: %s", BIGQUERY_PROJECT_ID, BIGQUERY_DATASET)

    db = init_firebase()
    bq = make_bigquery_client()
    ensure_dataset(bq)

    success, skipped, failed = [], [], []

    for collection in collections:
        if collection not in SCHEMAS:
            log.warning("No schema defined for '%s' — skipping.", collection)
            skipped.append(collection)
            continue

        log.info("── Exporting: %s", collection)
        try:
            raw_rows = fetch_collection(db, collection, since=since)
            rows     = serialize_rows(raw_rows, SCHEMAS[collection])
            load_to_bigquery(bq, collection, rows, SCHEMAS[collection], incremental)
            success.append(collection)
        except Exception as exc:
            log.error("  FAILED '%s': %s", collection, exc)
            failed.append(collection)

    log.info(
        "Export complete — %d succeeded / %d skipped / %d failed.",
        len(success), len(skipped), len(failed),
    )
    if failed:
        log.error("Failed collections: %s", failed)

# ── CLI ────────────────────────────────────────────────────────────────────────

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Export HeartSense Firestore collections to BigQuery."
    )
    parser.add_argument(
        "--since",
        type=lambda s: datetime.strptime(s, "%Y-%m-%d").replace(tzinfo=timezone.utc),
        default=None,
        metavar="YYYY-MM-DD",
        help=(
            "Incremental mode: only export records where the timestamp field "
            ">= this date (uses WRITE_APPEND). Omit for a full export (WRITE_TRUNCATE)."
        ),
    )
    parser.add_argument(
        "--collection",
        choices=COLLECTIONS,
        default=None,
        metavar="COLLECTION",
        help="Export a single collection instead of all 11.",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    target = [args.collection] if args.collection else COLLECTIONS
    export(collections=target, since=args.since)
