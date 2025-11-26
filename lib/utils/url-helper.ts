/**
 * Utility functions for handling multi-domain URL configuration
 * Supports both learning platform (neo.magicbit.cc) and admin dashboard (neoadmin.magicbit.cc)
 */

/**
 * Determines the app URL based on the request host or environment variables
 * Priority:
 * 1. Request host (for server-side requests)
 * 2. Environment variable (NEXT_PUBLIC_APP_BASE_URL or NEXT_PUBLIC_APP_URL)
 * 3. Default to localhost for development
 */
export function getAppUrl(requestHost?: string | null): string {
  // If we have a request host, use it to determine the URL
  if (requestHost) {
    // Admin dashboard domain
    if (requestHost.includes('neoadmin.magicbit.cc')) {
      return 'https://neoadmin.magicbit.cc'
    }
    // Learning platform domain
    if (requestHost.includes('neo.magicbit.cc')) {
      return 'https://neo.magicbit.cc'
    }
    // Localhost development
    if (requestHost.includes('localhost') || requestHost.includes('127.0.0.1')) {
      return process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
    }
  }

  // Fall back to environment variables
  const envUrl = process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL
  
  if (envUrl) {
    return envUrl
  }

  // Default to localhost for development
  return process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
}

/**
 * Determines the app URL on the client side based on window.location
 */
export function getClientAppUrl(): string {
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'
  }

  const host = window.location.host
  const protocol = window.location.protocol

  // Admin dashboard domain
  if (host.includes('neoadmin.magicbit.cc')) {
    return `${protocol}//neoadmin.magicbit.cc`
  }
  
  // Learning platform domain
  if (host.includes('neo.magicbit.cc')) {
    return `${protocol}//neo.magicbit.cc`
  }

  // Localhost development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    return `${protocol}//${host}`
  }

  // Fallback: use current origin
  return window.location.origin
}

/**
 * Checks if we're in development mode (localhost)
 */
export function isDevelopmentMode(requestHost?: string | null): boolean {
  if (requestHost) {
    return requestHost.includes('localhost') || requestHost.includes('127.0.0.1')
  }

  if (typeof window !== 'undefined') {
    const host = window.location.host
    return host.includes('localhost') || host.includes('127.0.0.1')
  }

  // If no environment URL is set, assume development
  return !process.env.NEXT_PUBLIC_APP_BASE_URL && !process.env.NEXT_PUBLIC_APP_URL
}

/**
 * Gets the appropriate redirect URL for authentication
 * This ensures redirects go to the correct domain
 */
export function getAuthRedirectUrl(requestHost?: string | null, path: string = '/auth/verify-educator'): string {
  const baseUrl = getAppUrl(requestHost)
  return `${baseUrl}${path}`
}


