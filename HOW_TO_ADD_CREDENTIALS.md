# How to Add Your Supabase Credentials

## Error: Invalid API Key

You're getting a 401 Unauthorized error because the Supabase API keys are not set.

## Quick Fix:

### Option 1: Create `.env.local` file (Recommended)

1. Create a new file called `.env.local` in the project root (`e:\office\admin dashboard\.env.local`)

2. Add these lines (replace with YOUR actual keys):
```env
NEXT_PUBLIC_SUPABASE_URL=https://ylukbxkoijoaiuigoswk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

3. Restart your dev server

### Option 2: Hardcode in `lib/supabase.ts`

Edit `lib/supabase.ts` lines 4-6:
```typescript
const supabaseUrl = 'https://ylukbxkoijoaiuigoswk.supabase.co'
const supabaseAnonKey = 'your-actual-anon-key'
const supabaseServiceKey = 'your-actual-service-role-key'
```

## Where to Find Your Keys:

1. Go to https://supabase.com/dashboard
2. Select your project (ylukbxkoijoaiuigoswk)
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** - Already set to `https://ylukbxkoijoaiuigoswk.supabase.co`
   - **anon/public key** - Copy this
   - **service_role key** - Copy this

## After Adding Keys:

1. Save the file
2. Stop your dev server (Ctrl+C)
3. Restart: `npm run dev`
4. Refresh your browser

The dashboard should now connect to your Supabase database! 🎉
