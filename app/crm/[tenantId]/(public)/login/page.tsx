import { LoginForm } from '@/components/auth/LoginForm'

export default async function TenantCrmLoginPage({
  params,
}: {
  params: Promise<{ tenantId: string }>
}) {
  const { tenantId } = await params

  return (
    <LoginForm
      title="tahoCRM"
      subtitle={`Вход в CRM мастерской (${tenantId})`}
      // Demo-friendly defaults: so you can just click "Войти"
      defaultEmail="tenant-admin@test.com"
      defaultPassword="admin123"
      tenantId={tenantId}
      successRedirectTo={`/crm/${tenantId}`}
    />
  )
}
