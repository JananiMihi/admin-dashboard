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

function normalizePhoneNumber(phone?: string | null): string | null {
  if (!phone) return null
  const trimmed = phone.trim()
  if (!trimmed) return null

  let digits = trimmed.replace(/\D/g, '')
  if (!digits) {
    throw new Error('Invalid phone number format. Please enter digits only, e.g. +15551234567.')
  }

  if (digits.startsWith('00')) {
    digits = digits.replace(/^00+/, '')
  }

  // Assume US country code (+1) if a 10 digit local number is provided
  if (digits.length === 10) {
    digits = `1${digits}`
  }

  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Invalid phone number length. Provide 10-15 digits including country code, e.g. +15551234567.')
  }

  return `+${digits}`
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

  // PRIORITY 1: If email is provided, always use email-based authentication
  if (email) {
    // First, check if user exists in our user_profiles table by email
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .eq('role', 'Student')
      .maybeSingle()

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    }

    // If not found in profiles, check Supabase Auth for existing email user
    if (!userId) {
      const { data: { users: existingUsers = [] } } =
        await supabaseAdmin.auth.admin.listUsers()

      const match = existingUsers.find(
        (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
      )
      if (match) {
        userId = match.id
      }
    }

    // If still no userId, create new email-based auth user
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: desiredPassword,
        email_confirm: credentialMethod === 'temp_password',
        user_metadata: {
          name,
          role: 'Student'
        }
      })

      if (error) {
        // If user already exists (e.g., from a previous attempt), try to find it again
        if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
          const { data: { users: existingUsers = [] } } =
            await supabaseAdmin.auth.admin.listUsers()
          const match = existingUsers.find(
            (user) => user.email && user.email.toLowerCase() === email.toLowerCase()
          )
          if (match) {
            userId = match.id
          } else {
            throw new Error(`Email ${email} is already registered but could not be found`)
          }
        } else {
          throw error
        }
      } else if (data?.user?.id) {
        userId = data.user.id
        if (credentialMethod === 'temp_password') {
          temporaryPassword = desiredPassword
        }
      }
    }

    // Update the email user to include phone if phone is provided
    if (userId && phone) {
      try {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          phone,
          phone_confirm: credentialMethod === 'temp_password'
        })
      } catch (error) {
        console.warn('Failed to update user phone number:', error)
        // Don't throw - phone is optional
      }
    }
  }
  // PRIORITY 2: Only use phone if email is NOT provided
  else if (phone) {
    // Check if user exists in our user_profiles table by phone
    const { data: existingProfile } = await supabaseAdmin
      .from('user_profiles')
      .select('user_id')
      .eq('phone', phone)
      .eq('role', 'Student')
      .maybeSingle()

    if (existingProfile?.user_id) {
      userId = existingProfile.user_id
    }

    // If not found in profiles, check Supabase Auth for existing phone user
    if (!userId) {
      const { data: { users: existingUsers = [] } } =
        await supabaseAdmin.auth.admin.listUsers()

      const match = existingUsers.find(
        (user) => user.phone && user.phone === phone
      )
      if (match) {
        userId = match.id
      }
    }

    // If still no userId, create new phone-based auth user (only if no email)
    if (!userId) {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        phone,
        password: desiredPassword,
        phone_confirm: credentialMethod === 'temp_password',
        user_metadata: {
          name,
          role: 'Student'
        }
      })

      if (error) {
        // If user already exists, try to find it again
        if (error.message?.includes('already been registered') || error.message?.includes('already exists')) {
          const { data: { users: existingUsers = [] } } =
            await supabaseAdmin.auth.admin.listUsers()
          const match = existingUsers.find(
            (user) => user.phone && user.phone === phone
          )
          if (match) {
            userId = match.id
          } else {
            throw new Error(`Phone ${phone} is already registered but could not be found`)
          }
        } else {
          throw error
        }
      } else if (data?.user?.id) {
        userId = data.user.id
        if (credentialMethod === 'temp_password') {
          temporaryPassword = desiredPassword
        }
      }
    }
  } else {
    throw new Error('Either email or phone is required to create a student account')
  }

  // Ensure password is set for temp_password method
  if (credentialMethod === 'temp_password' && userId) {
    const passwordToSet = manualPassword || desiredPassword || generateTemporaryPassword()

    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: passwordToSet
      })
      temporaryPassword = passwordToSet
    } catch (error) {
      console.error('Failed to set password for user:', error)
      // If password update fails, still return the password we tried to set
      temporaryPassword = passwordToSet
    }
  }

  if (!userId) {
    throw new Error('Failed to create or find user account')
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

  const normalizedPhone = normalizePhoneNumber(phone)

  const { userId, temporaryPassword } = await ensureAuthUser({
    email,
    phone: normalizedPhone,
    name,
    credentialMethod,
    manualPassword
  })

  // When educators create accounts, always set onboarding_state to 'active'
  // This allows students to log in immediately without being redirected to onboarding
  const onboardingState = 'active'

  const profilePayload = {
    user_id: userId,
    full_name: name,
    email: email || null,
    phone: normalizedPhone,
    role: 'Student',
    org_id: orgId,
    onboarding_state: onboardingState,
    age: age ?? null,
    avatar: 'Avatar01.png' // Default avatar for educator-created accounts
  }

  const { data: profileRecord, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .upsert(profilePayload, {
      onConflict: 'user_id'
    })
    .select()
    .single()

  if (profileError) {
    throw profileError
  }

  let profile = profileRecord

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

  if (credentialMethod === 'temp_password' && finalTemporaryPassword) {
    const timestamp = new Date().toISOString()
    const { data: updatedProfile, error: passwordUpdateError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        last_temporary_password: finalTemporaryPassword,
        last_password_generated_at: timestamp,
        last_password_reset_at: null
        // Don't update onboarding_state here - keep it as 'active' set during account creation
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (passwordUpdateError) {
      throw passwordUpdateError
    }

    profile = updatedProfile || profile
  } else {
    const { data: clearedProfile, error: clearError } = await supabaseAdmin
      .from('user_profiles')
      .update({
        last_temporary_password: null,
        last_password_generated_at: null
      })
      .eq('user_id', userId)
      .select()
      .single()

    if (clearError) {
      throw clearError
    }

    profile = clearedProfile || profile
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

  const timestamp = new Date().toISOString()

  await supabaseAdmin
    .from('user_profiles')
    .update({
      onboarding_state: 'pending',
      last_temporary_password: temporaryPassword,
      last_password_generated_at: timestamp,
      last_password_reset_at: timestamp
    })
    .eq('user_id', userId)

  return { temporaryPassword }
}


