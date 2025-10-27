# Setup Instructions

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Step 3: Create Supabase Tables

Run these SQL commands in your Supabase SQL Editor:

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

## Step 4: Create Admin User

You need to create an admin user in Supabase Auth:

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Users**
3. Click **Add User** or **Invite User**
4. Set up an admin email and password
5. This will be your login credentials for the dashboard

## Step 5: Run the Development Server

```bash
npm run dev
```

## Step 6: Access the Dashboard

1. Navigate to http://localhost:3000
2. You'll be redirected to `/login`
3. Log in with your admin credentials
4. You'll see the main dashboard

## Uploading Sample Missions

1. After logging in, go to **Missions** section
2. Click **Upload JSON** button
3. Select the `sample-missions.json` file from the project root
4. Click **Upload**

You now have sample missions to work with!

## Troubleshooting

### Environment Variables Not Found
- Make sure `.env.local` exists in the project root
- Check that all three Supabase keys are present
- Restart the dev server after adding environment variables

### TypeScript Errors
- Run `npm install` again to ensure all dependencies are installed
- Run `npm run build` to check for any build errors

### Database Connection Issues
- Verify your Supabase URL and keys are correct
- Check that your Supabase project is active
- Ensure the tables are created in your database

### Login Issues
- Make sure you've created an admin user in Supabase Auth
- Use the email/password from the Supabase dashboard
- Check the browser console for error messages
