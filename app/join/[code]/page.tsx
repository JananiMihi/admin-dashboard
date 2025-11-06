'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase'
import { CheckCircle, XCircle, Loader2, GraduationCap } from 'lucide-react'

export default function JoinPage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth_required'>('loading')
  const [message, setMessage] = useState('')
  const [classInfo, setClassInfo] = useState<any>(null)

  useEffect(() => {
    if (code) {
      handleJoin()
    }
  }, [code])

  const handleJoin = async () => {
    try {
      setLoading(true)
      setStatus('loading')

      // Check if user is authenticated
      const { data: { session } } = await supabaseAdmin.auth.getSession()
      
      if (!session) {
        // User not logged in - redirect to login with return URL
        setStatus('auth_required')
        setMessage('Please log in to join this class')
        
        // Redirect to login with return URL
        const returnUrl = encodeURIComponent(`/join/${code}`)
        router.push(`/auth/educator-login?redirect=${returnUrl}`)
        return
      }

      // Validate join code using API route (bypasses RLS)
      const validateResponse = await fetch(`/api/join/validate?code=${encodeURIComponent(code)}`)
      const validateResult = await validateResponse.json()

      if (!validateResponse.ok || !validateResult.valid) {
        setStatus('error')
        setMessage(validateResult.error || 'Invalid join code. Please check the code and try again.')
        setLoading(false)
        return
      }

      const codeData = validateResult.code
      setClassInfo(validateResult.class)

      // Redeem the code using the database function
      const { data: redeemResult, error: redeemError } = await supabaseAdmin.rpc('redeem_join_code', {
        p_code: code
      })

      if (redeemError) {
        console.error('Redeem error:', redeemError)
        setStatus('error')
        setMessage(redeemError.message || 'Failed to join class. Please try again.')
        setLoading(false)
        return
      }

      if (redeemResult?.status === 'error') {
        setStatus('error')
        setMessage(redeemResult.message || 'Failed to join class.')
        setLoading(false)
        return
      }

      if (redeemResult?.status === 'ok') {
        setStatus('success')
        setMessage('Successfully joined the class!')
        
        // Redirect to class page after 2 seconds
        setTimeout(() => {
          if (redeemResult.class_id) {
            router.push(`/dashboard/educator/classes/${redeemResult.class_id}`)
          } else {
            router.push('/dashboard/educator/classes')
          }
        }, 2000)
      } else {
        setStatus('error')
        setMessage('Unexpected error occurred.')
      }
    } catch (error: any) {
      console.error('Error joining class:', error)
      setStatus('error')
      setMessage(error.message || 'An error occurred while joining the class.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-2xl p-8 text-center">
        {status === 'loading' && (
          <>
            <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Joining Class...</h2>
            <p className="text-gray-600">Please wait while we process your request</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Successfully Joined!</h2>
            {classInfo && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">You've joined:</p>
                <p className="text-lg font-semibold text-gray-900">{classInfo.name}</p>
                {classInfo.subject && (
                  <p className="text-sm text-gray-600">{classInfo.subject}</p>
                )}
              </div>
            )}
            <p className="text-gray-600 mb-4">{message}</p>
            <p className="text-sm text-gray-500">Redirecting to class page...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Join</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <button
              onClick={() => router.push('/dashboard/educator/classes')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Classes
            </button>
          </>
        )}

        {status === 'auth_required' && (
          <>
            <div className="mx-auto w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mb-4">
              <GraduationCap className="w-8 h-8 text-yellow-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-4">Redirecting to login page...</p>
            <button
              onClick={() => router.push('/auth/educator-login')}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  )
}

