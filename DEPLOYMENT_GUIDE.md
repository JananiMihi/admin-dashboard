# Production Deployment Guide

This guide will help you deploy the Admin Dashboard to production on the main platform.

## Prerequisites

- ✅ Code is tested and working locally
- ✅ Supabase project is set up
- ✅ Domain is configured (e.g., `neoadmin.magicbit.cc` or `neo.magicbit.cc`)
- ✅ Environment variables are ready

## Step 1: Prepare Environment Variables

Create a production `.env.production` file or set environment variables in your hosting platform:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Application URL (Production)
NEXT_PUBLIC_APP_BASE_URL=https://neoadmin.magicbit.cc
# OR if using the same domain as learning platform:
# NEXT_PUBLIC_APP_BASE_URL=https://neo.magicbit.cc

# Email Configuration (Optional - choose one)
# Option 1: Resend
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@magicbit.cc

# Option 2: SendGrid
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@magicbit.cc

# Option 3: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=noreply@magicbit.cc
```

## Step 2: Configure Supabase

### 2.1 Update Supabase URL Configuration

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Authentication** → **URL Configuration**

**Site URL:**
```
https://neo.magicbit.cc
```
(Or your primary domain)

**Redirect URLs:**
Add all domains you'll use:
```
https://neo.magicbit.cc/**
https://neoadmin.magicbit.cc/**
http://localhost:3001/**
```

### 2.2 Verify Database Setup

Ensure all migrations are applied:
- Check `database/migrations/` folder
- Run any pending migrations in Supabase SQL Editor

## Step 3: Build the Application

### 3.1 Test Build Locally

```bash
# Install dependencies (if not already done)
npm install

# Run production build
npm run build

