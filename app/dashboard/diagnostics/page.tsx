'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { Activity, CheckCircle, AlertTriangle, Database, Server } from 'lucide-react'

export default function DiagnosticsPage() {
  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Diagnostics</h1>
          <p className="mt-1 text-sm text-gray-500">Monitor system health and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Database</p>
                <p className="text-2xl font-bold text-gray-900">Online</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <Server className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">API Server</p>
                <p className="text-2xl font-bold text-gray-900">Healthy</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Cache</p>
                <p className="text-2xl font-bold text-gray-900">Warning</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center mb-4">
            <Activity className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">System Health</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">CPU Usage</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">45%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Memory Usage</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-blue-500 h-2 rounded-full" style={{ width: '62%' }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">62%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Disk Usage</span>
              <div className="flex-1 mx-4 bg-gray-200 rounded-full h-2">
                <div className="bg-purple-500 h-2 rounded-full" style={{ width: '38%' }}></div>
              </div>
              <span className="text-sm font-medium text-gray-900">38%</span>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

