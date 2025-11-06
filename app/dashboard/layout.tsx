'use client'

import { usePathname } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  
  // Don't wrap educator routes with admin layout - they have their own layout
  if (pathname?.startsWith('/dashboard/educator')) {
    return <>{children}</>
  }
  
  return <DashboardLayout>{children}</DashboardLayout>
}

