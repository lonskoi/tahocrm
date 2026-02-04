import { LoginForm } from '@/components/auth/LoginForm'

export default function PlatformLoginPage() {
  return (
    <LoginForm
      title="tahoCRM Platform"
      subtitle="Вход в мега‑админку"
      defaultEmail="admin@test.com"
      defaultPassword="admin123"
      successRedirectTo="/platform"
    />
  )
}
