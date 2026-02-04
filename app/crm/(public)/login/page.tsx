import { redirect } from 'next/navigation'

export default function CrmLoginPage() {
  // Legacy entrypoint. Prefer tenant-scoped login: /crm/<tenantId>/login
  const tenantId = process.env.DEV_DEFAULT_TENANT_ID ?? 'tenant-1'
  redirect(`/crm/${tenantId}/login`)
}
