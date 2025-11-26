import { NextRequest, NextResponse } from 'next/server'
import { getAppUrl, getAuthRedirectUrl, isDevelopmentMode } from '@/lib/utils/url-helper'

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams
  const token = searchParams.get('token')
  const type = searchParams.get('type')
  const redirectTo = searchParams.get('redirect_to')
  
  // Get the request host to determine the correct app URL
  const requestHost = req.headers.get('host')
  const appUrl = getAppUrl(requestHost)
  const isDev = isDevelopmentMode(requestHost)
  
  // If we're in localhost mode and the request came from deployed domain, redirect to localhost
  // This is for development purposes only
  if (isDev && requestHost && (requestHost.includes('neo.magicbit.cc') || requestHost.includes('neoadmin.magicbit.cc'))) {
    // Redirect to localhost with all parameters preserved
    const baseUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    const localhostUrl = new URL(`${baseUrl}/auth/verify-educator`)
    
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
  
  // If we have a token and type, redirect to verify-educator page with the token
  if (token && type) {
    const verifyUrl = new URL(getAuthRedirectUrl(requestHost))
    verifyUrl.searchParams.set('token', token)
    verifyUrl.searchParams.set('type', type)
    if (redirectTo) {
      verifyUrl.searchParams.set('redirect_to', redirectTo)
    }
    
    return NextResponse.redirect(verifyUrl.toString())
  }
  
  // If no token, redirect to verify-educator page on the correct domain
  return NextResponse.redirect(getAuthRedirectUrl(requestHost))
}

