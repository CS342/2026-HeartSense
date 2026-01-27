/*
  # Add User Preferences Table

  1. New Tables
    - `user_preferences`
      - `user_id` (uuid, primary key, references profiles)
      - `notify_daily_reminder` (boolean) - Daily reminder to log entries
      - `notify_messages` (boolean) - Notifications for new messages
      - `notify_health_insights` (boolean) - Health insights and tips
      - `notify_activity_milestones` (boolean) - Activity milestone notifications
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_preferences` table
    - Add policies for users to read and update their own preferences
*/

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  notify_daily_reminder boolean DEFAULT true,
  notify_messages boolean DEFAULT true,
  notify_health_insights boolean DEFAULT true,
  notify_activity_milestones boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
