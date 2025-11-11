import { randomUUID } from 'crypto'

import { supabaseAdmin } from '@/lib/supabase'

export type CredentialMethod = 'magic_link' | 'temp_password' | 'code_only'

interface EnsureAuthUserParams {
  email?: string | null
  phone?: string | null
  name: string
  credentialMethod: CredentialMethod
  manualPassword?: string | null
}

interface CreateStudentAccountParams {
  name: string
  email?: string | null
  phone?: string | null
  studentId?: string | null
  parentEmail?: string | null
  age?: number | null
  classId: string
  className: string
  orgId: string
  createdByUserId: string
  credentialMethod: CredentialMethod
  manualPassword?: string | null
}

export interface CreateStudentAccountResult {
  userId: string
  profile: any
  enrollmentStatus: 'enrolled' | 'pending'
  credentialMethod: CredentialMethod
  temporaryPassword?: string
  invitationSent?: boolean
  joinCode?: string
  joinLink?: string
}

const APP_URL =
  process.env.NEXT_PUBLIC_APP_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  'http://localhost:3001'

function generateTemporaryPassword() {
  const random = () => Math.random().toString(36).slice(-8)
  return `${random()}${random()}A1!`
}

async function ensureAuthUser({
  email,
  phone,
  name,
  credentialMethod,
  manualPassword
}: EnsureAuthUserParams): Promise<{ userId: string; temporaryPassword?: string }> {
  let userId: string | null = null
  let temporaryPassword: string | undefined
  const desiredPassword =
    credentialMethod === 'temp_password'
      ? manualPassword || generateTemporaryPassword()
      : undefined

  // Try to find an existing user profile first
  if (email) {
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .eq('role', 'Student')
      .maybeSingle()

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    }
  }

  if (!userId && phone) {
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('phone', phone)
      .eq('role', 'Student')
      .maybeSingle()

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    }
  }

  if (!userId && email) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: desiredPassword,
      email_confirm: credentialMethod === 'temp_password',
      user_metadata: {
        name,
        role: 'Student'
      }
    })

    if (error && !error.message?.includes('already been registered')) {
      throw error
    }

    if (data?.user?.id) {
      userId = data.user.id
      if (credentialMethod === 'temp_password') {
        temporaryPassword = desiredPassword
      }
    }
  }

  if (!userId && phone) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      phone,
      password: desiredPassword,
      phone_confirm: credentialMethod === 'temp_password',
      user_metadata: {
        name,
        role: 'Student'
      }
    })

    if (error && !error.message?.includes('already been registered')) {
      throw error
    }

    if (data?.user?.id) {
      userId = data.user.id
      if (credentialMethod === 'temp_password') {
        temporaryPassword = desiredPassword
      }
    }
  }

  if (!userId && email) {
    const { data: { users: existingUsers = [] } } =
      await supabaseAdmin.auth.admin.listUsers()

    const match = existingUsers.find((user) => user.email === email)
    if (match) {
      userId = match.id
    }
  }

  if (!userId) {
    userId = randomUUID()
  }

  if (credentialMethod === 'temp_password' && userId) {
    if (!temporaryPassword && desiredPassword) {
      temporaryPassword = desiredPassword
    }

    if (!temporaryPassword) {
      const newPassword = generateTemporaryPassword()
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword
      })
      temporaryPassword = newPassword
    } else if (manualPassword) {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: manualPassword
      })
      temporaryPassword = manualPassword
    }
  }

  return { userId, temporaryPassword }
}

async function ensureClassJoinCode(
  orgId: string,
  classId: string,
  className: string,
  createdByUserId: string
) {
  const { data: existing } = await supabaseAdmin
    .from('join_codes')
    .select('code')
    .eq('class_id', classId)
    .eq('type', 'class')
    .eq('revoked', false)
    .maybeSingle()

  if (existing?.code) {
    return existing.code
  }

  const { data: generatedCode, error: generateError } = await supabaseAdmin.rpc(
    'generate_class_code'
  )

  if (generateError) {
    throw generateError
  }

  const { data: newCode, error: insertError } = await supabaseAdmin
    .from('join_codes')
    .insert({
      org_id: orgId,
      class_id: classId,
      type: 'class',
      code: generatedCode,
      label: `${className} join code`,
      created_by: createdByUserId,
      max_uses: 0
    })
    .select('code')
    .single()

  if (insertError) {
    throw insertError
  }

  return newCode.code
}

