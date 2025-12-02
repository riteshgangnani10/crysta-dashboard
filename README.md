# Crysta IVF Dashboard

A comprehensive analytics dashboard for the Crysta IVF chatbot, built with Next.js 14, TypeScript, and Supabase.

## Features

- 🔐 **Authentication System** - Secure login with demo credentials
- 📊 **Real-time Analytics** - Live dashboard with key metrics and charts
- 👥 **User Management** - View and manage all registered users
- 💬 **Chat History** - Analyze all chat conversations with sentiment analysis
- 📈 **Interactive Charts** - Beautiful visualizations using Recharts
- 🔄 **Real-time Updates** - Live data updates using Supabase real-time
- 📱 **Responsive Design** - Works perfectly on desktop and mobile
- 📤 **Data Export** - Export users and chat data to CSV
- ⚙️ **Settings Panel** - Configure dashboard preferences

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Charts**: Recharts
- **Icons**: Heroicons
- **Authentication**: Custom auth with Supabase integration
- **Real-time**: Supabase real-time subscriptions

## Quick Start

### 1. Clone and Install

```bash
cd crysta-dashboard
npm install
```

### 2. Environment Setup

The environment variables are already configured with your Supabase credentials. The `.env.local` file contains:

```env
# Supabase Configuration (Already configured)
NEXT_PUBLIC_SUPABASE_URL=https://dezuiyiuvizypevxrxut.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key - securely stored]
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# NextAuth Configuration
NEXTAUTH_SECRET=crysta_ivf_dashboard_secret_key_2024
NEXTAUTH_URL=http://localhost:3000

# App Configuration
NEXT_PUBLIC_APP_NAME="Crysta IVF Dashboard"
NEXT_PUBLIC_APP_DESCRIPTION="Analytics Dashboard for Crysta IVF Chatbot"
```

**Note**: Your Supabase credentials are securely stored and protected by `.gitignore`.

### 3. Database Setup

**IMPORTANT**: Run the database setup script to create all necessary tables and sample data.

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/dezuiyiuvizypevxrxut
2. Navigate to the SQL Editor
3. Copy and paste the contents of `database-setup.sql` (included in this project)
4. Run the script to create tables, indexes, policies, and sample data

The script will create:

#### Users Table
```sql
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  age INTEGER,
  gender TEXT CHECK (gender IN ('male', 'female')),
  session_id TEXT,
  last_active TIMESTAMP WITH TIME ZONE,
  total_messages INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active', 'inactive')) DEFAULT 'active'
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to view users" ON users
  FOR SELECT TO authenticated USING (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE users;
```

#### Chat Histories Table
```sql
CREATE TABLE chat_histories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  message_type TEXT CHECK (message_type IN ('user', 'ai')) DEFAULT 'user',
  sentiment TEXT CHECK (sentiment IN ('positive', 'negative', 'neutral', 'concerned', 'hopeful', 'anxious')),
  intent TEXT,
  confidence_score DECIMAL(3,2),
  response_time INTEGER -- in milliseconds
);

-- Enable RLS
ALTER TABLE chat_histories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Allow authenticated users to view chat histories" ON chat_histories
  FOR SELECT TO authenticated USING (true);

-- Enable real-time
ALTER PUBLICATION supabase_realtime ADD TABLE chat_histories;

-- Create indexes for better performance
CREATE INDEX idx_chat_histories_user_id ON chat_histories(user_id);
CREATE INDEX idx_chat_histories_created_at ON chat_histories(created_at DESC);
CREATE INDEX idx_chat_histories_session_id ON chat_histories(session_id);
```

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Demo Login

Use these credentials to access the dashboard:
- **Email**: `admin@crysta.com`
- **Password**: `admin123`

## Dashboard Features

### 📊 Main Dashboard
- Real-time statistics cards
- User activity charts
- Hourly activity patterns
- Sentiment analysis pie chart
- Top user intents
- Recent activity feed

### 👥 User Management
- Complete user list with search and filtering
- User demographics and activity stats
- Export functionality
- Real-time user updates

### 💬 Chat Analytics
- All chat conversations with full details
- Sentiment and intent analysis
- Response time metrics
- Confidence scores
- Advanced filtering and search
- Chat detail modal view

### 📈 Analytics Page
- Detailed charts and visualizations
- User growth trends
- Activity patterns
- Sentiment distribution
- Intent analysis

### ⚙️ Settings
- Supabase configuration
- Dashboard preferences
- Export settings
- Account management

## Real-time Features

The dashboard includes real-time updates for:
- New user registrations
- New chat messages
- User activity status
- Live statistics updates

Real-time connection status is shown in the bottom-right corner.

## Data Integration

### Connecting Your Chatbot Data

To integrate with your existing Supabase tables:

1. Update the table names in `src/lib/supabase.ts` if different
2. Modify the column mappings to match your schema
3. Update the TypeScript interfaces accordingly
4. Configure your chatbot to write data to these tables

### Sample Data Insertion

For testing, you can insert sample data:

```sql
-- Insert sample users
INSERT INTO users (name, email, phone, age, gender, location, total_messages, status) VALUES
('Sarah Johnson', 'sarah.j@email.com', '+91 9876543210', 32, 'female', 'Mumbai', 12, 'active'),
('Raj Patel', 'raj.patel@email.com', '+91 9876543211', 28, 'male', 'Delhi', 8, 'active');

-- Insert sample chats
INSERT INTO chat_histories (user_id, session_id, message, response, sentiment, intent, confidence_score, response_time) VALUES
((SELECT id FROM users WHERE email = 'sarah.j@email.com'), 'sess_1', 'What are the success rates for IVF?', 'IVF success rates vary based on several factors...', 'neutral', 'information_seeking', 0.85, 1200);
```

## Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Other Platforms

The app can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Customization

### Styling
- Modify `tailwind.config.js` for custom themes
- Update components in `src/components/ui/` for design changes
- Customize charts in `src/components/dashboard/Charts.tsx`

### Functionality
- Add new pages in `src/app/dashboard/`
- Create new components in `src/components/`
- Extend Supabase functions in `src/lib/supabase.ts`

## Support

For questions or issues:
1. Check the console for error messages
2. Verify Supabase configuration
3. Ensure database tables are created correctly
4. Check real-time subscription status

## License

This project is created for Crysta IVF analytics dashboard.