'use client'

import { useSession } from 'next-auth/react'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

export default function Home() {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/login')
    } else if (status === 'authenticated' && session) {
      const role = session?.user?.role
      if (role === 'SUPER_ADMIN') {
        redirect('/platform')
      } else {
        redirect('/crm')
      }
    }
  }, [status, session])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Загрузка...</h1>
        <p className="text-gray-600">Подготовка рабочего пространства</p>
      </motion.div>
    </div>
  )
}
