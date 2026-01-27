export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface Symptom {
  id: string;
  user_id: string;
  symptom_type: string;
  severity: number;
  description: string;
  occurred_at: string;
  created_at: string;
}

export interface WellBeingRating {
  id: string;
  user_id: string;
  rating: number;
  notes: string;
  rating_date: string;
  created_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  activity_type: string;
  duration_minutes: number;
  intensity: 'low' | 'moderate' | 'high';
  description: string;
  occurred_at: string;
  created_at: string;
}

export interface MedicalCondition {
  id: string;
  user_id: string;
  condition_type: string;
  description: string;
  occurred_at: string;
  created_at: string;
}

export interface HealthData {
  id: string;
  user_id: string;
  data_type: 'heart_rate' | 'step_count' | 'accelerometer';
  value: number;
  unit: string;
  recorded_at: string;
  created_at: string;
}

export interface MyHealthMessage {
  id: string;
  user_id: string;
  subject: string;
  message_body: string;
  sender_name: string;
  sender_type: string;
  read: boolean;
  received_at: string;
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  notify_daily_reminder: boolean;
  notify_messages: boolean;
  notify_health_insights: boolean;
  notify_activity_milestones: boolean;
  created_at: string;
  updated_at: string;
}
