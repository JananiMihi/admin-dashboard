'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { CheckCircle, Key, Lock, Mail, AlertCircle } from 'lucide-react'

export default function VerifyEducatorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [verifying, setVerifying] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [showResetForm, setShowResetForm] = useState(false)

  useEffect(() => {
      // Only redirect to localhost in development mode
      // In production, both domains (neo.magicbit.cc and neoadmin.magicbit.cc) are supported
      if (typeof window !== 'undefined') {
        const currentHost = window.location.host
        const isLocalhost = currentHost.includes('localhost') || currentHost.includes('127.0.0.1')
        const isDeployedDomain = currentHost.includes('neo.magicbit.cc') || currentHost.includes('neoadmin.magicbit.cc')
        
        // Only redirect if we're in development and somehow got a deployed domain URL
        // This should not happen in production, but helps with local development testing
        if (isLocalhost && isDeployedDomain) {
          // This case shouldn't happen, but handle it gracefully
          console.warn('Unexpected: localhost detected deployed domain in URL')
        }
        
        // No redirect needed in production - both domains are supported
      }
    
    // Handle Supabase auth callback
    // Supabase auth links can come via hash (client-side redirect) or query params (direct Supabase verify URL)
    const handleAuthCallback = async () => {
      // Check URL hash first (for client-side redirects from Supabase)
      const hash = window.location.hash
      // Check query parameters (for direct Supabase verify URLs)
      const tokenFromQuery = searchParams.get('token')
      const typeFromQuery = searchParams.get('type')
      
      // If we have a direct Supabase verify URL with token in query params
      if (tokenFromQuery && (typeFromQuery === 'recovery' || typeFromQuery === 'invite')) {
        // Try to exchange the token for a session using Supabase's verifyOtp
        try {
          const { data: verifyData, error: verifyError } = await supabaseAdmin.auth.verifyOtp({
            token_hash: tokenFromQuery,
            type: typeFromQuery as 'recovery' | 'invite'
          })
          
          if (!verifyError && verifyData.user) {
            setEmail(verifyData.user.email || '')
            setLoading(false)
            return
          } else if (verifyError) {
            console.error('OTP verification error:', verifyError)
            // Redirect through our local proxy route which will handle Supabase verification
            const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin
            const redirectUrl = `${baseUrl}/auth/verify-educator`
            const localVerifyUrl = `/api/auth/v1/verify?token=${tokenFromQuery}&type=${typeFromQuery}&redirect_to=${encodeURIComponent(redirectUrl)}`
            window.location.href = localVerifyUrl
            return
          }
        } catch (otpError) {
          console.error('OTP verification error:', otpError)
          // Redirect through our local proxy route which will handle Supabase verification
          const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin
          const redirectUrl = `${baseUrl}/auth/verify-educator`
          const localVerifyUrl = `/api/auth/v1/verify?token=${tokenFromQuery}&type=${typeFromQuery}&redirect_to=${encodeURIComponent(redirectUrl)}`
          window.location.href = localVerifyUrl
          return
        }
      }
      
      // Handle hash-based auth (client-side redirect)
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')
        const type = hashParams.get('type')
        const error = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')
        
        // If there's an error in the hash (like OTP expired), show helpful message
        if (error) {
          console.error('Supabase auth error:', error, errorDescription)
          setError(errorDescription || 'The verification link is invalid or has expired. Please request a new invitation link from your administrator.')
          setLoading(false)
          return
        }
        
        if (accessToken && refreshToken && (type === 'invite' || type === 'recovery')) {
          setToken(accessToken)
          
          // Set session using tokens
          const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })
          
          if (sessionError) {
            console.error('Session error:', sessionError)
            setError('Invalid or expired verification link. Please contact your administrator.')
            setLoading(false)
            return
          }
          
          if (sessionData.session) {
            setEmail(sessionData.session.user.email || '')
            
            // Check if user is an educator and if they already have a password set
            // For recovery/invite links, they need to set password first
            // But if they already logged in via OAuth or have password, redirect to educator dashboard
            try {
              const { data: profile } = await supabaseAdmin
                .from('user_profiles')
                .select('role')
                .eq('user_id', sessionData.session.user.id)
                .single()
              
              // If educator and this is a recovery link (password reset), show password form
              // If this is an invite link (new user), show password form
              // Otherwise, if they have a session, they might already have password set
              if (profile?.role === 'Educator' && (type === 'recovery' || type === 'invite')) {
                // Show password setup form
                setLoading(false)
                return
              } else if (profile?.role === 'Educator') {
                // Already has password, redirect to educator dashboard
                router.push('/dashboard/educator')
                return
              }
            } catch (profileError) {
              console.error('Profile check error:', profileError)
              // Continue to show password form
            }
            
            setLoading(false)
            return
          } else {
            setError('Failed to verify account. Please contact your administrator.')
            setLoading(false)
            return
          }
        }
      }
      
      // Check if already logged in
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      if (session) {
        setEmail(session.user.email || '')
        
        // Check if user is an educator and needs to set password
        try {
          const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('role')
            .eq('user_id', session.user.id)
            .single()
          
          if (profile?.role === 'Educator') {
            // Check if user already has a password set (by checking if they can sign in with password)
            // For now, just show the password form - they can set or update their password
            setLoading(false)
            return
          } else {
            // Not an educator, redirect to appropriate dashboard
            router.push('/dashboard')
            return
          }
        } catch (profileError) {
          console.error('Profile check error:', profileError)
          // Continue to show password form
        }
        
        setLoading(false)
      } else {
        // No session and no verification tokens - show helpful message instead of error
        setError('Please use the verification link from your email to set up your password. If you don\'t have a verification link, please contact your administrator or use the "Need to reset your password?" option below.')
        setLoading(false)
      }
    }
    
    handleAuthCallback()
  }, [searchParams])


  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setVerifying(true)

    // Validate password
    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      setVerifying(false)
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setVerifying(false)
      return
    }

    try {
      // Get current session
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      
      if (!session) {
        setError('You need to be logged in to set your password. Please use the verification link from your email, or use the "Need to reset your password?" option below.')
        setVerifying(false)
        setShowResetForm(true) // Show reset form
        return
      }

      // Update password
      const { error: updateError } = await supabaseAdmin.auth.updateUser({
        password: password
      })

      if (updateError) throw updateError

      setSuccess(true)
      setVerifying(false)
      
      // Verify user role before redirecting
      try {
        const { data: profile } = await supabaseAdmin
          .from('user_profiles')
          .select('role')
          .eq('user_id', session.user.id)
          .single()
        
        // Always redirect educators to educator dashboard, not admin dashboard
        if (profile?.role === 'Educator') {
          // Redirect immediately to educator dashboard
          router.push('/dashboard/educator')
        } else {
          // For other roles, redirect to main dashboard
          router.push('/dashboard')
        }
      } catch (profileError) {
        // If profile check fails, still redirect to educator dashboard as default
        console.error('Profile check error:', profileError)
        router.push('/dashboard/educator')
      }
    } catch (err: any) {
      console.error('Set password error:', err)
      setError(err.message || 'Failed to set password. Please try again.')
      setVerifying(false)
    }
  }

  const handleResetPassword = async () => {
    if (!email) {
      setError('Email is required for password reset')
      return
    }

    setResetting(true)
    setError('')

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || window.location.origin
      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
        redirectTo: `${baseUrl}/auth/verify-educator`
      })

      if (resetError) throw resetError

      setSuccess(true)
      setError('Password reset link has been sent to your email. Please check your inbox.')
      setShowResetForm(false)
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError(err.message || 'Failed to send reset link. Please try again.')
    } finally {
      setResetting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your account...</p>
        </div>
      </div>
    )
  }

  if (success && !showResetForm) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account Verified Successfully!</h2>
          <p className="text-gray-600 mb-4">Your account has been verified and your password has been set.</p>
          <p className="text-sm text-gray-500 mb-6">Redirecting to your dashboard...</p>
          <button
            onClick={() => router.push('/dashboard/educator')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Set Up Your Educator Account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your password to complete your account setup
          </p>
        </div>

        {error && (
          <div className={`rounded-lg p-4 flex items-start gap-3 ${
            error.includes('Please use the verification link') 
              ? 'bg-blue-50 border border-blue-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              error.includes('Please use the verification link') 
                ? 'text-blue-600' 
                : 'text-red-600'
            }`} />
            <div className="flex-1">
              <p className={`text-sm ${
                error.includes('Please use the verification link') 
                  ? 'text-blue-800' 
                  : 'text-red-800'
              }`}>{error}</p>
            </div>
          </div>
        )}

        {!showResetForm ? (
          <form className="mt-8 space-y-6 bg-white rounded-lg shadow p-6" onSubmit={handleSetPassword}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password (min. 8 characters)"
                  minLength={8}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Password must be at least 8 characters long</p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Confirm your password"
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={verifying}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {verifying ? 'Setting Password...' : 'Set Password & Verify Account'}
              </button>
            </div>

            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setShowResetForm(true)}
                className="text-sm text-blue-600 hover:text-blue-500 block w-full"
              >
                Need to reset your password?
              </button>
              <p className="text-sm text-gray-600">
                Already have a password?{' '}
                <button
                  type="button"
                  onClick={() => router.push('/auth/educator-login')}
                  className="font-medium text-blue-600 hover:text-blue-500"
                >
                  Login here
                </button>
              </p>
            </div>
          </form>
        ) : (
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reset Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll send a password reset link to your email address.
            </p>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <input
                  id="resetEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleResetPassword}
                  disabled={resetting || !email}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resetting ? 'Sending...' : 'Send Reset Link'}
                </button>
                <button
                  onClick={() => {
                    setShowResetForm(false)
                    setError('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

