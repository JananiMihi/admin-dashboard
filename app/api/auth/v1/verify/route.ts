import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl, getAuthRedirectUrl } from '@/lib/utils/url-helper'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to')
  
  // Get Supabase URL from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  
  if (!supabaseUrl) {
    return NextResponse.json(
      { error: 'Supabase URL not configured' },
      { status: 500 }
    )
  }
  
  // Determine the correct redirect URL based on request host
  const requestHost = req.headers.get('host')
  const appUrl = getAppUrl(requestHost)
  
  // If redirectTo is set but points to deployed domain or /login, convert it to verify-educator
  let finalRedirectTo = redirectTo || getAuthRedirectUrl(requestHost)
  
  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo)
      let redirectPath = redirectUrl.pathname
      
      // Convert /login to /auth/verify-educator
      if (redirectPath === '/login' || redirectPath.includes('/login')) {
        redirectPath = '/auth/verify-educator'
      }
      
      // Update pathname and keep the rest, but use the correct domain
      redirectUrl.pathname = redirectPath
      // Ensure redirect uses the same domain as the request
      redirectUrl.host = new URL(appUrl).host
      redirectUrl.protocol = new URL(appUrl).protocol
      finalRedirectTo = redirectUrl.toString()
    } catch (e) {
      // If redirectTo is not a full URL but contains /login, convert it
      if (redirectTo.includes('/login')) {
        finalRedirectTo = getAuthRedirectUrl(requestHost)
      } else if (redirectTo.startsWith('/')) {
        // Relative path - ensure it's verify-educator if it's login
        finalRedirectTo = redirectTo.includes('/login') 
          ? getAuthRedirectUrl(requestHost)
          : `${appUrl}${redirectTo}`
      } else {
        // If URL parsing fails, use the correct domain's verify-educator
        finalRedirectTo = getAuthRedirectUrl(requestHost)
      }
    }
  } else {
    // No redirectTo specified, default to verify-educator on the correct domain
    finalRedirectTo = getAuthRedirectUrl(requestHost)
  }
  
  // Build the Supabase verification URL
  const supabaseVerifyUrl = new URL(`${supabaseUrl}/auth/v1/verify`)
  supabaseVerifyUrl.searchParams.set('token', token || '')
  supabaseVerifyUrl.searchParams.set('type', type || '')
  supabaseVerifyUrl.searchParams.set('redirect_to', finalRedirectTo)
  
  // Redirect to Supabase's verification endpoint
  // Supabase will handle the verification and redirect back to finalRedirectTo
  return NextResponse.redirect(supabaseVerifyUrl.toString())
}

