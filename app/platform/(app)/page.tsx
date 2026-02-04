'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function PlatformHome() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/platform/login')
      return
    }
    if (status === 'authenticated' && session) {
      if (session.user.role !== 'SUPER_ADMIN') {
        redirect('/platform/login')
        return
      }
      redirect('/platform/tenants')
    }
  }, [status, session])

  return null
}
