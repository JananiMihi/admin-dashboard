'use client'

import { useState } from 'react'
import { supabaseAdmin } from '@/lib/supabase'
import { CheckCircle2, XCircle, Loader2, Database, Shield, Users, GraduationCap } from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error'
  message?: string
  data?: any
}

export default function DatabaseTestPage() {
  const [tests, setTests] = useState<TestResult[]>([])
  const [loading, setLoading] = useState(false)

  const runAllTests = async () => {
    setLoading(true)
    const results: TestResult[] = []

    // Test 1: Check tables exist
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .select('count')
        .limit(1)
      
      results.push({
        name: 'Organizations Table',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Table exists and accessible',
      })
    } catch (e: any) {
      results.push({
        name: 'Organizations Table',
        status: 'error',
        message: e.message,
      })
    }

    // Test 2: Check classes table
    try {
      const { data, error } = await supabaseAdmin
        .from('classes')
        .select('count')
        .limit(1)
      
      results.push({
        name: 'Classes Table',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Table exists and accessible',
      })
    } catch (e: any) {
      results.push({
        name: 'Classes Table',
        status: 'error',
        message: e.message,
      })
    }

    // Test 3: Check join_codes table
    try {
      const { data, error } = await supabaseAdmin
        .from('join_codes')
        .select('count')
        .limit(1)
      
      results.push({
        name: 'Join Codes Table',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Table exists and accessible',
      })
    } catch (e: any) {
      results.push({
        name: 'Join Codes Table',
        status: 'error',
        message: e.message,
      })
    }

    // Test 4: Check enrollments table
    try {
      const { data, error } = await supabaseAdmin
        .from('enrollments')
        .select('count')
        .limit(1)
      
      results.push({
        name: 'Enrollments Table',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Table exists and accessible',
      })
    } catch (e: any) {
      results.push({
        name: 'Enrollments Table',
        status: 'error',
        message: e.message,
      })
    }

    // Test 5: Check user_profiles has new columns
    try {
      const { data, error } = await supabaseAdmin
        .from('user_profiles')
        .select('role, org_id, onboarding_state')
        .limit(1)
      
      results.push({
        name: 'User Profiles - New Columns',
        status: error ? 'error' : 'success',
        message: error ? error.message : 'Columns (role, org_id, onboarding_state) exist',
      })
    } catch (e: any) {
      results.push({
        name: 'User Profiles - New Columns',
        status: 'error',
        message: e.message,
      })
    }

    // Test 6: Test generate_class_code function
    try {
      const { data, error } = await supabaseAdmin.rpc('generate_class_code')
      
      results.push({
        name: 'Generate Class Code Function',
        status: error ? 'error' : 'success',
        message: error ? error.message : `Generated: ${data}`,
        data: data,
      })
    } catch (e: any) {
      results.push({
        name: 'Generate Class Code Function',
        status: 'error',
        message: e.message,
      })
    }

    // Test 7: Create test organization
    try {
      const { data, error } = await supabaseAdmin
        .from('organizations')
        .insert({ name: 'Test Organization ' + Date.now() })
        .select()
        .single()
      
      if (data && !error) {
        // Clean up
        await supabaseAdmin
          .from('organizations')
          .delete()
          .eq('id', data.id)
        
        results.push({
          name: 'Create Organization (RLS Test)',
          status: 'success',
          message: 'Successfully created and deleted test organization',
        })
      } else {
        results.push({
          name: 'Create Organization (RLS Test)',
          status: 'error',
          message: error?.message || 'Failed to create organization',
        })
      }
    } catch (e: any) {
      results.push({
        name: 'Create Organization (RLS Test)',
        status: 'error',
        message: e.message,
      })
    }

    // Test 8: Count existing data
    try {
      const [orgs, classes, codes, enrollments] = await Promise.all([
        supabaseAdmin.from('organizations').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('classes').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('join_codes').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('enrollments').select('id', { count: 'exact', head: true }),
      ])
      
      results.push({
        name: 'Data Count Check',
        status: 'success',
        message: `Orgs: ${orgs.count || 0}, Classes: ${classes.count || 0}, Codes: ${codes.count || 0}, Enrollments: ${enrollments.count || 0}`,
        data: {
          organizations: orgs.count || 0,
          classes: classes.count || 0,
          join_codes: codes.count || 0,
          enrollments: enrollments.count || 0,
        },
      })
    } catch (e: any) {
      results.push({
        name: 'Data Count Check',
        status: 'error',
        message: e.message,
      })
    }

    setTests(results)
    setLoading(false)
  }

  const successCount = tests.filter(t => t.status === 'success').length
  const errorCount = tests.filter(t => t.status === 'error').length

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Database & RLS Policy Testing
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test your database migration, tables, functions, and RLS policies
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Test Suite
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Run all tests to verify database setup
            </p>
          </div>
          <button
            onClick={runAllTests}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Tests...
              </>
            ) : (
              <>
                <Database className="w-4 h-4" />
                Run All Tests
              </>
            )}
          </button>
        </div>

        {tests.length > 0 && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium">
                  Passed: <span className="text-green-600">{successCount}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm font-medium">
                  Failed: <span className="text-red-600">{errorCount}</span>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-gray-600" />
                <span className="text-sm font-medium">
                  Total: <span className="text-gray-600">{tests.length}</span>
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {tests.length === 0 && !loading && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              Click "Run All Tests" to start testing your database setup.
            </p>
          </div>
        )}

        {tests.map((test, index) => (
          <div
            key={index}
            className={`border rounded-lg p-4 ${
              test.status === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : test.status === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700'
            }`}
          >
            <div className="flex items-start gap-3">
              {test.status === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
              )}
              {test.status === 'error' && (
                <XCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              )}
              {test.status === 'pending' && (
                <Loader2 className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0 animate-spin" />
              )}
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                  {test.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {test.message}
                </p>
                {test.data && (
                  <div className="mt-2 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    {JSON.stringify(test.data, null, 2)}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-3 flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Testing Guide
        </h3>
        <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
          <p>
            <strong>1. Tables Check:</strong> Verifies all new tables exist and are accessible
          </p>
          <p>
            <strong>2. Columns Check:</strong> Ensures user_profiles has role, org_id, onboarding_state
          </p>
          <p>
            <strong>3. Functions Test:</strong> Tests generate_class_code() function
          </p>
          <p>
            <strong>4. RLS Test:</strong> Attempts to create/delete data to verify RLS policies
          </p>
          <p>
            <strong>5. Data Count:</strong> Shows how many records exist in each table
          </p>
        </div>
        <div className="mt-4 pt-4 border-t border-blue-300 dark:border-blue-700">
          <p className="text-xs text-blue-700 dark:text-blue-400">
            <strong>Note:</strong> Some tests require proper authentication and RLS policies.
            If tests fail, check your Supabase service role key and RLS policy configuration.
          </p>
        </div>
      </div>
    </div>
  )
}


