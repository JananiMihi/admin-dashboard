import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper function to convert deployed URLs to localhost for local development
function convertToLocalhostUrl(url: string | null): string | null {
  if (!url) return null
  
  const localhostUrl = 'http://localhost:3001'
  const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  
  // If appUrl is set to localhost or not set (defaults to localhost), convert any deployed URLs
  // If appUrl contains deployed domain, don't convert (we're in production)
  const isLocalhost = !appUrl || appUrl.includes('localhost') || appUrl.includes('127.0.0.1')
  
  // Replace common deployed domains with localhost if we're in localhost mode
  if (isLocalhost && url.includes('neo.magicbit.cc')) {
    // Extract the path and query params from the original URL
    try {
      const urlObj = new URL(url)
      const newUrl = `${localhostUrl}${urlObj.pathname}${urlObj.search}${urlObj.hash}`
      return newUrl
    } catch (e) {
      // If URL parsing fails, do simple string replacement
      return url.replace(/https?:\/\/neo\.magicbit\.cc/g, localhostUrl)
    }
  }
  
  return url
}

// Send password reset email
async function sendPasswordResetEmail(email: string, resetLink: string): Promise<void> {
  // Convert resetLink to localhost if in development
  const convertedResetLink = convertToLocalhostUrl(resetLink) || resetLink
  const emailSubject = 'Password Reset Request - Neo Buddy Admin'
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Password Reset Request</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Password Reset Request</h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">Neo Buddy Admin</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">Hello,</p>
              
              <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                A password reset has been requested for your educator account.<br>
                Click the button below to reset your password:
              </p>
              
              <!-- Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 30px 0;">
                <tr>
                  <td align="center">
                    <a href="${convertedResetLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Security Warning -->
              <div style="margin: 30px 0; padding: 20px; background-color: #FEE2E2; border-radius: 8px; border-left: 4px solid #EF4444;">
                <p style="margin: 0 0 10px 0; color: #991B1B; font-size: 14px; font-weight: 600;">⚠️ Security Notice:</p>
                <p style="margin: 0; color: #991B1B; font-size: 14px; line-height: 1.6;">
                  If you did not request this password reset, please contact your administrator immediately.
                </p>
              </div>
              
              <p style="margin: 25px 0 0 0; color: #6b7280; font-size: 12px; word-break: break-all; background-color: #f9fafb; padding: 15px; border-radius: 6px;">
                <strong>Reset Link:</strong><br>
                ${convertedResetLink}
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

  // Send email directly using email service
  await sendEmailDirectly(email, emailSubject, emailHtml)
}

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
      let fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev'
      
      // Validate FROM email - must be resend.dev or verified domain
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
          // Don't throw - continue so reset link is still shown
        } else if (error.message?.includes('You can only send testing emails to your own email address')) {
          console.error('❌ Resend Testing Mode Limitation!')
          console.error('   Resend free tier only allows sending to your verified email address.')
          console.error('   Solution: Verify your domain at https://resend.com/domains')
          console.error('   1. Go to https://resend.com/domains')
          console.error('   2. Add and verify your domain (e.g., magicbit.cc)')
          console.error('   3. Update .env.local: EMAIL_FROM=noreply@magicbit.cc')
          console.error('   4. Restart your dev server')
          console.error('   OR: Send test emails to jananimihiranijmbalasooriya@gmail.com for now')
          // Don't throw - continue so reset link is still shown
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
      // Don't throw - continue to fallback so reset link is still shown
      console.error('⚠️ Email sending failed, but reset link is still available in the response')
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
  console.log('Link:', html?.match(/href="([^"]+)"/)?.[1] || 'N/A')
  console.log('==================================================')
}

export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json()

    if (!userId && !email) {
      return NextResponse.json(
        { error: 'User ID or email is required' },
        { status: 400 }
      )
    }

    // Find user if email provided
    let targetUserId = userId
    if (email && !userId) {
      const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
      const user = users?.find(u => u.email === email)
      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        )
      }
      targetUserId = user.id
    }

    // Generate password reset link
    // Supabase will automatically send email if email templates are configured
    const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const redirectUrl = `${appUrl}/auth/verify-educator`
    
    const { data: resetData, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email || undefined,
      options: {
        redirectTo: redirectUrl
      }
    })

    if (resetError) {
      console.error('Reset link error:', resetError)
      throw resetError
    }

    // Also send custom email if email service is configured
    if (resetData?.properties?.action_link) {
      try {
        await sendPasswordResetEmail(email || '', resetData.properties.action_link)
      } catch (emailError) {
        console.error('Custom email sending error (this is ok if Supabase email is configured):', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      resetLink: resetData?.properties?.action_link,
      message: 'Password reset link has been sent to your email'
    })
  } catch (error: any) {
    console.error('Error generating password reset link:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate password reset link' },
      { status: 500 }
    )
  }
}

