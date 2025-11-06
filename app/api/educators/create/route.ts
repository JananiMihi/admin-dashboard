import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Send email directly using configured email service
async function sendEmailDirectly(to: string, subject: string, html?: string, text?: string): Promise<void> {
  // Option 1: Use SendGrid (if configured)
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = await import('@sendgrid/mail').catch(() => null)
      if (!sgMail) {
        console.warn('SendGrid package not installed. Install with: npm install @sendgrid/mail')
      } else {
        sgMail.default.setApiKey(process.env.SENDGRID_API_KEY)

        const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.EMAIL_FROM || 'noreply@example.com'
        const msg = {
          to: to,
          from: fromEmail,
          subject: subject,
          html: html || text || '',
          text: text || html?.replace(/<[^>]*>/g, ''),
        }

        await sgMail.default.send(msg)
        console.log('✅ Email sent successfully via SendGrid!')
        console.log('   From:', fromEmail)
        console.log('   To:', to)
        return
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('SendGrid package not installed. Install with: npm install @sendgrid/mail')
      } else {
        console.error('SendGrid error:', error)
        // Continue to next option
      }
    }
  }

  // Option 2: Use SMTP (Gmail, etc.)
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = await import('nodemailer').catch(() => null)
      if (!nodemailer) {
        console.warn('Nodemailer package not installed. Install with: npm install nodemailer')
      } else {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_PORT === '465' || process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        })

        const fromEmail = process.env.SMTP_FROM || process.env.SMTP_USER || process.env.EMAIL_FROM
        await transporter.sendMail({
          from: fromEmail,
          to: to,
          subject: subject,
          html: html || text || '',
          text: text || html?.replace(/<[^>]*>/g, ''),
        })

        console.log('✅ Email sent successfully via SMTP!')
        console.log('   From:', fromEmail)
        console.log('   To:', to)
        return
      }
    } catch (error: any) {
      if (error.code === 'MODULE_NOT_FOUND') {
        console.warn('Nodemailer package not installed. Install with: npm install nodemailer')
      } else {
        console.error('SMTP error:', error)
        // Continue to next option
      }
    }
  }

  // Option 3: Use Resend (fallback)
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      // Use verified domain or resend.dev for testing
      // IMPORTANT: Must use onboarding@resend.dev (pre-verified) or your own verified domain
      // Do NOT use Gmail addresses as FROM - they won't work
      let fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
      
      // Validate FROM email - must be resend.dev or verified domain
      // If using Gmail or unverified domain, force to use onboarding@resend.dev
      if (!fromEmail.includes('@resend.dev') && !fromEmail.includes('@magicbit.cc')) {
        console.warn('⚠️ EMAIL_FROM should be onboarding@resend.dev or a verified domain.')
        console.warn('   Using onboarding@resend.dev instead of:', fromEmail)
        fromEmail = 'onboarding@resend.dev'
      }
      
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: to,
        subject: subject,
        html: html || text || '',
      })
      
      if (error) {
        console.error('Resend error:', error)
        if (error.message?.includes('domain is not verified') || error.message?.includes('domain')) {
          console.error('❌ Domain verification error!')
          console.error('   Fix: Update .env.local with:')
          console.error('   EMAIL_FROM=onboarding@resend.dev')
          console.error('   Then restart your dev server')
          // Don't throw - continue so verification link is still shown
        } else if (error.message?.includes('You can only send testing emails to your own email address')) {
          console.error('❌ Resend Testing Mode Limitation!')
          console.error('   Resend free tier only allows sending to your verified email address.')
          console.error('   Solution: Verify your domain at https://resend.com/domains')
          console.error('   1. Go to https://resend.com/domains')
          console.error('   2. Add and verify your domain (e.g., magicbit.cc)')
          console.error('   3. Update .env.local: EMAIL_FROM=noreply@magicbit.cc')
          console.error('   4. Restart your dev server')
          console.error('   OR: Send test emails to jananimihiranijmbalasooriya@gmail.com for now')
          // Don't throw - continue so verification link is still shown
        } else {
          throw error
        }
      } else {
        console.log('✅ Email sent successfully via Resend!')
        console.log('   From:', fromEmail)
        console.log('   To:', to)
        console.log('   Message ID:', data?.id)
        return
      }
    } catch (error: any) {
      console.error('Resend error:', error)
      // Don't throw - continue to fallback so verification link is still shown
      console.error('⚠️ Email sending failed, but verification link is still available in the response')
    }
  }

  // Option 2: Use SendGrid (optional - requires npm install @sendgrid/mail)
  // Uncomment and install package if you want to use SendGrid instead of Resend
  /*
  if (process.env.SENDGRID_API_KEY) {
    try {
      const sgMail = require('@sendgrid/mail')
      sgMail.setApiKey(process.env.SENDGRID_API_KEY)

      const msg = {
        to: to,
        from: process.env.EMAIL_FROM || 'noreply@example.com',
        subject: subject,
        html: html || text,
        text: text || html?.replace(/<[^>]*>/g, ''),
      }

      await sgMail.send(msg)
      console.log('Email sent successfully via SendGrid')
      return
    } catch (error: any) {
      console.error('SendGrid error:', error)
      throw error
    }
  }
  */

  // Option 3: Use Nodemailer with SMTP (optional - requires npm install nodemailer)
  // Uncomment and install package if you want to use SMTP instead of Resend
  /*
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const nodemailer = require('nodemailer')

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || process.env.SMTP_USER,
        to: to,
        subject: subject,
        html: html || text,
        text: text || html?.replace(/<[^>]*>/g, ''),
      })

      console.log('Email sent successfully via SMTP')
      return
    } catch (error: any) {
      console.error('SMTP error:', error)
      throw error
    }
  }
  */

  // Fallback: Log email (for development)
  console.log('=== EMAIL (NOT SENT - Configure email service) ===')
  console.log('To:', to)
  console.log('Subject:', subject)
  console.log('Body:', html || text)
  console.log('==================================================')
  console.log('To enable email sending, configure one of:')
  console.log('1. Resend: Add RESEND_API_KEY to .env.local')
  console.log('2. SendGrid: Add SENDGRID_API_KEY to .env.local')
  console.log('3. SMTP: Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env.local')
}

