# Supabase Multi-Domain Configuration Guide

## Problem
When you have multiple frontend applications (learning platform and admin dashboard) sharing the same Supabase database, Supabase's authentication only allows one "Site URL" in the dashboard. However, you can configure multiple **Redirect URLs** to support both domains.

## Solution
Configure Supabase to allow redirects to both domains by adding them to the **Redirect URLs** list in your Supabase project settings.

## Step-by-Step Configuration

### 1. Access Supabase Authentication Settings

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

### 2. Configure Site URL

Set the **Site URL** to your primary domain (usually the learning platform):
```
https://neo.magicbit.cc
```

**Note:** The Site URL is used as the default redirect URL when none is specified. It doesn't restrict which domains can receive redirects.

### 3. Add Redirect URLs

In the **Redirect URLs** section, add both domains:

```
https://neo.magicbit.cc/**
https://neoadmin.magicbit.cc/**
```

**Important:**
- Use `**` wildcard to allow all paths on that domain
- Add both domains to support authentication from both platforms
- You can also add localhost for development:
  ```
  http://localhost:3001/**
  http://localhost:3000/**
  ```

### 4. Example Configuration

Your Redirect URLs list should look like this:

```
https://neo.magicbit.cc/**
https://neoadmin.magicbit.cc/**
http://localhost:3001/**
http://localhost:3000/**
```

### 5. How It Works

The application now dynamically determines the correct redirect URL based on:
- **Request Host**: The domain from which the request originated
- **Environment Variables**: Fallback if host detection fails
- **Default**: localhost for development

The code automatically:
- Detects if the request came from `neoadmin.magicbit.cc` → uses admin dashboard URLs
- Detects if the request came from `neo.magicbit.cc` → uses learning platform URLs
- Detects localhost → uses localhost URLs

### 6. Code Implementation

The application uses a utility function (`lib/utils/url-helper.ts`) that:
- `getAppUrl(requestHost)`: Returns the correct base URL based on the request
- `getAuthRedirectUrl(requestHost)`: Returns the correct auth redirect URL
- `getClientAppUrl()`: Client-side URL detection

### 7. Testing

1. **Test Admin Dashboard:**
   - Visit `https://neoadmin.magicbit.cc`
   - Try creating an educator or resetting password
   - Verify emails contain `neoadmin.magicbit.cc` URLs

2. **Test Learning Platform:**
   - Visit `https://neo.magicbit.cc`
   - Try authentication flows
   - Verify emails contain `neo.magicbit.cc` URLs

3. **Test Local Development:**
   - Run `npm run dev`
   - Verify redirects use `http://localhost:3001`

## Troubleshooting

### Issue: Redirects still go to wrong domain

**Solution:** 
- Check that both domains are added to Supabase Redirect URLs
- Clear browser cache and cookies
- Verify the request host is being detected correctly (check server logs)

### Issue: "Invalid redirect URL" error

**Solution:**
- Ensure the exact domain (with protocol) is in the Redirect URLs list
- Check for typos in domain names
- Make sure you're using `https://` for production domains

### Issue: Emails contain wrong domain

**Solution:**
- The application now automatically detects the request domain
- If emails still show wrong domain, check that the API route is receiving the correct `host` header
- Verify environment variables are not overriding the dynamic detection

## Security Notes

- ✅ Both domains share the same Supabase project (same database)
- ✅ Authentication is handled by Supabase (secure)
- ✅ Each domain can only redirect to its own domain (configured in Redirect URLs)
- ✅ The Site URL is just a default - actual redirects use the configured Redirect URLs

## Additional Resources

- [Supabase Auth Configuration Docs](https://supabase.com/docs/guides/auth/auth-deep-dive/auth-deep-dive-jwts)
- [Supabase Redirect URLs Guide](https://supabase.com/docs/guides/auth/auth-redirects)


