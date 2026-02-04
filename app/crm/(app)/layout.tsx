'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/crm/login')
      return
    }
    if (status === 'authenticated') {
      const role = session?.user?.role
      const tenantId = session?.user?.tenantId
      if (!tenantId || role === 'SUPER_ADMIN') {
        redirect('/crm/login')
      }
    }
  }, [status, session])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Загрузка...</h1>
        </div>
      </div>
    )
  }

  if (!session) return null

  return (
    <DashboardLayout basePath="/crm" area="crm">
      {children}
    </DashboardLayout>
  )
}
