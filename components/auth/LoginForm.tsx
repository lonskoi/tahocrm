'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, Lock, Sparkles } from 'lucide-react'
import { loginSchema } from '@/lib/validation/schemas'

type Props = {
  title: string
  subtitle?: string
  defaultEmail: string
  defaultPassword: string
  tenantId?: string
  successRedirectTo: string
}

export function LoginForm({
  title,
  subtitle,
  defaultEmail,
  defaultPassword,
  tenantId,
  successRedirectTo,
}: Props) {
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState(defaultPassword)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const validationResult = loginSchema.safeParse({ email, password })
    if (!validationResult.success) {
      const errors: Record<string, string> = {}
      validationResult.error.issues.forEach(err => {
        const field = err.path[0]
        if (field && typeof field === 'string') {
          errors[field] = err.message
        }
      })
      setFieldErrors(errors)
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        ...(tenantId ? { tenantId } : {}),
        redirect: false,
        callbackUrl: successRedirectTo,
      })

      if (result?.error) {
        setError('Неверный email или пароль')
        setLoading(false)
      } else if (result?.ok) {
        // A hard redirect is more reliable in production than client routing here:
        // we want to guarantee leaving the login page once the session cookie is set.
        // Note: `result.url` is not always reliable in production and may point back to the login page.
        // Prefer the explicit success redirect target provided by the page.
        const to = successRedirectTo
        setLoading(false)
        window.location.assign(to)
      } else {
        setError('Произошла ошибка при входе')
        setLoading(false)
      }
    } catch {
      setError('Произошла ошибка при входе')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 md:p-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              {title}
            </h1>
            {subtitle ? <p className="text-gray-600 text-sm">{subtitle}</p> : null}
          </motion.div>

          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl text-sm font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Input
                id="email"
                type="email"
                label="Email"
                value={email}
                onChange={e => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: '' })
                }}
                required
                placeholder="admin@test.com"
                icon={<Mail className="w-5 h-5" />}
                {...(fieldErrors.email ? { error: fieldErrors.email } : {})}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Input
                id="password"
                type="password"
                label="Пароль"
                value={password}
                onChange={e => {
                  setPassword(e.target.value)
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: '' })
                }}
                required
                placeholder="••••••••"
                icon={<Lock className="w-5 h-5" />}
                {...(fieldErrors.password ? { error: fieldErrors.password } : {})}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Button
                type="submit"
                className="w-full"
                variant="gradient"
                isLoading={loading}
                size="lg"
              >
                Войти
              </Button>
            </motion.div>
          </form>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-6 text-center text-xs text-gray-500"
          >
            © 2024 tahoCRM. Все права защищены.
          </motion.p>
        </div>
      </motion.div>
    </div>
  )
}
