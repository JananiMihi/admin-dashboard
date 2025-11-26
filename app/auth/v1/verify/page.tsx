'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

export default function SupabaseVerifyProxy() {
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Get all query parameters
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const redirectTo = searchParams.get('redirect_to')
    
    // Determine the default redirect URL based on current origin
    const getDefaultRedirect = () => {
      if (typeof window === 'undefined') return '/auth/verify-educator'
      const origin = window.location.origin
      return `${origin}/auth/verify-educator`
    }
    
    // Build the proxy URL
    const proxyUrl = new URL('/api/auth/v1/verify', window.location.origin)
    if (token) proxyUrl.searchParams.set('token', token)
    if (type) proxyUrl.searchParams.set('type', type)
    if (redirectTo) {
      proxyUrl.searchParams.set('redirect_to', redirectTo)
    } else {
      // Default redirect to verify-educator on the current domain
      proxyUrl.searchParams.set('redirect_to', getDefaultRedirect())
    }
    
    // Redirect to the proxy API route
    window.location.replace(proxyUrl.toString())
  }, [searchParams])
  
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'system-ui'
    }}>
      <p>Redirecting to verification...</p>
    </div>
  )
}