export async function createStudentAccount(
  params: CreateStudentAccountParams
): Promise<CreateStudentAccountResult> {
  const {
    name,
    email,
    phone,
    studentId,
    parentEmail,
    age,
    classId,
    className,
    orgId,
    createdByUserId,
    credentialMethod,
    manualPassword
  } = params

  if (!email && !phone) {
    throw new Error('Either email or phone is required to create a student.')
  }

  const { userId, temporaryPassword } = await ensureAuthUser({
    email,
    phone,
    name,
    credentialMethod,
    manualPassword
  })

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert(
      {
        user_id: userId,
        full_name: name,
        email: email || null,
        phone: phone || null,
        role: 'Student',
        org_id: orgId,
        onboarding_state: 'pending',
        student_id: studentId || null,
        parent_email: parentEmail || null,
        age: age ?? null,
        student_metadata: {
          credential_method: credentialMethod,
          created_by: createdByUserId,
          created_at: new Date().toISOString()
        }
      },
      {
        onConflict: 'user_id'
      }
    )
    .select()
    .single()

  if (profileError) {
    throw profileError
  }

  const { error: enrollmentError } = await supabaseAdmin
    .from('enrollments')
    .upsert(
      {
        user_id: userId,
        class_id: classId,
        role: 'Student',
        status: 'active'
      },
      {
        onConflict: 'user_id,class_id'
      }
    )

  if (enrollmentError) {
    throw enrollmentError
  }

  let invitationSent = false
  let finalTemporaryPassword = temporaryPassword

  if (credentialMethod === 'magic_link' && email) {
    try {
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        data: {
          role: 'Student',
          org_id: orgId
        }
      })
      invitationSent = true
    } catch (error) {
      console.error('Failed to send magic link invitation:', error)
    }
  }

  if (credentialMethod === 'temp_password' && !finalTemporaryPassword) {
    if (manualPassword) {
      finalTemporaryPassword = manualPassword
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: manualPassword
        })
      } catch (error) {
        console.error('Failed to set manual password:', error)
      }
    } else {
      finalTemporaryPassword = generateTemporaryPassword()
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: finalTemporaryPassword
        })
      } catch (error) {
        console.error('Failed to update user with temporary password:', error)
      }
    }
  }

  const joinCode = await ensureClassJoinCode(
    orgId,
    classId,
    className,
    createdByUserId
  )
  const joinLink = `${APP_URL}/join/${joinCode}`

  return {
    userId,
    profile,
    enrollmentStatus: 'enrolled',
    credentialMethod,
    temporaryPassword:
      credentialMethod === 'temp_password' ? finalTemporaryPassword : undefined,
    invitationSent,
    joinCode,
    joinLink
  }
}

export async function resendStudentInvite(userId: string) {
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('email, full_name, org_id')
    .eq('user_id', userId)
    .single()

  if (profileError) {
    throw profileError
  }

  if (!profile?.email) {
    throw new Error('Student does not have an email on file.')
  }

  await supabaseAdmin.auth.admin.inviteUserByEmail(profile.email, {
    data: {
      role: 'Student',
      org_id: profile.org_id
    }
  })

  return {
    email: profile.email,
    fullName: profile.full_name
  }
}

export async function resetStudentPassword(userId: string) {
  const temporaryPassword = generateTemporaryPassword()
  await supabaseAdmin.auth.admin.updateUserById(userId, {
    password: temporaryPassword
  })

  const { data: existingMetadata } = await supabaseAdmin
    .from('user_profiles')
    .select('student_metadata')
    .eq('user_id', userId)
    .maybeSingle()

  const rawMetadata = existingMetadata?.student_metadata
  const metadata =
    rawMetadata && typeof rawMetadata === 'object' && !Array.isArray(rawMetadata)
      ? rawMetadata
      : {}

  await supabaseAdmin
    .from('user_profiles')
    .update({
      onboarding_state: 'pending',
      student_metadata: {
        ...metadata,
        credential_method: 'temp_password',
        last_password_reset_at: new Date().toISOString()
      }
    })
    .eq('user_id', userId)

  return { temporaryPassword }
}


