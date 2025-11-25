import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(_req: NextRequest) {
  try {
    // Try to fetch all columns first to see what's available
    const { data: missions, error } = await supabaseAdmin
      .from('missions')
      .select('*')
      .order('order_no', { ascending: true, nullsLast: true })

    if (error) {
      console.error('Error fetching missions:', error)
      throw error
    }

    // Map the data to ensure we have mission_uid and title
    const mappedMissions = (missions || []).map((mission: any) => {
      // Try to get title from mission_data if not in main table
      let title = mission.title
      if (!title && mission.mission_data) {
        try {
          const missionData = typeof mission.mission_data === 'string' 
            ? JSON.parse(mission.mission_data) 
            : mission.mission_data
          title = missionData?.title || 'Untitled Mission'
        } catch {
          title = 'Untitled Mission'
        }
      }
      
      return {
        mission_uid: mission.mission_uid || mission.id,
        title: title || 'Untitled Mission',
        order_no: mission.order_no
      }
    }).filter((m: any) => m.mission_uid) // Only include missions with mission_uid

    return NextResponse.json({ missions: mappedMissions })
  } catch (error: any) {
    console.error('Error in missions API:', error)
    return NextResponse.json(
      { error: error?.message || 'Unable to fetch missions.' },
      { status: 500 }
    )
  }
}

