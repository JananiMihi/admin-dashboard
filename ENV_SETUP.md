# Environment Variables Setup

## ❌ Error: "supabaseKey is required"

This error means the environment variables are missing. You need to create a `.env.local` file.

## ✅ Quick Fix

### Step 1: Create `.env.local` file

In your project root directory (`e:\office\admin dashboard`), create a new file named `.env.local`

### Step 2: Add your Supabase credentials

Open the `.env.local` file and add these lines (replace with your actual Supabase values):

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

### Step 3: Get your Supabase credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** → Use for `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Save and restart

1. Save the `.env.local` file
2. Stop the development server (Ctrl+C in terminal)
3. Run `npm run dev` again

## 📋 Example

Here's what a filled `.env.local` file looks like:

```env
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNzU2ODAwMCwiZXhwIjoxOTUzMTQ0MDAwfQ.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM3NTY4MDAwLCJleHAiOjE5NTMxNDQwMDB9.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

⚠️ **Note**: Don't share these keys publicly! The `.env.local` file is already in `.gitignore`.

## 🚀 After setting up

1. Create the database tables (see `SETUP.md` for SQL commands)
2. Create an admin user in Supabase Authentication
3. Access http://localhost:3001 and login!

## 🆘 Still having issues?

Make sure:
- ✅ File is named exactly `.env.local` (with the dot at the start)
- ✅ File is in the project root directory
- ✅ You've restarted the dev server after creating the file
- ✅ No typos in the variable names
