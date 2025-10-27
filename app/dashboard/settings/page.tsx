'use client'

import { useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Save, Check } from 'lucide-react'

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    systemName: 'Neo Buddy Admin',
    adminEmail: 'admin@neobuddy.com',
    maxUsers: 10000,
    maxSessions: 1000,
    autoArchiveDays: 30,
    theme: 'light',
    language: 'en',
    enableNotifications: true,
    enableAnalytics: true,
    enableLogging: true,
    primaryColor: 'blue',
    fontSize: 'medium',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure system-wide preferences</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">General Settings</h2>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">System Name</label>
              <input
                type="text"
                value={settings.systemName}
                onChange={(e) => setSettings({...settings, systemName: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
              <input
                type="email"
                value={settings.adminEmail}
                onChange={(e) => setSettings({...settings, adminEmail: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Users</label>
                <input
                  type="number"
                  value={settings.maxUsers}
                  onChange={(e) => setSettings({...settings, maxUsers: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Sessions</label>
                <input
                  type="number"
                  value={settings.maxSessions}
                  onChange={(e) => setSettings({...settings, maxSessions: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Auto-archive Days</label>
              <input
                type="number"
                value={settings.autoArchiveDays}
                onChange={(e) => setSettings({...settings, autoArchiveDays: parseInt(e.target.value)})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                <select
                  value={settings.theme}
                  onChange={(e) => setSettings({...settings, theme: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                <select
                  value={settings.language}
                  onChange={(e) => setSettings({...settings, language: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Features & Permissions</h2>
          <div className="space-y-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableNotifications}
                onChange={(e) => setSettings({...settings, enableNotifications: e.target.checked})}
                className="mr-3 h-5 w-5 text-blue-600"
              />
              <span className="text-sm text-gray-700">Enable Notifications</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableAnalytics}
                onChange={(e) => setSettings({...settings, enableAnalytics: e.target.checked})}
                className="mr-3 h-5 w-5 text-blue-600"
              />
              <span className="text-sm text-gray-700">Enable Analytics</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.enableLogging}
                onChange={(e) => setSettings({...settings, enableLogging: e.target.checked})}
                className="mr-3 h-5 w-5 text-blue-600"
              />
              <span className="text-sm text-gray-700">Enable Logging</span>
            </label>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Appearance</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Color</label>
              <div className="flex gap-2">
                {['blue', 'green', 'amber', 'red', 'purple'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings({...settings, primaryColor: color})}
                    className={`w-12 h-12 rounded-md border-2 ${
                      settings.primaryColor === color ? 'border-gray-900' : 'border-gray-300'
                    }`}
                    style={{
                      backgroundColor: color === 'blue' ? '#3B82F6' :
                                     color === 'green' ? '#10B981' :
                                     color === 'amber' ? '#F59E0B' :
                                     color === 'red' ? '#EF4444' : '#8B5CF6'
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
              <select
                value={settings.fontSize}
                onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Saving...
              </>
            ) : saved ? (
              <>
                <Check className="h-5 w-5" />
                Saved!
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