// Generate a secure random password
function generatePassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  // Ensure at least one uppercase, one lowercase, one number, and one special char
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

// Send verification email to educator
async function sendEducatorVerificationEmail(email: string, name: string, verificationLink: string | null): Promise<void> {
  const emailSubject = 'Verify Your Educator Account - Neo Buddy Admin'
  // Always use localhost in development mode
  const isLocalhost = !process.env.NEXT_PUBLIC_APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL
  const appUrl = isLocalhost ? 'http://localhost:3001' : (process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')
  const loginUrl = `${appUrl}/auth/verify-educator`
  
  // Extract token and rebuild URL to always use localhost in development
  let convertedVerificationLink = `${appUrl}/auth/verify-educator`
  
  if (verificationLink) {
    console.log('Original verificationLink from Supabase:', verificationLink)
    try {
      const urlObj = new URL(verificationLink)
      
      // Extract token and type from various possible locations in Supabase link
      let token = urlObj.searchParams.get('token') 
        || urlObj.hash.match(/[#&]token=([^&]+)/)?.[1]
        || urlObj.searchParams.get('token_hash')
        || null
      
      let type = urlObj.searchParams.get('type')
        || urlObj.hash.match(/[#&]type=([^&]+)/)?.[1]
        || 'invite' // Default to invite for new educators
      
      console.log('Extracted token:', token ? 'Found' : 'Not found')
      console.log('Extracted type:', type)
      
      // If we found token, rebuild URL using localhost
      if (token) {
        const baseUrl = isLocalhost ? 'http://localhost:3001' : appUrl
        // Use our proxy route which will handle Supabase verification
        convertedVerificationLink = `${baseUrl}/api/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(`${baseUrl}/auth/verify-educator`)}`
        console.log('Rebuilt verification URL with localhost:', convertedVerificationLink)
      } else {
        // No token found - try conversion
        console.warn('No token found in verificationLink, attempting conversion')
        const converted = convertToLocalhostUrl(verificationLink)
        if (converted && !converted.includes('neo.magicbit.cc')) {
          convertedVerificationLink = converted
        } else {
          // Force localhost if conversion failed
          convertedVerificationLink = isLocalhost ? 'http://localhost:3001/auth/verify-educator' : `${appUrl}/auth/verify-educator`
        }
      }
    } catch (e) {
      // If URL parsing fails, force localhost
      console.error('Error parsing verificationLink:', e)
      convertedVerificationLink = isLocalhost ? 'http://localhost:3001/auth/verify-educator' : `${appUrl}/auth/verify-educator`
    }
  }
  
  // Final safety check: ensure no deployed domain in development
  if (isLocalhost && convertedVerificationLink.includes('neo.magicbit.cc')) {
    console.warn('WARNING: convertedVerificationLink still contains deployed domain, forcing localhost')
    convertedVerificationLink = 'http://localhost:3001/auth/verify-educator'
  }
  
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Educator Account</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Welcome to Neo Buddy Admin!</h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">Your Educator Account is Ready</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
              
              <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                Your educator account has been created successfully! 🎉<br>
                Please verify your account and set up your password by clicking the button below:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${convertedVerificationLink || '#'}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                      Verify Account & Set Password
                    </a>
                  </td>
                </tr>
              </table>
              
              ${convertedVerificationLink ? `
              <p style="margin: 25px 0 10px 0; color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 15px; border-radius: 6px; border-left: 4px solid #4F46E5;">
                <strong>Or copy this link:</strong><br>
                ${convertedVerificationLink}
              </p>
              ` : ''}
              
              <!-- Features -->
              <div style="margin: 35px 0; padding: 25px; background-color: #f9fafb; border-radius: 8px;">
                <h3 style="margin: 0 0 20px 0; color: #111827; font-size: 18px;">✨ What you can do after verification:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 15px; line-height: 2;">
                  <li>Create and manage classes</li>
                  <li>Add students to your classes</li>
                  <li>Track student progress</li>
                  <li>Generate join codes for your classes</li>
                </ul>
              </div>
              
              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 20px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0 0 10px 0; color: #92400E; font-size: 14px; font-weight: 600;">🔒 Important Security Notes:</p>
                <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 14px; line-height: 1.8;">
                  <li>This link will expire after 24 hours</li>
                  <li>Do not share this link with anyone</li>
                  <li>If you need to reset your password later, use the password reset option on the login page</li>
                </ul>
              </div>
              
              <!-- Login URL -->
              <p style="margin: 25px 0 0 0; color: #6b7280; font-size: 14px; text-align: center;">
                After setting up your password, login at: <a href="${loginUrl}" style="color: #4F46E5; text-decoration: none; font-weight: 500;">${loginUrl}</a>
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Best regards,<br>
                <strong style="color: #374151;">Neo Buddy Admin Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  const emailText = `
Hello ${name},

Your educator account has been created successfully. Please verify your account and set up your password by clicking the link below:

${convertedVerificationLink || 'Contact administrator for verification link'}

This link will allow you to:
- Verify your email address
- Set up your login password
- Access your educator dashboard

Important Security Notes:
- This link will expire after 24 hours
- Do not share this link with anyone
- If you need to reset your password later, you can use the password reset option in the login page

After verification, you'll be able to:
- Create and manage classes
- Add students to your classes
- Track student progress
- Generate join codes for your classes

Login URL: ${loginUrl}

Best regards,
Admin Team
  `

  try {
    // Send email directly using email service
    await sendEmailDirectly(email, emailSubject, emailHtml, emailText)
  } catch (error) {
    console.error('Failed to send email:', error)
    // Don't throw - continue even if email fails
  }
}

// Helper function to convert deployed URLs to localhost for local development
// CRITICAL: Always ensures /login redirects become /auth/verify-educator
// CRITICAL: Always converts neo.magicbit.cc to localhost:3001 in development
function convertToLocalhostUrl(url: string | null): string | null {
  if (!url) return null
  
  const localhostUrl = 'http://localhost:3001'
  const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  
  // If appUrl is set to localhost or not set (defaults to localhost), convert any deployed URLs
  // If appUrl contains deployed domain, don't convert (we're in production)
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
  
  // CRITICAL FIX: If URL contains /login anywhere, replace it with /auth/verify-educator
  if (url.includes('/login')) {
    url = url.replace(/\/login(\?|#|$)/g, '/auth/verify-educator$1')
    url = url.replace(/redirect_to=.*?\/login/g, 'redirect_to=' + encodeURIComponent(`${localhostUrl}/auth/verify-educator`))
  }
  
  // CRITICAL: If URL contains neo.magicbit.cc and we're in localhost mode, ALWAYS convert it
  if (isLocalhost && url.includes('neo.magicbit.cc')) {
    console.log('Converting deployed URL to localhost:', url)
    // Extract the path and query params from the original URL
    try {
      const urlObj = new URL(url)
      
      // If this is a Supabase verification URL (/auth/v1/verify), route it through our proxy
      if (urlObj.pathname === '/auth/v1/verify' || urlObj.pathname.includes('/auth/v1/verify')) {
        // Use our API route proxy instead
        const proxyUrl = new URL(`${localhostUrl}/api/auth/v1/verify`)
        // Copy query parameters
        urlObj.searchParams.forEach((value, key) => {
          if (key === 'redirect_to') {
            // Convert redirect_to to localhost and ALWAYS ensure it's verify-educator, never login
            try {
              let redirectValue = value
              // Replace /login with /auth/verify-educator in redirect_to
              if (redirectValue.includes('/login')) {
                redirectValue = redirectValue.replace(/\/login(\?|#|$)/g, '/auth/verify-educator$1')
              }
              
              const redirectUrl = new URL(redirectValue)
              let redirectPath = redirectUrl.pathname
              
              // Convert /login to /auth/verify-educator
              if (redirectPath === '/login' || redirectPath.includes('/login')) {
                redirectPath = '/auth/verify-educator'
              }
              
              if (redirectUrl.host.includes('neo.magicbit.cc')) {
                // Deployed domain - convert to localhost
                const localRedirect = `${localhostUrl}${redirectPath}${redirectUrl.search}${redirectUrl.hash}`
                proxyUrl.searchParams.set(key, localRedirect)
              } else {
                // Already localhost or other domain, but ensure path is correct
                redirectUrl.pathname = redirectPath
                proxyUrl.searchParams.set(key, redirectUrl.toString())
              }
            } catch (e) {
              // If redirect_to is not a full URL or contains /login, ALWAYS use verify-educator
              proxyUrl.searchParams.set(key, `${localhostUrl}/auth/verify-educator`)
            }
          } else {
            proxyUrl.searchParams.set(key, value)
          }
        })
        return proxyUrl.toString()
      }
      
      // For other URLs, just replace the domain and ensure no /login
      let newUrl = `${localhostUrl}${urlObj.pathname}${urlObj.search}${urlObj.hash}`
      // Final check for /login
      if (newUrl.includes('/login')) {
        newUrl = newUrl.replace(/\/login(\?|#|$)/g, '/auth/verify-educator$1')
      }
      return newUrl
    } catch (e) {
      // If URL parsing fails, do simple string replacement and fix /login
      let fixedUrl = url.replace(/https?:\/\/neo\.magicbit\.cc/g, localhostUrl)
      if (fixedUrl.includes('/login')) {
        fixedUrl = fixedUrl.replace(/\/login(\?|#|$)/g, '/auth/verify-educator$1')
      }
      return fixedUrl
    }
  }
  
  // Final safety check: if URL still contains /login, replace it
  if (url.includes('/login')) {
    url = url.replace(/\/login(\?|#|$)/g, '/auth/verify-educator$1')
    url = url.replace(/redirect_to=.*?\/login/g, 'redirect_to=' + encodeURIComponent(`${localhostUrl}/auth/verify-educator`))
  }
  
  return url
}

// Send email for educator update (when existing user is updated to educator)
async function sendEducatorUpdateEmail(email: string, name: string, resetLink: string | null): Promise<void> {
  // Always use localhost in development mode
  const isLocalhost = !process.env.NEXT_PUBLIC_APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL
  const appUrl = isLocalhost ? 'http://localhost:3001' : (process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001')
  const loginUrl = `${appUrl}/auth/verify-educator`
  
  // Extract token from resetLink if it exists, then rebuild URL to always point to localhost verify-educator
  let passwordSetupUrl = `${appUrl}/auth/verify-educator`
  
  if (resetLink) {
    console.log('Original resetLink from Supabase:', resetLink)
    try {
      // Parse the Supabase link - it might be in different formats
      const urlObj = new URL(resetLink)
      
      // Extract token and type from various possible locations in Supabase link
      let token = urlObj.searchParams.get('token') 
        || urlObj.hash.match(/[#&]token=([^&]+)/)?.[1]
        || urlObj.searchParams.get('token_hash')
        || null
      
      let type = urlObj.searchParams.get('type')
        || urlObj.hash.match(/[#&]type=([^&]+)/)?.[1]
        || 'recovery' // Default to recovery if not found
      
      console.log('Extracted token:', token ? 'Found' : 'Not found')
      console.log('Extracted type:', type)
      
      // If we found token, rebuild URL using localhost
      if (token) {
        const baseUrl = isLocalhost ? 'http://localhost:3001' : appUrl
        // Use our proxy route which will handle Supabase verification
        passwordSetupUrl = `${baseUrl}/api/auth/v1/verify?token=${encodeURIComponent(token)}&type=${encodeURIComponent(type)}&redirect_to=${encodeURIComponent(`${baseUrl}/auth/verify-educator`)}`
        console.log('Rebuilt URL with localhost:', passwordSetupUrl)
      } else {
        // No token found - try to extract from hash or use conversion
        console.warn('No token found in resetLink, attempting conversion')
        const convertedLink = convertToLocalhostUrl(resetLink)
        if (convertedLink && !convertedLink.includes('neo.magicbit.cc')) {
          passwordSetupUrl = convertedLink
        } else {
          // Force localhost if conversion failed
          passwordSetupUrl = isLocalhost ? 'http://localhost:3001/auth/verify-educator' : `${appUrl}/auth/verify-educator`
        }
      }
    } catch (e) {
      // If URL parsing fails completely, force localhost
      console.error('Error parsing resetLink:', e)
      passwordSetupUrl = isLocalhost ? 'http://localhost:3001/auth/verify-educator' : `${appUrl}/auth/verify-educator`
    }
  } else {
    // No reset link provided - use default localhost verify-educator
    passwordSetupUrl = isLocalhost ? 'http://localhost:3001/auth/verify-educator' : `${appUrl}/auth/verify-educator`
  }
  
  // Final safety check: ensure passwordSetupUrl is always localhost in development
  if (isLocalhost && passwordSetupUrl.includes('neo.magicbit.cc')) {
    console.warn('WARNING: passwordSetupUrl still contains deployed domain, forcing localhost conversion')
    passwordSetupUrl = convertToLocalhostUrl(passwordSetupUrl) || 'http://localhost:3001/auth/verify-educator'
  }
  
  // Log the final URL for debugging
  console.log('Final passwordSetupUrl for email:', passwordSetupUrl)
  
  const convertedResetLink = convertToLocalhostUrl(resetLink)
  
  const emailSubject = 'You\'ve Been Invited to Join as an Educator - Neo Buddy Admin'
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Educator Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">You're Invited!</h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">Join as an Educator</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
              
              <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                You've been invited to join <strong>Neo Buddy Admin</strong> as an <strong>Educator</strong>. 🎉<br><br>
                As an educator, you'll be able to create classes, manage students, track progress, and much more.
              </p>
              
              <!-- Main Invitation Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 35px 0;">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="${passwordSetupUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); transition: transform 0.2s;">
                      Verify Account & Set Password
                    </a>
                  </td>
                </tr>
              </table>
              
              ${passwordSetupUrl ? `
              <!-- Invitation Link -->
              <div style="margin: 25px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #4F46E5;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600;">📎 Invitation Link:</p>
                <p style="margin: 0; color: #374151; font-size: 12px; word-break: break-all; font-family: monospace; background-color: #ffffff; padding: 12px; border-radius: 4px;">
                  ${passwordSetupUrl}
                </p>
              </div>
              ` : ''}
              
              <!-- What You Can Do -->
              <div style="margin: 35px 0; padding: 25px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <h3 style="margin: 0 0 15px 0; color: #1e40af; font-size: 18px; font-weight: 600;">✨ What you can do as an Educator:</h3>
                <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 15px; line-height: 2;">
                  <li>Create and manage multiple classes</li>
                  <li>Add students and track their progress</li>
                  <li>Generate unique join codes for your classes</li>
                  <li>Access comprehensive analytics and reports</li>
                </ul>
              </div>
              
              <!-- Security Notice -->
              <div style="margin: 30px 0; padding: 20px; background-color: #FEF3C7; border-radius: 8px; border-left: 4px solid #F59E0B;">
                <p style="margin: 0 0 10px 0; color: #92400E; font-size: 14px; font-weight: 600;">🔒 Important:</p>
                <ul style="margin: 0; padding-left: 20px; color: #92400E; font-size: 14px; line-height: 1.8;">
                  <li>This invitation link will expire after 24 hours</li>
                  <li>Keep this link secure and do not share it with anyone</li>
                  <li>After verification, you can set your password and access your dashboard</li>
                </ul>
              </div>
              
              <!-- Next Steps -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <p style="margin: 0 0 10px 0; color: #374151; font-size: 15px; font-weight: 600;">📋 Next Steps:</p>
                <ol style="margin: 0; padding-left: 20px; color: #6b7280; font-size: 14px; line-height: 2;">
                  <li>Click the "Verify Account & Set Password" button above</li>
                  <li>Set up your secure password</li>
                  <li>Start creating your classes and managing students</li>
                </ol>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; text-align: center;">
              <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 12px;">
                If you have any questions, please contact your administrator.
              </p>
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Best regards,<br>
                <strong style="color: #374151;">Neo Buddy Admin Team</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `

  try {
    await sendEmailDirectly(email, emailSubject, emailHtml)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

// Send email for password reset
async function sendEducatorResetEmail(email: string, name: string, resetLink: string | null): Promise<void> {
  const emailSubject = 'Password Reset Request'
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .content { background: #f9fafb; padding: 30px; border-radius: 8px; }
    .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .warning { background: #FEF3C7; padding: 15px; border-radius: 6px; margin: 20px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="content">
      <p>Hello ${name},</p>
      <p>A password reset has been requested for your educator account.</p>
      ${resetLink ? `<p><a href="${resetLink}" class="button">Reset Password</a></p>` : ''}
      <div class="warning">
        <p><strong>⚠️ Security Notice:</strong></p>
        <p>If you did not request this password reset, please contact your administrator immediately.</p>
      </div>
      <p>Best regards,<br>Admin Team</p>
    </div>
  </div>
</body>
</html>
  `

  try {
    await sendEmailDirectly(email, emailSubject, emailHtml)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, name, orgId } = await req.json()

    // Validate required fields
    if (!email || !name || !orgId) {
      return NextResponse.json(
        { error: 'Email, name, and organization are required' },
        { status: 400 }
      )
    }

    // Check if email already exists in auth.users
    const { data: { users: authUsers } } = await supabaseAdmin.auth.admin.listUsers()
    const existingAuthUser = authUsers?.find(u => u.email === email)

    // Check if email exists in user_profiles
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id, role')
      .eq('email', email)
      .maybeSingle()

    if (existingAuthUser) {
      // User exists in auth - update them to Educator
      // Check if already educator
      if (existingProfile && existingProfile.role === 'Educator') {
        // Already an educator - generate password reset link
        const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
        const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
          type: 'recovery',
          email: email,
          options: {
            redirectTo: `${appUrl}/auth/verify-educator`
          }
        })

        // Send email with reset link
        try {
          await sendEducatorResetEmail(email, name, resetData?.properties?.action_link || null)
        } catch (emailError) {
          console.error('Email sending error:', emailError)
        }

        return NextResponse.json({
          success: true,
          userId: existingAuthUser.id,
          message: 'Educator already exists. Password reset link sent.',
          resetLink: resetData?.properties?.action_link || null,
          email: email,
          existingUser: true,
          alreadyEducator: true
        })
      }

      // User exists but not educator yet - update to Educator
      // Update user metadata
      await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
        user_metadata: {
          name,
          role: 'Educator'
        }
      })

      // Create or update profile
      const { error: profileError } = await supabaseAdmin
        .from('user_profiles')
        .upsert({
          user_id: existingAuthUser.id,
          email: email,
          full_name: name,
          role: 'Educator',
          org_id: orgId,
          onboarding_state: 'pending'
        }, {
          onConflict: 'user_id'
        })

      if (profileError) {
        return NextResponse.json(
          { error: `Failed to update user profile: ${profileError.message}` },
          { status: 500 }
        )
      }

      // Generate password reset link for existing user (they can set their own password)
      const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
      const redirectUrl = `${appUrl}/auth/verify-educator`
      const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: redirectUrl
        }
      })

      // Send email with login instructions
      try {
        await sendEducatorUpdateEmail(email, name, resetData?.properties?.action_link || null)
      } catch (emailError) {
        console.error('Email sending error:', emailError)
      }

      return NextResponse.json({
        success: true,
        userId: existingAuthUser.id,
        message: existingProfile 
          ? `User updated from ${existingProfile.role} to Educator. Password reset link sent.`
          : 'Existing user updated to Educator role. Password reset link sent.',
        resetLink: resetData?.properties?.action_link || null,
        email: email,
        existingUser: true
      })
    }

    // Create auth user without password (will be set via verification link)
    let authData
    let authError
    
    try {
      const result = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: false, // Will be confirmed via verification link
        user_metadata: {
          name,
          role: 'Educator'
        }
      })
      authData = result.data
      authError = result.error
    } catch (err: any) {
      authError = err
    }

    if (authError) {
      console.error('Auth error:', authError)
      
      // Handle specific error: email already exists
      if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
        // Try to find existing user and update them
        const { data: { users: allUsers } } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = allUsers?.find(u => u.email === email)
        
        if (existingUser) {
          // Update existing user's metadata
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
            user_metadata: {
              name,
              role: 'Educator'
            }
          })

          // Create or update profile
          await supabaseAdmin
            .from('user_profiles')
            .upsert({
              user_id: existingUser.id,
              email: email,
              full_name: name,
              role: 'Educator',
              org_id: orgId,
              onboarding_state: 'pending'
            }, {
              onConflict: 'user_id'
            })

          // Generate password reset link
          const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
          const { data: resetData } = await supabaseAdmin.auth.admin.generateLink({
            type: 'recovery',
            email: email,
            options: {
              redirectTo: `${appUrl}/auth/verify-educator`
            }
          })

          // Send email with reset link
          try {
            await sendEducatorUpdateEmail(email, name, resetData?.properties?.action_link || null)
          } catch (emailError) {
            console.error('Email sending error:', emailError)
          }

          return NextResponse.json({
            success: true,
            userId: existingUser.id,
            message: 'Existing user updated to Educator. Password reset link sent.',
            resetLink: resetData?.properties?.action_link || null,
            email: email,
            existingUser: true
          })
        }

        return NextResponse.json(
          { error: 'A user with this email already exists. Please use a different email or update the existing user.' },
          { status: 400 }
        )
      }

      return NextResponse.json(
        { error: authError.message || 'Failed to create user' },
        { status: 500 }
      )
    }

    // Create user profile
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({
        user_id: authData.user.id,
        email: email,
        full_name: name,
        role: 'Educator',
        org_id: orgId,
        onboarding_state: 'pending'
      })

    if (profileError) {
      // Rollback: delete auth user if profile creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      )
    }

    // Generate verification link for password setup
    // Supabase will automatically send email if email templates are configured
    const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const redirectUrl = `${appUrl}/auth/verify-educator`
    
    const { data: verificationData, error: verificationError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email: email,
      options: {
        redirectTo: redirectUrl,
        // This makes Supabase send the email automatically
        data: {
          name: name,
          role: 'Educator'
        }
      }
    })

    if (verificationError) {
      console.error('Verification link error:', verificationError)
    }

    // Send custom verification email (if Supabase email template not configured)
    // This will only send if email service is configured
    try {
      await sendEducatorVerificationEmail(email, name, verificationData?.properties?.action_link || null)
    } catch (emailError) {
      console.error('Custom email sending error (this is ok if Supabase email is configured):', emailError)
    }

    return NextResponse.json({
      success: true,
      userId: authData.user.id,
      message: 'Educator created successfully. Verification email sent.',
      email: email,
      verificationLink: verificationData?.properties?.action_link || null,
      loginUrl: `${process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/login`
    })
  } catch (error: any) {
    console.error('Error creating educator:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create educator' },
      { status: 500 }
    )
  }
}

