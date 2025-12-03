# Supabase URL Configuration Guide

## Problem
Supabase only allows **one Site URL** to be configured, but we need to support both:
- `http://localhost:3001` (development)
- `https://neo.magicbit.cc` (production)

## Solution

### 1. Supabase Configuration

**Site URL (Primary):**
- Set to: `https://neo.magicbit.cc`
- This is used as a fallback when `redirectTo` is not provided or doesn't match allowed URLs

**Redirect URLs (Allowed List):**
Add both URLs with wildcards:
- `https://neo.magicbit.cc/*`
- `http://localhost:3001/*`
- `https://neoadmin.magicbit.cc/*` (if using admin dashboard domain)

### 2. How It Works

The code automatically determines the correct URL based on the request:

1. **Server-side detection**: Uses `requestHost` header to detect which domain the request came from
2. **Dynamic redirectTo**: When calling `supabaseAdmin.auth.admin.generateLink()`, we pass the correct `redirectTo` URL based on the request host
3. **URL extraction and rebuilding**: If Supabase returns a link with the wrong domain, we extract the token and rebuild the URL with the correct domain

### 3. Code Implementation

The code uses `getAuthRedirectUrl(requestHost)` which:
- Detects the request host (localhost, neo.magicbit.cc, etc.)
- Returns the appropriate URL for that environment
- Falls back to `NEXT_PUBLIC_APP_BASE_URL` environment variable

**Example:**
```typescript
const requestHost = req.headers.get('host')
const redirectUrl = getAuthRedirectUrl(requestHost) // Returns correct URL based on host

await supabaseAdmin.auth.admin.generateLink({
  type: 'invite',
  email: email,
  options: {
    redirectTo: redirectUrl // This overrides the Site URL
  }
})
```

### 4. Environment Variables

Make sure to set in your `.env.local`:

**For Development:**
```env
NEXT_PUBLIC_APP_BASE_URL=http://localhost:3001
```

**For Production:**
```env
NEXT_PUBLIC_APP_BASE_URL=https://neo.magicbit.cc
```

### 5. Verification Flow

1. User requests password reset/verification from a specific domain
2. Code detects the domain from `requestHost` header
3. Code generates link with correct `redirectTo` URL
4. Supabase validates `redirectTo` against allowed Redirect URLs list
5. If valid, Supabase uses the `redirectTo` URL (not the Site URL)
6. Email is sent with the correct domain URL

### 6. Important Notes

- ✅ **Site URL** should be set to production (`https://neo.magicbit.cc`)
- ✅ **Redirect URLs** must include both development and production URLs
- ✅ The code automatically handles URL conversion based on request host
- ✅ Always use `getAuthRedirectUrl(requestHost)` instead of hardcoded URLs
- ✅ The `redirectTo` parameter in `generateLink()` takes precedence over Site URL

### 7. Testing

**Development:**
1. Start server on `localhost:3001`
2. Request password reset
3. Check email - link should point to `http://localhost:3001/auth/verify-educator`

**Production:**
1. Deploy to `neo.magicbit.cc`
2. Request password reset
3. Check email - link should point to `https://neo.magicbit.cc/auth/verify-educator`

## Troubleshooting

If links are using the wrong domain:
1. Check that both URLs are in the Redirect URLs list in Supabase
2. Verify `NEXT_PUBLIC_APP_BASE_URL` is set correctly
3. Check that `getAuthRedirectUrl(requestHost)` is being called with the correct `requestHost`
4. Verify the `redirectTo` parameter is being passed to `generateLink()`



