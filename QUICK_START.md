# Quick Start Guide

## ✅ Installation Complete!

Dependencies have been successfully installed. Follow these steps to get started:

## Step 1: Set Up Supabase

1. **Create a `.env.local` file** in the project root with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

## Step 2: Create Database Tables

Run this SQL in your Supabase SQL Editor:

```sql
-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  age INTEGER,
  avatar TEXT,
  phone TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  verified BOOLEAN DEFAULT false,
  provider TEXT
);

-- Missions table
CREATE TABLE missions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  "order" INTEGER,
  xp_reward INTEGER DEFAULT 0,
  unlocked BOOLEAN DEFAULT true,
  difficulty TEXT DEFAULT 'medium',
  estimated_time INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User progress table
CREATE TABLE user_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  mission_id UUID REFERENCES missions(id),
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP,
  time_spent INTEGER,
  xp_earned INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, mission_id)
);

-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  total_xp INTEGER DEFAULT 0,
  "level" INTEGER DEFAULT 1,
  badges TEXT[] DEFAULT '{}',
  current_mission_id UUID REFERENCES missions(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Step 3: Create Admin User

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add User" and create an admin account
3. Note the email and password for login

## Step 4: Start the Development Server

```bash
npm run dev
```

## Step 5: Access the Dashboard

1. Open http://localhost:3000
2. You'll be redirected to `/login`
3. Login with your admin credentials
4. Start managing your admin dashboard!

## Features Available

### 📊 Dashboard (Home)
- Overview of all key metrics
- Quick access to all sections
- Real-time statistics

### 👥 User Management
- View all registered users
- Search by email or name
- Filter by verification status
- Edit and delete users

### 🎯 Progress Tracking
- Monitor student progress
- View completion rates
- Track XP and levels
- Analyze drop-off points

### 📈 Analytics
- Comprehensive learning analytics
- Mission completion charts
- Age demographic breakdowns
- Engagement metrics

### 🚀 Mission Management
- Upload missions from JSON files
- Bulk upload support
- Configure XP rewards
- Set difficulty levels
- Manage unlock status

## Sample Missions

A sample missions file (`sample-missions.json`) is included. To upload it:

1. Login to the dashboard
2. Go to **Missions** section
3. Click **Upload JSON**
4. Select the `sample-missions.json` file
5. Click **Upload**

## Next Steps

- Customize the mission content
- Add more features as needed
- Configure permissions
- Set up API endpoints for the student app

## Troubleshooting

### "Cannot find module" errors
- These should be gone now after `npm install`
- If they persist, restart your IDE

### Supabase connection errors
- Check your `.env.local` file exists and has correct values
- Verify your Supabase project is active
- Ensure tables are created in your database

### Login issues
- Make sure you created an admin user in Supabase Auth
- Use the exact email/password from Supabase
- Check browser console for detailed errors

## Need Help?

Refer to `SETUP.md` for detailed setup instructions or `README.md` for full documentation.
