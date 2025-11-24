# Resend Domain Verification Guide

## Problem
Resend is showing this error:
```
You can only send testing emails to your own email address (jananimihiranijmbalasooriya@gmail.com). 
To send emails to other recipients, please verify a domain at resend.com/domains
```

## Why This Happens
Resend's free tier/testing mode only allows sending emails TO your own verified email address. To send to ANY email address (like educator emails), you need to verify a domain.

## Solution: Verify Your Domain

### Step 1: Go to Resend Domains
Visit: https://resend.com/domains

### Step 2: Add Your Domain
1. Click "Add Domain"
2. Enter your domain: `magicbit.cc` (or your domain)
3. Click "Add"

### Step 3: Add DNS Records
Resend will show you DNS records to add. You need to add them to your domain's DNS settings:

**Example DNS records:**
- Type: `TXT` | Name: `@` | Value: `resend-verification-code`
- Type: `TXT` | Name: `resend._domainkey` | Value: `dkim-key`

**Where to add DNS records:**
- If using Cloudflare: Go to DNS settings
- If using GoDaddy: Go to DNS Management
- If using Namecheap: Go to Advanced DNS

### Step 4: Wait for Verification
- Usually takes 5-15 minutes
- Resend will show "Verified" when ready

### Step 5: Update `.env.local`
```env
RESEND_API_KEY=re_ifAEwcxd_CUSBkfvutySpknus3stbQWVv
EMAIL_FROM=noreply@magicbit.cc
NEXT_PUBLIC_APP_URL=https://neo.magicbit.cc
```

### Step 6: Restart Dev Server
```bash
# Stop server (Ctrl+C)
npm run dev
```

## Temporary Workaround (For Testing)

Until you verify your domain, you can:
1. Send test emails to your own address: `jananimihiranijmbalasooriya@gmail.com`
2. Copy the verification link from the success modal
3. Manually send it to the educator

The verification/reset links are always generated and shown in the UI, even if email sending fails.

## Quick Reference

**Domain Verification:**
- URL: https://resend.com/domains
- Time: 5-15 minutes after adding DNS records
- Cost: Free

**After Verification:**
- Can send to ANY email address
- Use your own domain: `noreply@magicbit.cc`
- Professional email addresses
















