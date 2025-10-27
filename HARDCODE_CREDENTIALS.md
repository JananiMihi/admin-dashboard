# Hardcoded Credentials Setup

## 🔧 How to Add Your Credentials

Open `lib/supabase.ts` and replace the placeholder values on lines 4-6:

```typescript
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://YOUR-PROJECT-ID.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'YOUR-ANON-KEY-HERE'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR-SERVICE-ROLE-KEY-HERE'
```

### Step-by-Step:

1. **Replace line 4** - Replace `YOUR-PROJECT-ID.supabase.co` with your actual project URL
   - Example: `'https://abcdefghijklmnop.supabase.co'`

2. **Replace line 5** - Replace `YOUR-ANON-KEY-HERE` with your anon public key
   - Example: `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNzU2ODAwMCwiZXhwIjoxOTUzMTQ0MDAwfQ.xxxxxxxxxxx'`

3. **Replace line 6** - Replace `YOUR-SERVICE-ROLE-KEY-HERE` with your service role key
   - Example: `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM3NTY4MDAwLCJleHAiOjE5NTMxNDQwMDB9.yyyyyyyyyyyy'`

### Where to get these values:

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to **Settings** → **API**
4. You'll find:
   - **Project URL** (for supabaseUrl)
   - **anon public** key (for supabaseAnonKey)
   - **service_role** key (for supabaseServiceKey)

### After updating:

Save the file - the changes will automatically reload if your dev server is running!

⚠️ **Security Note**: Don't commit these credentials to git! They're already in `.gitignore`, but be careful.
