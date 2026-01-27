-- MyHealth Messages Integration
--
-- This migration adds support for viewing MyHealth messages within the app
--
-- New Tables:
-- 1. myhealth_messages - Messages from MyHealth system

CREATE TABLE IF NOT EXISTS myhealth_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  subject text NOT NULL,
  message_body text NOT NULL,
  sender_name text DEFAULT 'Healthcare Provider',
  sender_type text DEFAULT 'provider',
  read boolean DEFAULT false,
  received_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS myhealth_messages_user_id_idx ON myhealth_messages(user_id);
CREATE INDEX IF NOT EXISTS myhealth_messages_received_at_idx ON myhealth_messages(received_at DESC);

ALTER TABLE myhealth_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages"
  ON myhealth_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON myhealth_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Insert some sample messages for demonstration
INSERT INTO myhealth_messages (user_id, subject, message_body, sender_name, received_at)
SELECT 
  id,
  'Welcome to the Medical Tracking Study',
  'Thank you for participating in our research study. Please remember to log your symptoms daily. If you experience any severe symptoms, please seek immediate medical attention.',
  'Dr. Sarah Johnson',
  NOW() - INTERVAL '1 day'
FROM profiles
ON CONFLICT DO NOTHING;

INSERT INTO myhealth_messages (user_id, subject, message_body, sender_name, received_at, read)
SELECT 
  id,
  'Lab Results Available',
  'Your recent lab results are now available in your MyHealth portal. Please review them at your convenience. If you have any questions, feel free to message us back.',
  'Stanford Medical Center',
  NOW() - INTERVAL '3 days',
  true
FROM profiles
ON CONFLICT DO NOTHING;