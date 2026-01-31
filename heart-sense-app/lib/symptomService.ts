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
