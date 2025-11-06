import { NextRequest, NextResponse } from 'next/server'

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
  
  // Determine the correct redirect URL (use localhost in development)
  const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const isLocalhost = !process.env.NEXT_PUBLIC_APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL
  
  // If redirectTo is set but points to deployed domain or /login, convert it to verify-educator
  let finalRedirectTo = redirectTo || `${appUrl}/auth/verify-educator`
  
  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo)
      let redirectPath = redirectUrl.pathname
      
      // Convert /login to /auth/verify-educator
      if (redirectPath === '/login' || redirectPath.includes('/login')) {
        redirectPath = '/auth/verify-educator'
      }
      
      // If redirect points to deployed domain, convert to localhost
      if (isLocalhost && redirectUrl.host.includes('neo.magicbit.cc')) {
        finalRedirectTo = `${appUrl}${redirectPath}${redirectUrl.search}${redirectUrl.hash}`
      } else {
        // Update pathname and keep the rest
        redirectUrl.pathname = redirectPath
        finalRedirectTo = redirectUrl.toString()
      }
    } catch (e) {
      // If redirectTo is not a full URL but contains /login, convert it
      if (redirectTo.includes('/login')) {
        finalRedirectTo = `${appUrl}/auth/verify-educator`
      } else if (redirectTo.startsWith('/')) {
        // Relative path - ensure it's verify-educator if it's login
        finalRedirectTo = redirectTo.includes('/login') 
          ? `${appUrl}/auth/verify-educator`
          : `${appUrl}${redirectTo}`
      } else {
        // If URL parsing fails, just use localhost verify-educator
        finalRedirectTo = `${appUrl}/auth/verify-educator`
      }
    }
  } else {
    // No redirectTo specified, default to verify-educator
    finalRedirectTo = `${appUrl}/auth/verify-educator`
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

