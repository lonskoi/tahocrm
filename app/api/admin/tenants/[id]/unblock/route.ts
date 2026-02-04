import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaMaster } from '@/lib/prisma'
import { logger, logTenantAction } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateParams } from '@/lib/validation/middleware'
import { idParamSchema } from '@/lib/validation/schemas'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('POST /api/admin/tenants/[id]/unblock - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('POST /api/admin/tenants/[id]/unblock - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    if (session.user.role !== 'SUPER_ADMIN') {
      logger.warn('POST /api/admin/tenants/[id]/unblock - Forbidden: not super admin', {
        userId: session.user.id,
        role: session.user.role,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(403, 'Forbidden: Super admin access required', 'FORBIDDEN')
    }

    // Next.js (App Router) provides async params
    const { id } = await context.params

    // Валидация params
    const paramsValidation = validateParams({ id }, idParamSchema)
    if (paramsValidation.error) {
      return paramsValidation.error
    }
    const { id: tenantId } = paramsValidation.data

    logger.debug('POST /api/admin/tenants/[id]/unblock - Unblocking tenant', {
      adminId: session.user.id,
      tenantId,
      path,
      timestamp: new Date().toISOString(),
    })

    const tenant = await prismaMaster.tenant.update({
      where: { id: tenantId },
      data: {
        isBlocked: false,
        blockedReason: null,
        blockedAt: null,
        blockedBy: null,
        isActive: true,
      },
    })

    const duration = Date.now() - startTime
    logTenantAction('unblock', tenantId, session.user.id)

    logger.info('POST /api/admin/tenants/[id]/unblock - Success', {
      adminId: session.user.id,
      tenantId,
      tenantName: tenant.name,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(tenant)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('POST /api/admin/tenants/[id]/unblock - Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })
    return handleApiError(error, {
      method: 'POST',
      path,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}
