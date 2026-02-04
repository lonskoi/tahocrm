'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function CrmHome() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/crm/login')
      return
    }
    if (status === 'authenticated' && session) {
      const tenantId = session.user.tenantId
      if (tenantId) {
        redirect(`/crm/${tenantId}`)
        return
      }
      const role = session.user.role
      if (role === 'SUPER_ADMIN') {
        redirect('/platform')
        return
      }
      if (role === 'MANAGER') redirect('/crm/manager')
      else if (role === 'MASTER') redirect('/crm/master')
      else if (role === 'CARD_SPECIALIST') redirect('/crm/card-specialist')
      else if (role === 'DIRECTOR') redirect('/crm/director')
      else if (role === 'CLIENT') redirect('/crm/client')
      else redirect('/crm')
    }
  }, [status, session])

  return null
}
