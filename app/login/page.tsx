import Link from 'next/link'

export default function LoginChooserPage() {
  const tenantId = process.env.DEV_DEFAULT_TENANT_ID ?? 'tenant-1'
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="w-full max-w-xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">tahoCRM</h1>
        <p className="text-gray-600 mb-8">Выберите, куда войти</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link
            href={`/crm/${tenantId}/login`}
            className="block p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:shadow-lg transition-all"
          >
            <div className="text-lg font-semibold text-gray-900">CRM мастерской</div>
            <div className="text-sm text-gray-600 mt-1">Для сотрудников мастерской</div>
          </Link>

          <Link
            href="/platform/login"
            className="block p-6 rounded-2xl border-2 border-gray-200 hover:border-purple-500 hover:shadow-lg transition-all"
          >
            <div className="text-lg font-semibold text-gray-900">Мега‑админка</div>
            <div className="text-sm text-gray-600 mt-1">Для SUPER_ADMIN платформы</div>
          </Link>
        </div>
      </div>
    </div>
  )
}
