'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

function AuthErrorContent() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const errorMessages: Record<string, string> = {
    Configuration: 'Проблема с конфигурацией сервера. Проверьте настройки.',
    AccessDenied: 'Доступ запрещен',
    Verification: 'Ошибка верификации. Проверьте данные для входа.',
    CredentialsSignin: 'Неверный email или пароль',
    Default: 'Произошла ошибка при входе',
  }

  const errorMessage = error ? errorMessages[error] || errorMessages.Default : errorMessages.Default

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 max-w-md w-full mx-4"
      >
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4"
          >
            <AlertCircle className="w-8 h-8 text-red-600" />
          </motion.div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">Ошибка входа</h1>
          <p className="text-gray-600 mb-4">{errorMessage}</p>

          {error && (
            <div className="mb-6 p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">Код ошибки:</p>
              <p className="text-sm font-mono text-gray-700">{error}</p>
            </div>
          )}

          <div className="mb-6 p-4 bg-blue-50 rounded-lg text-left">
            <p className="text-sm font-semibold text-blue-900 mb-2">Тестовые данные для входа:</p>
            <p className="text-xs text-blue-700">Email: admin@test.com</p>
            <p className="text-xs text-blue-700">Пароль: admin123</p>
          </div>

          <Link href="/login">
            <Button variant="gradient" className="w-full">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Вернуться к входу
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10 max-w-md w-full mx-4">
            <p className="text-gray-600">Загрузка...</p>
          </div>
        </div>
      }
    >
      <AuthErrorContent />
    </Suspense>
  )
}
