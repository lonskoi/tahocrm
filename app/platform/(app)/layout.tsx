'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/platform/login')
      return
    }
    if (status === 'authenticated') {
      const role = session?.user?.role
      if (role !== 'SUPER_ADMIN') {
        redirect('/platform/login')
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
    <DashboardLayout basePath="/platform" area="platform">
      {children}
    </DashboardLayout>
  )
}
