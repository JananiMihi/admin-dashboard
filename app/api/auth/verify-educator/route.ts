import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to')
  
  // Determine if we should use localhost (development mode)
  const appUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  const isLocalhost = !process.env.NEXT_PUBLIC_APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL
  
  // If we're in localhost mode and the request came from deployed domain, redirect to localhost
  if (isLocalhost) {
    const host = req.headers.get('host') || ''
    if (host.includes('neo.magicbit.cc')) {
      // Redirect to localhost with all parameters preserved
      const localhostUrl = new URL(`http://localhost:3001/auth/verify-educator`)
      
      // Copy all query parameters
      searchParams.forEach((value, key) => {
        localhostUrl.searchParams.set(key, value)
      })
      
      // Also check for hash parameters (from URL fragment)
      const url = new URL(req.url)
      if (url.hash) {
        // Hash parameters are client-side only, but we can redirect to the page
        // The client-side code will handle the hash
        return NextResponse.redirect(localhostUrl.toString() + url.hash)
      }
      
      return NextResponse.redirect(localhostUrl.toString())
    }
  }
  
  // If we have a token and type, redirect to verify-educator page with the token
  if (token && type) {
    const verifyUrl = new URL(`${appUrl}/auth/verify-educator`)
    verifyUrl.searchParams.set('token', token)
    verifyUrl.searchParams.set('type', type)
    if (redirectTo) {
      verifyUrl.searchParams.set('redirect_to', redirectTo)
    }
    
    return NextResponse.redirect(verifyUrl.toString())
  }
  
  // If no token, redirect to verify-educator page
  return NextResponse.redirect(`${appUrl}/auth/verify-educator`)
}

