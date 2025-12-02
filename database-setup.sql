-- Crysta IVF Dashboard Database Setup
-- Run these commands in your Supabase SQL Editor

-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  location TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  session_id TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_messages INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active'
);

-- Create Chat Histories Table
CREATE TABLE IF NOT EXISTS chat_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'ai')) DEFAULT 'user',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'concerned', 'hopeful', 'anxious')),
  intent TEXT,
  confidence_score DECIMAL(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  response_time INTEGER -- in milliseconds
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active DESC);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

CREATE INDEX IF NOT EXISTS idx_chat_histories_user_id ON chat_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_created_at ON chat_histories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_histories_session_id ON chat_histories(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_histories_sentiment ON chat_histories(sentiment);
CREATE INDEX IF NOT EXISTS idx_chat_histories_intent ON chat_histories(intent);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (dashboard access)
CREATE POLICY IF NOT EXISTS "Allow authenticated users to view users" ON users
  FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "Allow authenticated users to view chat histories" ON chat_histories
  FOR SELECT TO authenticated USING (true);

-- Create policies for service role (for your chatbot to insert data)
CREATE POLICY IF NOT EXISTS "Allow service role to manage users" ON users
  FOR ALL TO service_role USING (true);

CREATE POLICY IF NOT EXISTS "Allow service role to manage chat histories" ON chat_histories
  FOR ALL TO service_role USING (true);

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_histories;

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for testing (optional)
INSERT INTO users (name, email, phone, age, gender, location, total_messages, status, session_id) VALUES
('Sarah Johnson', 'sarah.johnson@email.com', '+91 9876543210', 32, 'female', 'Mumbai', 12, 'active', 'session_001'),
('Raj Patel', 'raj.patel@email.com', '+91 9876543211', 28, 'male', 'Delhi', 8, 'active', 'session_002'),
('Priya Sharma', 'priya.sharma@email.com', '+91 9876543212', 35, 'female', 'Bangalore', 15, 'inactive', 'session_003'),
('Michael Chen', 'michael.chen@email.com', '+91 9876543213', 30, 'male', 'Chennai', 6, 'active', 'session_004'),
('Anita Gupta', 'anita.gupta@email.com', '+91 9876543214', 29, 'female', 'Hyderabad', 10, 'active', 'session_005')
ON CONFLICT (email) DO NOTHING;

-- Insert sample chat histories
INSERT INTO chat_histories (user_id, session_id, message, response, sentiment, intent, confidence_score, response_time) VALUES
((SELECT id FROM users WHERE email = 'sarah.johnson@email.com'), 'session_001', 'What are the success rates for IVF?', 'IVF success rates vary based on several factors including age, cause of infertility, and clinic expertise. Generally, for women under 35, success rates are around 40-50% per cycle.', 'neutral', 'information_seeking', 0.85, 1200),
((SELECT id FROM users WHERE email = 'raj.patel@email.com'), 'session_002', 'How much does IVF cost in India?', 'IVF costs can vary significantly depending on location and clinic. In India, a single IVF cycle typically ranges from ₹1,50,000 to ₹3,00,000. This includes medications, procedures, and monitoring.', 'concerned', 'cost_inquiry', 0.92, 800),
((SELECT id FROM users WHERE email = 'priya.sharma@email.com'), 'session_003', 'What are the side effects of fertility medications?', 'Common side effects of fertility medications include bloating, mood swings, headaches, and injection site reactions. Most side effects are temporary and manageable.', 'anxious', 'medical_concern', 0.78, 1500),
((SELECT id FROM users WHERE email = 'michael.chen@email.com'), 'session_004', 'How long does the IVF process take?', 'The IVF process typically takes 4-6 weeks from start to finish, including preparation, stimulation, egg retrieval, and embryo transfer.', 'neutral', 'process_inquiry', 0.88, 950),
((SELECT id FROM users WHERE email = 'anita.gupta@email.com'), 'session_005', 'Can I do IVF if I have PCOS?', 'Yes, many women with PCOS can successfully undergo IVF. PCOS may require specific protocols and medications, but it doesn\'t prevent IVF treatment.', 'hopeful', 'medical_concern', 0.91, 1100);

-- Update user message counts based on chat histories
UPDATE users SET total_messages = (
  SELECT COUNT(*) FROM chat_histories WHERE chat_histories.user_id = users.id
);

-- Create a view for dashboard analytics (optional)
CREATE OR REPLACE VIEW dashboard_stats AS
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM chat_histories) as total_chats,
  (SELECT COUNT(*) FROM users WHERE last_active >= CURRENT_DATE) as active_users_today,
  (SELECT AVG(response_time) FROM chat_histories WHERE response_time IS NOT NULL) as avg_response_time;

-- Grant access to the view
GRANT SELECT ON dashboard_stats TO authenticated;
GRANT SELECT ON dashboard_stats TO service_role;
