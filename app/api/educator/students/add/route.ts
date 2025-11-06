import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

// Helper function to send student invitation email
async function sendStudentInvitationEmail(
  email: string,
  name: string,
  className: string,
  joinCode: string,
  joinLink: string
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  
  const emailSubject = `You've been invited to join ${className} - Neo Buddy Admin`
  const emailHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Class Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6;">
  <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; width: 100%; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px 30px; text-align: center; border-radius: 8px 8px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">Class Invitation</h1>
              <p style="margin: 10px 0 0 0; color: #E0E7FF; font-size: 16px;">Join Your Class</p>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">Hello <strong>${name}</strong>,</p>
              
              <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                You've been invited to join <strong>${className}</strong> class. 🎉<br><br>
                Use the join code or link below to join the class.
              </p>
              
              <!-- Join Code -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #4F46E5;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Join Code:</p>
                <p style="margin: 0; font-family: monospace; font-size: 24px; font-weight: bold; color: #374151;">
                  ${joinCode}
                </p>
              </div>
              
              <!-- Join Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin: 35px 0;">
                <tr>
                  <td align="center" style="padding-bottom: 20px;">
                    <a href="${joinLink}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);">
                      Join Class
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Join Link -->
              <div style="margin: 25px 0; padding: 20px; background-color: #f9fafb; border-radius: 8px; border-left: 4px solid #4F46E5;">
                <p style="margin: 0 0 10px 0; color: #6b7280; font-size: 13px; font-weight: 600;">Or use this link:</p>
                <p style="margin: 0; color: #374151; font-size: 12px; word-break: break-all; font-family: monospace; background-color: #ffffff; padding: 12px; border-radius: 4px;">
                  ${joinLink}
                </p>
              </div>
              
              <!-- Instructions -->
              <div style="margin: 30px 0; padding: 20px; background-color: #f0f9ff; border-radius: 8px; border-left: 4px solid #3b82f6;">
                <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">📋 How to Join:</p>
                <ol style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 2;">
                  <li>Click the "Join Class" button above, or</li>
                  <li>Visit the join link, or</li>
                  <li>Enter the join code on the join page</li>
                </ol>
              </div>
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

  // Send email using the email API route
  try {
    const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/email/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: email,
        subject: emailSubject,
        html: emailHtml
      })
    })

    if (!emailResponse.ok) {
      console.warn('Failed to send invitation email via API route')
    }
  } catch (error) {
    console.error('Failed to send invitation email:', error)
    // Don't throw - continue even if email fails
  }
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token)
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Invalid session' },
        { status: 401 }
      )
    }

    const body = await req.json()
    const { name, email, phone, classId, sendInvitation } = body

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: 'Student name is required' },
        { status: 400 }
      )
    }

    if (!email && !phone) {
      return NextResponse.json(
        { error: 'Email or phone is required' },
        { status: 400 }
      )
    }

    if (!classId) {
      return NextResponse.json(
        { error: 'Class ID is required' },
        { status: 400 }
      )
    }

    // Get user's profile to verify role and get org_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .select('role, org_id')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      )
    }

    if (profile.role !== 'Educator' && profile.role !== 'SuperAdmin') {
      return NextResponse.json(
        { error: 'Only educators can add students' },
        { status: 403 }
      )
    }

    if (!profile.org_id) {
      return NextResponse.json(
        { error: 'No organization assigned' },
        { status: 400 }
      )
    }

    // Verify class belongs to educator's org
    const { data: classData, error: classError } = await supabaseAdmin
      .from('classes')
      .select('id, name, org_id')
      .eq('id', classId)
      .single()

    if (classError || !classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (classData.org_id !== profile.org_id) {
      return NextResponse.json(
        { error: 'You do not have access to this class' },
        { status: 403 }
      )
    }

    // Check if student already exists
    let studentUserId: string | null = null
    
    if (email) {
      const { data: existingStudent } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('email', email)
        .eq('role', 'Student')
        .single()
      
      if (existingStudent) {
        studentUserId = existingStudent.user_id
      }
    } else if (phone) {
      const { data: existingStudent } = await supabaseAdmin
        .from('user_profiles')
        .select('user_id')
        .eq('phone', phone)
        .eq('role', 'Student')
        .single()
      
      if (existingStudent) {
        studentUserId = existingStudent.user_id
      }
    }

    // Create auth user if doesn't exist (only if email provided)
    if (!studentUserId && email) {
      try {
        // Create auth user with random password (they'll reset via invitation)
        const randomPassword = Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12) + 'A1!'
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password: randomPassword,
          email_confirm: false, // Will be confirmed via invitation
          user_metadata: {
            name,
            role: 'Student'
          }
        })

        if (authError && !authError.message.includes('already been registered')) {
          throw authError
        }

        if (authData?.user) {
          studentUserId = authData.user.id
        } else if (authError?.message.includes('already been registered')) {
          // User exists, get their ID
          const { data: { users } } = await supabaseAdmin.auth.admin.listUsers()
          const existingUser = users?.find(u => u.email === email)
          if (existingUser) {
            studentUserId = existingUser.id
          }
        }
      } catch (authErr: any) {
        console.error('Error creating auth user:', authErr)
        // Continue - we'll create profile anyway
      }
    }

    // Generate user_id if not exists
    if (!studentUserId) {
      studentUserId = crypto.randomUUID()
    }

    // Create or update user profile
    const { data: studentProfile, error: profileCreateError } = await supabaseAdmin
      .from('user_profiles')
      .upsert({
        user_id: studentUserId,
        email: email || null,
        phone: phone || null,
        full_name: name,
        role: 'Student',
        org_id: profile.org_id,
        onboarding_state: 'pending'
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (profileCreateError) {
      console.error('Error creating profile:', profileCreateError)
      return NextResponse.json(
        { error: 'Failed to create student profile' },
        { status: 500 }
      )
    }

    // Enroll student in class
    const { error: enrollmentError } = await supabaseAdmin
      .from('enrollments')
      .upsert({
        user_id: studentUserId,
        class_id: classId,
        role: 'Student',
        status: 'active'
      }, {
        onConflict: 'user_id,class_id'
      })

    if (enrollmentError) {
      console.error('Error enrolling student:', enrollmentError)
      return NextResponse.json(
        { error: 'Failed to enroll student in class' },
        { status: 500 }
      )
    }

    // Get join code for the class
    let joinCode = null
    let joinLink = null
    
    if (sendInvitation && email) {
      const { data: joinCodes } = await supabaseAdmin
        .from('join_codes')
        .select('code')
        .eq('class_id', classId)
        .eq('type', 'class')
        .eq('revoked', false)
        .limit(1)
        .single()

      if (joinCodes?.code) {
        joinCode = joinCodes.code
        const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
        joinLink = `${appUrl}/join/${joinCode}`
        
        // Send invitation email
        await sendStudentInvitationEmail(
          email,
          name,
          classData.name,
          joinCode,
          joinLink
        )
      }
    }

    return NextResponse.json({
      success: true,
      student: studentProfile,
      enrolled: true,
      invitationSent: sendInvitation && email && joinCode ? true : false
    })
  } catch (error: any) {
    console.error('Error in POST /api/educator/students/add:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

