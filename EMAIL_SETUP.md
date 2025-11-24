# Email Setup Guide

## Overview

The application now includes email sending functionality. You need to configure one of the following email services to actually send emails.

## Quick Setup Options

### Option 1: Resend (Recommended - Free Tier Available)

1. **Sign up** at https://resend.com
2. **Get API Key** from https://resend.com/api-keys
3. **Install package:**
   ```bash
   npm install resend
   ```
4. **Add to `.env.local`:**
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=onboarding@yourdomain.com
   ```

### Option 2: SendGrid

1. **Sign up** at https://sendgrid.com
2. **Get API Key** from https://app.sendgrid.com/settings/api_keys
3. **Install package:**
   ```bash
   npm install @sendgrid/mail
   ```
4. **Add to `.env.local`:**
   ```env
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=noreply@yourdomain.com
   ```

### Option 3: SMTP (Nodemailer)

1. **Get SMTP credentials** from your email provider (Gmail, Outlook, etc.)
2. **Install package:**
   ```bash
   npm install nodemailer
   ```
3. **Add to `.env.local`:**
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   EMAIL_FROM=your-email@gmail.com
   ```

### Option 4: Supabase Email (Built-in)

If you have Supabase email templates configured, you can use Supabase's built-in email sending. However, the current implementation uses the email API route for better control.

## Environment Variables

Add these to your `.env.local` file:

```env
# Choose ONE email service:

# For Resend:
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=onboarding@yourdomain.com

# OR For SendGrid:
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxx
EMAIL_FROM=noreply@yourdomain.com

# OR For SMTP:
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-email@gmail.com

# App URL (required)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Testing

After setup, create an educator account and check:
1. Email is sent to the educator's email address
2. Verification link works correctly
3. Email formatting looks good

## Troubleshooting

### Emails not sending?

1. **Check console logs** - The email API will log errors
2. **Verify API keys** - Make sure your API keys are correct
3. **Check email service status** - Verify your chosen service is working
4. **Check spam folder** - Sometimes emails go to spam initially

### Development Mode

If no email service is configured, emails will be logged to the console. This allows you to:
- Copy the verification link manually
- Test the flow without email setup
- See what emails would be sent

## Email Templates

The following emails are automatically sent:
1. **Educator Verification Email** - Sent when educator account is created
2. **Password Reset Email** - Sent when password reset is requested
3. **Account Update Email** - Sent when user is updated to educator role

All emails include:
- HTML formatting
- Plain text fallback
- Clear call-to-action buttons
- Security notices

















