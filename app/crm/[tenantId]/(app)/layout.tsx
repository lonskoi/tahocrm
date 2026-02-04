'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function TenantCrmLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const params = useParams<{ tenantId: string }>()
  const router = useRouter()
  const tenantId = params?.tenantId

  useEffect(() => {
    if (!tenantId) return

    if (status === 'unauthenticated') {
      router.replace(`/crm/${tenantId}/login`)
      return
    }

    if (status === 'authenticated') {
      const role = session?.user?.role
      const sessionTenantId = session?.user?.tenantId

      if (!sessionTenantId || role === 'SUPER_ADMIN') {
        router.replace(`/crm/${tenantId}/login`)
        return
      }

      if (sessionTenantId !== tenantId) {
        router.replace(`/crm/${sessionTenantId}`)
      }
    }
  }, [status, session, tenantId, router])

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold">Загрузка...</h1>
        </div>
      </div>
    )
  }

  if (!session || !tenantId) return null

  return (
    <DashboardLayout basePath={`/crm/${tenantId}`} area="crm">
      {children}
    </DashboardLayout>
  )
}
