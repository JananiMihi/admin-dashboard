import { NextRequest, NextResponse } from 'next/server'

// Email sending service
// You can integrate with Resend, SendGrid, Nodemailer, or Supabase email
export async function POST(req: NextRequest) {
  try {
    const { to, subject, html, text } = await req.json()

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Email address and subject are required' },
        { status: 400 }
      )
    }

    // Option 1: Use Resend (recommended - free tier available)
    // Install: npm install resend
    // Get API key from: https://resend.com/api-keys
    if (process.env.RESEND_API_KEY) {
      const resend = require('resend')
      const resendClient = new resend.Resend(process.env.RESEND_API_KEY)

      const { data, error } = await resendClient.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: [to],
        subject: subject,
        html: html || text,
      })

      if (error) {
        console.error('Resend error:', error)
        throw error
      }

      return NextResponse.json({
        success: true,
        messageId: data?.id,
        message: 'Email sent successfully via Resend'
      })
    }

    // Option 2: Use SendGrid
    // Install: npm install @sendgrid/mail
    // Get API key from: https://app.sendgrid.com/settings/api_keys
    if (process.env.SENDGRID_API_KEY) {
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

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully via SendGrid'
      })
    }

    // Option 3: Use Nodemailer with SMTP
    // Install: npm install nodemailer
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
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

      return NextResponse.json({
        success: true,
        message: 'Email sent successfully via SMTP'
      })
    }

    // Fallback: Log email (for development)
    // In production, you should configure one of the above services
    console.log('=== EMAIL (NOT SENT - Configure email service) ===')
    console.log('To:', to)
    console.log('Subject:', subject)
    console.log('Body:', html || text)
    console.log('==================================================')

    // Return success even though email wasn't actually sent
    // This allows the flow to continue in development
    return NextResponse.json({
      success: true,
      message: 'Email queued (not actually sent - configure email service)',
      warning: 'Email service not configured. Email was logged to console only.'
    })
  } catch (error: any) {
    console.error('Email sending error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}



