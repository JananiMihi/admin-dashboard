import { createClient } from '@supabase/supabase-js'

// Replace these with your actual Supabase credentials
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ylukbxkoijoaiuigoswk.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdWtieGtvaWpvYWl1aWdvc3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5MjQ0MDksImV4cCI6MjA3NTUwMDQwOX0.cBqoyppyFuxaM1ZFi2A6bBwkxwDV1JKf2BwtwHL5f_4'
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsdWtieGtvaWpvYWl1aWdvc3drIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTkyNDQwOSwiZXhwIjoyMDc1NTAwNDA5fQ.uGOReUybiQFFieIY94HYoWRVFcEk7DRRuBcsf28VuXI'

// Client for public operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client with service role key
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Database types
export interface User {
  id: string
  email: string
  name?: string
  age?: number
  avatar?: string
  phone?: string
  created_at: string
  verified: boolean
  provider: string
}

export interface Mission {
  id: string
  title: string
  description: string
  order: number
  xp_reward: number
  unlocked: boolean
  difficulty: string
  estimated_time: number
  created_at: string
}

export interface UserProgress {
  id: string
  user_id: string
  mission_id: string
  completed: boolean
  completed_at?: string
  time_spent?: number
  xp_earned: number
  created_at: string
}

export interface UserProfile {
  id: string
  user_id: string
  total_xp: number
  level: number
  badges: string[]
  current_mission_id?: string
  created_at: string
  updated_at?: string
}

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  xp_required: number
  created_at: string
}
