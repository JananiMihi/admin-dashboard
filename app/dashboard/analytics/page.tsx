'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { supabaseAdmin } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { TrendingUp, Users, Target, Award } from 'lucide-react'

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>({})
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      // Fetch users for demographic data
      const { data: users, error: usersError } = await supabaseAdmin
        .from('users')
        .select('*')

      if (usersError) throw usersError

      // Fetch progress data
      const { data: progress, error: progressError } = await supabaseAdmin
        .from('user_progress')
        .select('*')

      if (progressError) throw progressError

      // Fetch missions
      const { data: missions, error: missionsError } = await supabaseAdmin
        .from('missions')
        .select('*')

      if (missionsError) throw missionsError

      // Calculate analytics
      const ageGroups = users?.reduce((acc: any, user: any) => {
        const age = user.age || 0
        if (age < 13) acc['< 13'] = (acc['< 13'] || 0) + 1
        else if (age < 18) acc['13-17'] = (acc['13-17'] || 0) + 1
        else if (age < 25) acc['18-24'] = (acc['18-24'] || 0) + 1
        else acc['25+'] = (acc['25+'] || 0) + 1
        return acc
      }, {})

      // Mission completion data
      const missionStats = missions?.map((mission: any) => {
        const completed = progress?.filter((p: any) => p.mission_id === mission.id && p.completed).length || 0
        return {
          name: mission.title,
          completed,
          total: users?.length || 0
        }
      })

      setChartData(missionStats || [])
      setAnalytics({
        totalUsers: users?.length || 0,
        totalMissions: missions?.length || 0,
        completedMissions: progress?.filter((p: any) => p.completed).length || 0,
        ageGroups,
      })
    } catch (error: any) {
      console.error('Error fetching analytics:', error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">Comprehensive insights into student engagement</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalUsers || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Missions</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.totalMissions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{analytics.completedMissions || 0}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Award className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics.totalMissions > 0 
                    ? Math.round((analytics.completedMissions / analytics.totalMissions) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Age Demographics */}
        {analytics.ageGroups && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Age Demographics</h2>
            <div className="grid grid-cols-4 gap-4">
              {Object.entries(analytics.ageGroups).map(([age, count]: [string, any]) => (
                <div key={age} className="text-center">
                  <p className="text-3xl font-bold text-blue-600">{count}</p>
                  <p className="text-sm text-gray-500">{age} years</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mission Completion Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Mission Completion Rates</h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="completed" fill="#3b82f6" name="Completed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  )
}

