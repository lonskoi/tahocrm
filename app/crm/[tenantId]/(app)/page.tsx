'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useParams, useRouter } from 'next/navigation'

export default function TenantCrmHome() {
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

    if (status === 'authenticated' && session) {
      const role = session.user.role
      const sessionTenantId = session.user.tenantId

      if (role === 'SUPER_ADMIN') {
        router.replace('/platform')
        return
      }

      if (!sessionTenantId) {
        router.replace(`/crm/${tenantId}/login`)
        return
      }

      if (sessionTenantId !== tenantId) {
        router.replace(`/crm/${sessionTenantId}`)
        return
      }

      if (role === 'TENANT_ADMIN') router.replace(`/crm/${tenantId}/director`)
      else if (role === 'MANAGER') router.replace(`/crm/${tenantId}/manager`)
      else if (role === 'MASTER') router.replace(`/crm/${tenantId}/master`)
      else if (role === 'CARD_SPECIALIST') router.replace(`/crm/${tenantId}/card-specialist`)
      else if (role === 'DIRECTOR') router.replace(`/crm/${tenantId}/director`)
      else if (role === 'CLIENT') router.replace(`/crm/${tenantId}/client`)
      else router.replace(`/crm/${tenantId}`)
    }
  }, [status, session, tenantId, router])

  return null
}
