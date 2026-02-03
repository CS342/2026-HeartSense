import { collection, addDoc, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

export interface Symptom {
  userId: string;
  symptomType: string;
  severity: number;
  description?: string;
  occurredAt: Date;
  createdAt: Date;
}

export interface Activity {
  userId: string;
  activityType: string;
  durationMinutes: number;
  intensity: 'low' | 'moderate' | 'high';
  description?: string;
  occurredAt: Date;
  createdAt: Date;
}

export interface MedicalConditionChange {
  userId: string;
  conditionType: string;
  description: string;
  occurredAt: Date;
}

export interface WellbeingRating {
  userId: string;
  energyLevel: number; // 1-5
  moodRating: number; // 1-5
  notes: string;
  stressLevel: number; // 1-5
  recordedAt: Date;
}

export const logSymptom = async (symptomData: Omit<Symptom, 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'symptoms'), {
      userId: symptomData.userId,
      symptomType: symptomData.symptomType,
      severity: symptomData.severity,
      description: symptomData.description || '',
      occurredAt: Timestamp.fromDate(symptomData.occurredAt),
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message || 'Failed to log symptom' };
  }
};

export const getPreviousSymptom = async (userId: string, symptomType: string) => {
  try {
    const q = query(
      collection(db, 'symptoms'),
      where('userId', '==', userId),
      where('symptomType', '==', symptomType),
      orderBy('occurredAt', 'desc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return { data: null, error: null };
    }

    const doc = querySnapshot.docs[0];
    const data = doc.data();

    return {
      data: {
        severity: data.severity,
        occurredAt: data.occurredAt.toDate().toISOString(),
      },
      error: null,
    };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const logActivity = async (activityData: Omit<Activity, 'createdAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'activities'), {
      userId: activityData.userId,
      activityType: activityData.activityType,
      durationMinutes: activityData.durationMinutes,
      intensity: activityData.intensity,
      description: activityData.description || '',
      occurredAt: Timestamp.fromDate(activityData.occurredAt),
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message || 'Failed to log activity' };
  }
};

export const getSymptoms = async (userId: string, limitCount: number = 50) => {
  try {
    const q = query(
      collection(db, 'symptoms'),
      where('userId', '==', userId),
      orderBy('occurredAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const symptoms = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      occurredAt: doc.data().occurredAt.toDate().toISOString(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }));

    return { data: symptoms, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const getActivities = async (userId: string, limitCount: number = 50) => {
  try {
    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      orderBy('occurredAt', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      occurredAt: doc.data().occurredAt.toDate().toISOString(),
      createdAt: doc.data().createdAt.toDate().toISOString(),
    }));

    return { data: activities, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const countSymptomsSince = async (userId: string, since: Date) => {
  try {
    const q = query(
      collection(db, 'symptoms'),
      where('userId', '==', userId),
      where('occurredAt', '>=', Timestamp.fromDate(since))
    );

    const querySnapshot = await getDocs(q);
    return { count: querySnapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const countActivitiesSince = async (userId: string, since: Date) => {
  try {
    const q = query(
      collection(db, 'activities'),
      where('userId', '==', userId),
      where('occurredAt', '>=', Timestamp.fromDate(since))
    );

    const querySnapshot = await getDocs(q);
    return { count: querySnapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const countWellbeingRatings = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'well_being_ratings'),
      where('user_id', '==', userId)
    );
    const snapshot = await getDocs(q);
    return { count: snapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const countWellbeingRatingsSince = async (userId: string, since: Date) => {
  try {
    const q = query(
      collection(db, 'well_being_ratings'),
      where('user_id', '==', userId),
      where('recorded_at', '>=', Timestamp.fromDate(since))
    );
    const snapshot = await getDocs(q);
    return { count: snapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const countMedicalChanges = async (userId: string) => {
  try {
    const q = query(
      collection(db, 'medical_conditions'),
      where('user_id', '==', userId)
    );
    const snapshot = await getDocs(q);
    return { count: snapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const countMedicalChangesSince = async (userId: string, since: Date) => {
  try {
    const q = query(
      collection(db, 'medical_conditions'),
      where('user_id', '==', userId),
      where('occurred_at', '>=', Timestamp.fromDate(since))
    );
    const snapshot = await getDocs(q);
    return { count: snapshot.size, error: null };
  } catch (error: any) {
    return { count: 0, error: error.message };
  }
};

export const getMedicalChanges = async (userId: string, limitCount: number = 50) => {
  try {
    const q = query(
      collection(db, 'medical_conditions'),
      where('user_id', '==', userId),
      orderBy('occurred_at', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const changes = querySnapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.user_id,
        conditionType: data.condition_type,
        description: data.description,
        occurredAt: data.occurred_at ? data.occurred_at.toDate().toISOString() : null,
      };
    });

    return { data: changes, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const logMedicalChange = async (data: MedicalConditionChange) => {
  try {
    const docRef = await addDoc(collection(db, 'medical_conditions'), {
      user_id: data.userId,
      condition_type: data.conditionType,
      description: data.description,
      occurred_at: Timestamp.fromDate(data.occurredAt),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message || 'Failed to log medical change' };
  }
};

export const getWellbeingRatings = async (userId: string, limitCount: number = 50) => {
  try {
    const q = query(
      collection(db, 'well_being_ratings'),
      where('user_id', '==', userId),
      orderBy('recorded_at', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const ratings = querySnapshot.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        userId: data.user_id,
        energyLevel: data.energy_level,
        moodRating: data.mood_rating,
        notes: data.notes ?? '',
        stressLevel: data.stress_level,
        recordedAt: data.recorded_at ? data.recorded_at.toDate().toISOString() : null,
      };
    });

    return { data: ratings, error: null };
  } catch (error: any) {
    return { data: null, error: error.message };
  }
};

export const logWellbeingRating = async (data: WellbeingRating) => {
  try {
    const docRef = await addDoc(collection(db, 'well_being_ratings'), {
      user_id: data.userId,
      energy_level: data.energyLevel,
      mood_rating: data.moodRating,
      notes: data.notes || '',
      stress_level: data.stressLevel,
      recorded_at: Timestamp.fromDate(data.recordedAt),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message || 'Failed to log well-being rating' };
  }
};
