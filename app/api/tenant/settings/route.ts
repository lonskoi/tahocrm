import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaMaster } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { hasRole } from '@/lib/authz'
import { z } from 'zod'
import type { VatRate } from '@prisma/client'
import { hasRole } from '@/lib/authz'

const updateTenantSettingsSchema = z.object({
  defaultVatRate: z.enum(['NONE', 'VAT_5', 'VAT_7', 'VAT_10', 'VAT_20', 'VAT_22']).optional(),
})

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    // Получаем настройки из master DB
    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true, defaultVatRate: true },
    })

    if (!tenant) throw new ApiError(404, 'Tenant not found', 'TENANT_NOT_FOUND')

    return NextResponse.json({ defaultVatRate: tenant.defaultVatRate })
  } catch (error) {
    return handleApiError(error, { method: 'GET', path, userId, tenantId: tenantIdForLog })
  }
}

export async function PUT(request: NextRequest) {
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0b096cfe-8e1a-4f6b-8f51-532a1884a858', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/tenant/settings/route.ts:PUT:entry',
        message: 'PUT /api/tenant/settings - entry',
        data: { path },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'debug-run',
        hypothesisId: 'A',
      }),
    }).catch(() => {})
    // #endregion

    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')

    // Только TENANT_ADMIN может изменять настройки
    if (!hasRole(session.user, 'TENANT_ADMIN')) {
      throw new ApiError(403, 'Forbidden: Tenant admin access required', 'FORBIDDEN')
    }

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, updateTenantSettingsSchema)
    if (validation.error) return validation.error
    const data = validation.data

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0b096cfe-8e1a-4f6b-8f51-532a1884a858', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/tenant/settings/route.ts:PUT:before-update',
        message: 'Before prismaMaster.tenant.update',
        data: { tenantId, defaultVatRate: data.defaultVatRate, hasPrismaMaster: !!prismaMaster },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'debug-run',
        hypothesisId: 'B',
      }),
    }).catch(() => {})
    // #endregion

    // Обновляем настройки в master DB
    const updated = await prismaMaster.tenant.update({
      where: { id: tenantId },
      data: {
        ...(data.defaultVatRate ? { defaultVatRate: data.defaultVatRate as VatRate } : {}),
      },
      select: { id: true, defaultVatRate: true },
    })

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0b096cfe-8e1a-4f6b-8f51-532a1884a858', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/tenant/settings/route.ts:PUT:after-update',
        message: 'After prismaMaster.tenant.update - SUCCESS',
        data: { tenantId, updatedId: updated.id, updatedDefaultVatRate: updated.defaultVatRate },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'debug-run',
        hypothesisId: 'C',
      }),
    }).catch(() => {})
    // #endregion

    return NextResponse.json(updated)
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/0b096cfe-8e1a-4f6b-8f51-532a1884a858', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'app/api/tenant/settings/route.ts:PUT:error',
        message: 'Error in PUT /api/tenant/settings',
        data: {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          tenantId: tenantIdForLog,
        },
        timestamp: Date.now(),
        sessionId: 'debug-session',
        runId: 'debug-run',
        hypothesisId: 'D',
      }),
    }).catch(() => {})
    // #endregion
    return handleApiError(error, { method: 'PUT', path, userId, tenantId: tenantIdForLog })
  }
}
