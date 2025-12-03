# Quick Deployment Checklist

Use this checklist to quickly deploy your admin dashboard to production.

## Pre-Deployment

- [ ] Code is tested and working locally
- [ ] All TypeScript errors are fixed
- [ ] Build completes successfully (`npm run build`)
- [ ] Environment variables are documented

## Step 1: Environment Setup

- [ ] Create production environment variables file
- [ ] Set `NEXT_PUBLIC_APP_BASE_URL` to production URL
- [ ] Verify all Supabase keys are correct
- [ ] Configure email service (Resend/SendGrid/SMTP)

## Step 2: Supabase Configuration

- [ ] Update Site URL to: `https://neo.magicbit.cc`
- [ ] Add Redirect URLs:
  - [ ] `https://neo.magicbit.cc/**`
  - [ ] `https://neoadmin.magicbit.cc/**`
  - [ ] `http://localhost:3001/**` (for development)
- [ ] Verify all database migrations are applied

## Step 3: Build & Deploy

### If using Vercel:
- [ ] Connect Git repository to Vercel
- [ ] Add all environment variables in Vercel dashboard
- [ ] Configure custom domain
- [ ] Deploy and verify

### If using Custom Server:
- [ ] Upload code to server
- [ ] Install dependencies (`npm install --production`)
- [ ] Set environment variables
- [ ] Build application (`npm run build`)
- [ ] Start with PM2 (`pm2 start npm --name "admin-dashboard" -- start`)
- [ ] Configure Nginx reverse proxy
- [ ] Setup SSL certificate

## Step 4: Post-Deployment Testing

### Authentication
- [ ] Login page loads
- [ ] Can create educator account
- [ ] Verification email received
- [ ] Email link uses production URL (not localhost)
- [ ] Can complete verification
- [ ] Password reset works
- [ ] Login/logout works

### Core Features
- [ ] Dashboard loads
- [ ] Can create organization
- [ ] Can create class
- [ ] Can add students
- [ ] Join codes generate correctly
- [ ] Can assign missions to classes
- [ ] All pages load without errors

### Security
- [ ] HTTPS is enabled
- [ ] Environment variables not exposed
- [ ] Supabase RLS policies working
- [ ] Service role key is server-side only

## Step 5: Monitoring

- [ ] Set up error tracking (optional)
- [ ] Set up uptime monitoring (optional)
- [ ] Test application under load
- [ ] Monitor Supabase usage

## Quick Commands Reference

```bash
# Build locally
npm run build

# Test production build
npm start

# Deploy to Vercel
vercel --prod

# PM2 commands
pm2 start npm --name "admin-dashboard" -- start
pm2 logs admin-dashboard
pm2 restart admin-dashboard
```

## Troubleshooting

If something doesn't work:
1. Check application logs
2. Check Supabase logs
3. Verify environment variables
4. Check DNS configuration
5. Review DEPLOYMENT_GUIDE.md for detailed steps

---

**Ready?** Start with Step 1! 🚀