# Test production build locally
npm start
```

The app should start on port 3000 (or your configured port). Test it to ensure everything works.

### 3.2 Fix Any Build Errors

If you encounter build errors:
- Fix TypeScript errors
- Fix linting errors
- Ensure all environment variables are set

## Step 4: Choose Deployment Platform

### Option A: Vercel (Recommended for Next.js)

**Advantages:**
- ✅ Optimized for Next.js
- ✅ Automatic deployments from Git
- ✅ Free tier available
- ✅ Easy environment variable management

**Steps:**

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via Vercel Dashboard:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up/Login
   - Click "New Project"
   - Import your Git repository
   - Configure:
     - **Framework Preset:** Next.js
     - **Root Directory:** `./` (or leave default)
     - **Build Command:** `npm run build`
     - **Output Directory:** `.next`
     - **Install Command:** `npm install`

3. **Add Environment Variables:**
   - Go to Project Settings → Environment Variables
   - Add all variables from Step 1
   - Make sure to add them for "Production" environment

4. **Configure Custom Domain:**
   - Go to Project Settings → Domains
   - Add your domain: `neoadmin.magicbit.cc`
   - Follow DNS configuration instructions

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live!

### Option B: Custom Server (VPS/Cloud)

**Requirements:**
- Node.js 18+ installed
- PM2 or similar process manager
- Nginx or reverse proxy
- SSL certificate (Let's Encrypt)

**Steps:**

1. **Upload Code:**
   ```bash
   # On your server
   git clone your-repo-url
   cd admin-dashboard
   ```

2. **Install Dependencies:**
   ```bash
   npm install --production
   ```

3. **Set Environment Variables:**
   ```bash
   # Create .env.production file
   nano .env.production
   # Add all variables from Step 1
   ```

4. **Build Application:**
   ```bash
   npm run build
   ```

5. **Start with PM2:**
   ```bash
   # Install PM2 globally
   npm install -g pm2

   # Start application
   pm2 start npm --name "admin-dashboard" -- start
   pm2 save
   pm2 startup
   ```

6. **Configure Nginx:**
   Create `/etc/nginx/sites-available/admin-dashboard`:
   ```nginx
   server {
       listen 80;
       server_name neoadmin.magicbit.cc;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   Enable site:
   ```bash
   sudo ln -s /etc/nginx/sites-available/admin-dashboard /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl reload nginx
   ```

7. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d neoadmin.magicbit.cc
   ```

### Option C: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM node:18-alpine AS base

   # Install dependencies only when needed
   FROM base AS deps
   RUN apk add --no-cache libc6-compat
   WORKDIR /app
   COPY package.json package-lock.json ./
   RUN npm ci

   # Rebuild the source code only when needed
   FROM base AS builder
   WORKDIR /app
   COPY --from=deps /app/node_modules ./node_modules
   COPY . .
   ENV NEXT_TELEMETRY_DISABLED 1
   RUN npm run build

   # Production image, copy all the files and run next
   FROM base AS runner
   WORKDIR /app
   ENV NODE_ENV production
   ENV NEXT_TELEMETRY_DISABLED 1
   RUN addgroup --system --gid 1001 nodejs
   RUN adduser --system --uid 1001 nextjs
   COPY --from=builder /app/public ./public
   COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
   COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
   USER nextjs
   EXPOSE 3000
   ENV PORT 3000
   CMD ["node", "server.js"]
   ```

2. **Update next.config.js:**
   ```javascript
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     reactStrictMode: true,
     output: 'standalone', // Enable standalone output
   }
   module.exports = nextConfig
   ```

3. **Build and Run:**
   ```bash
   docker build -t admin-dashboard .
   docker run -p 3000:3000 --env-file .env.production admin-dashboard
   ```

## Step 5: Configure Domain DNS

### For Vercel:
- Add A record or CNAME as instructed by Vercel
- Wait for DNS propagation (can take up to 24 hours)

### For Custom Server:
- Add A record pointing to your server IP
- Or add CNAME if using a subdomain

## Step 6: Post-Deployment Checklist

### ✅ Verify Application
- [ ] Application loads at production URL
- [ ] Login page works
- [ ] Can create educator account
- [ ] Verification emails are sent
- [ ] Email links use correct domain (not localhost)
- [ ] Password reset works
- [ ] All dashboard pages load correctly
- [ ] API routes respond correctly

### ✅ Test Authentication
- [ ] Create new educator account
- [ ] Check verification email - should use production URL
- [ ] Complete verification flow
- [ ] Test password reset
- [ ] Test login/logout

### ✅ Test Core Features
- [ ] Create organization
- [ ] Create class
- [ ] Add students
- [ ] Generate join codes
- [ ] Assign missions to classes

### ✅ Security Checks
- [ ] Environment variables are not exposed in client code
- [ ] HTTPS is enabled (SSL certificate valid)
- [ ] Supabase RLS policies are working
- [ ] Service role key is server-side only

### ✅ Performance
- [ ] Page load times are acceptable
- [ ] Images/assets load correctly
- [ ] API responses are fast

## Step 7: Monitoring & Maintenance

### Set Up Monitoring

1. **Error Tracking:**
   - Consider adding Sentry or similar
   - Monitor application logs

2. **Uptime Monitoring:**
   - Use UptimeRobot or similar
   - Set alerts for downtime

3. **Performance Monitoring:**
   - Use Vercel Analytics (if on Vercel)
   - Or Google Analytics

### Regular Maintenance

- Keep dependencies updated: `npm update`
- Monitor Supabase usage and limits
- Review error logs regularly
- Backup database regularly

## Troubleshooting

### Issue: Environment variables not working
**Solution:** 
- Verify variables are set in hosting platform
- Restart application after adding variables
- Check variable names match exactly (case-sensitive)

### Issue: Email links use localhost
**Solution:**
- Verify `NEXT_PUBLIC_APP_BASE_URL` is set correctly
- Check Supabase Redirect URLs include production domain
- Clear cache and rebuild

### Issue: Build fails
**Solution:**
- Check Node.js version (need 18+)
- Clear `.next` folder and rebuild
- Check for TypeScript errors: `npm run lint`

### Issue: Database connection errors
**Solution:**
- Verify Supabase URL and keys are correct
- Check Supabase project is active
- Verify network/firewall allows connections

## Quick Deploy Commands

### Vercel CLI:
```bash
vercel --prod
```

### PM2 (Custom Server):
```bash
pm2 restart admin-dashboard
pm2 logs admin-dashboard
```

### Docker:
```bash
docker-compose up -d
docker logs admin-dashboard
```

## Support

If you encounter issues:
1. Check application logs
2. Check Supabase logs
3. Review error messages
4. Check this guide's troubleshooting section

---

**Ready to deploy?** Start with Step 1 and work through each step. Good luck! 🚀


