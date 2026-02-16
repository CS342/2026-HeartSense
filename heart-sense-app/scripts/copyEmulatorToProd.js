const admin = require("firebase-admin");
const { Firestore } = require("@google-cloud/firestore");

// 1) Emulator Firestore client
const emulatorDb = new Firestore({
  projectId: process.env.FIREBASE_PROJECT_ID || "cs342-2026-wong-3qriyd12e",
  host: "127.0.0.1",
  port: 8080,
  ssl: false,
});

// 2) Prod Firestore (Admin SDK)
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: process.env.FIREBASE_PROJECT_ID || "cs342-2026-wong-3qriyd12e",
});
const prodDb = admin.firestore();

async function copyCollection(name) {
  const snap = await emulatorDb.collection(name).get();
  console.log(`Copying ${snap.size} docs from ${name}...`);

  const batchSize = 400;
  let batch = prodDb.batch();
  let count = 0;

  for (const doc of snap.docs) {
    batch.set(prodDb.collection(name).doc(doc.id), doc.data(), { merge: true });
    count++;
    if (count % batchSize === 0) {
      await batch.commit();
      batch = prodDb.batch();
    }
  }
  await batch.commit();
  console.log(`Done: ${name}`);
}

(async () => {
  // add whichever collections you created locally
  await copyCollection("profiles");
  await copyCollection("user_preferences");

  console.log("✅ All done.");
  process.exit(0);
})();
