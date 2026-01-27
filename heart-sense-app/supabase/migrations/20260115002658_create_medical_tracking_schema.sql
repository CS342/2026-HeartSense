-- Medical Symptom Tracking App Schema
--
-- Overview:
-- This migration creates the complete database schema for a medical symptom tracking application
-- used for clinical research. The app tracks patient symptoms, activities, well-being ratings,
-- medical condition changes, and health data from wearable devices.
--
-- New Tables:
-- 1. profiles - User profile information for patients
-- 2. symptoms - Patient-reported symptoms with timestamps
-- 3. well_being_ratings - Daily overall well-being assessments
-- 4. activities - Patient-reported activities
-- 5. medical_conditions - Changes in medical condition or status
-- 6. health_data - Automated health data from wearable devices
--
-- Security:
-- All tables have RLS enabled with policies that restrict access to own data only

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  date_of_birth date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create symptoms table
CREATE TABLE IF NOT EXISTS symptoms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  symptom_type text NOT NULL,
  severity integer CHECK (severity >= 1 AND severity <= 10),
  description text DEFAULT '',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create well_being_ratings table
CREATE TABLE IF NOT EXISTS well_being_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 10),
  notes text DEFAULT '',
  rating_date date NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, rating_date)
);

-- Create activities table
CREATE TABLE IF NOT EXISTS activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL,
  duration_minutes integer DEFAULT 0,
  intensity text CHECK (intensity IN ('low', 'moderate', 'high')),
  description text DEFAULT '',
  occurred_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create medical_conditions table
CREATE TABLE IF NOT EXISTS medical_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  condition_type text NOT NULL,
  description text NOT NULL,
  occurred_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create health_data table
CREATE TABLE IF NOT EXISTS health_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  data_type text NOT NULL CHECK (data_type IN ('heart_rate', 'step_count', 'accelerometer')),
  value numeric NOT NULL,
  unit text NOT NULL,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS symptoms_user_id_idx ON symptoms(user_id);
CREATE INDEX IF NOT EXISTS symptoms_occurred_at_idx ON symptoms(occurred_at DESC);
CREATE INDEX IF NOT EXISTS well_being_ratings_user_id_idx ON well_being_ratings(user_id);
CREATE INDEX IF NOT EXISTS well_being_ratings_date_idx ON well_being_ratings(rating_date DESC);
CREATE INDEX IF NOT EXISTS activities_user_id_idx ON activities(user_id);
CREATE INDEX IF NOT EXISTS activities_occurred_at_idx ON activities(occurred_at DESC);
CREATE INDEX IF NOT EXISTS medical_conditions_user_id_idx ON medical_conditions(user_id);
CREATE INDEX IF NOT EXISTS medical_conditions_occurred_at_idx ON medical_conditions(occurred_at DESC);
CREATE INDEX IF NOT EXISTS health_data_user_id_idx ON health_data(user_id);
CREATE INDEX IF NOT EXISTS health_data_recorded_at_idx ON health_data(recorded_at DESC);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE symptoms ENABLE ROW LEVEL SECURITY;
ALTER TABLE well_being_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_data ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Symptoms policies
CREATE POLICY "Users can view own symptoms"
  ON symptoms FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own symptoms"
  ON symptoms FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own symptoms"
  ON symptoms FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own symptoms"
  ON symptoms FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Well-being ratings policies
CREATE POLICY "Users can view own well-being ratings"
  ON well_being_ratings FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own well-being ratings"
  ON well_being_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own well-being ratings"
  ON well_being_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own well-being ratings"
  ON well_being_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Activities policies
CREATE POLICY "Users can view own activities"
  ON activities FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activities"
  ON activities FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activities"
  ON activities FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own activities"
  ON activities FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Medical conditions policies
CREATE POLICY "Users can view own medical conditions"
  ON medical_conditions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medical conditions"
  ON medical_conditions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medical conditions"
  ON medical_conditions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own medical conditions"
  ON medical_conditions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Health data policies
CREATE POLICY "Users can view own health data"
  ON health_data FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health data"
  ON health_data FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health data"
  ON health_data FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own health data"
  ON health_data FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);