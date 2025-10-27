# Admin Dashboard - Student Progress Tracker

A comprehensive admin dashboard built with Next.js 14 and Supabase for tracking student progress, managing missions, and analyzing learning data.

## Features

### 🎯 User Management
- View all registered users
- Search and filter users by email, name, or signup date
- User verification status monitoring
- Age demographics tracking
- Provider (email/Google) information

### 📊 Progress Tracking
- Real-time progress monitoring
- Mission completion tracking
- XP and level analytics
- Badge collection insights
- Time spent per mission
- Drop-off analysis

### 📈 Analytics Dashboard
- Comprehensive learning analytics
- Mission completion rates
- User engagement metrics
- Age demographic breakdowns
- Visual charts and graphs
- Export capabilities

### 🚀 Mission Management
- Upload missions from JSON files
- Bulk mission upload
- Mission ordering system
- Difficulty classification
- XP reward configuration
- Unlock/lock status management

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account and project

### Installation

1. **Clone the repository**
```bash
cd "admin dashboard"
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

4. **Set up Supabase tables**

You'll need to create the following tables in your Supabase database:

#### `users` table
```sql
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
```

#### `missions` table
```sql
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
```

#### `user_progress` table
```sql
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
```

#### `user_profiles` table
```sql
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

5. **Run the development server**
```bash
npm run dev
```

6. **Access the dashboard**
Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Logging In
1. Navigate to `/login`
2. Enter your admin credentials
3. You'll be redirected to the dashboard

### Managing Users
- Navigate to **Users** section
- Search by email or name
- View detailed user information
- Edit or delete users

### Uploading Missions
1. Go to **Missions** section
2. Click **Upload JSON** button
3. Choose a JSON file or paste JSON content
4. Follow the expected format:
```json
[
  {
    "title": "Introduction to Variables",
    "description": "Learn the basics of variables",
    "order": 1,
    "xp_reward": 100,
    "difficulty": "easy",
    "estimated_time": 30,
    "unlocked": true
  }
]
```

### Viewing Analytics
- Navigate to **Analytics** section
- View comprehensive stats
- Analyze completion rates
- Track user engagement

## Project Structure

```
├── app/
│   ├── dashboard/          # Dashboard pages
│   │   ├── users/          # User management
│   │   ├── progress/       # Progress tracking
│   │   ├── analytics/      # Analytics dashboard
│   │   └── missions/       # Mission management
│   ├── login/              # Login page
│   ├── layout.tsx          # Root layout
│   └── globals.css         # Global styles
├── components/
│   └── DashboardLayout.tsx  # Main dashboard layout
├── lib/
│   └── supabase.ts         # Supabase client & types
└── package.json
```

## Tech Stack

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Supabase** - Database and auth
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Recharts** - Charts and graphs

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
