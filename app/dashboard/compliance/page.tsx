'use client'

import DashboardLayout from '@/components/DashboardLayout'
import { FileCheck, Shield, Lock, CheckCircle } from 'lucide-react'

export default function CompliancePage() {
  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Compliance & Audit</h1>
          <p className="mt-1 text-sm text-gray-500">Track compliance and audit logs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">GDPR Status</p>
                <p className="text-2xl font-bold text-gray-900">Compliant</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Security Score</p>
                <p className="text-2xl font-bold text-gray-900">A+</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
            <div className="flex items-center">
              <Lock className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Audit Logs</p>
                <p className="text-2xl font-bold text-gray-900">1,234</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <FileCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Compliance Dashboard</h3>
              <p className="text-sm text-gray-500">This section will display compliance reports and audit logs.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

