import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaMaster } from '@/lib/prisma'
import { logger, logTenantAction } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest, validateParams } from '@/lib/validation/middleware'
import { blockTenantSchema, idParamSchema } from '@/lib/validation/schemas'
import { hasRole } from '@/lib/authz'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('POST /api/admin/tenants/[id]/block - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('POST /api/admin/tenants/[id]/block - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    if (!hasRole(session.user, 'SUPER_ADMIN')) {
      logger.warn('POST /api/admin/tenants/[id]/block - Forbidden: not super admin', {
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

    // Валидация body
    const bodyValidation = await validateRequest(request, blockTenantSchema)
    if (bodyValidation.error) {
      return bodyValidation.error
    }
    const { reason } = bodyValidation.data

    logger.debug('POST /api/admin/tenants/[id]/block - Blocking tenant', {
      adminId: session.user.id,
      tenantId,
      reason,
      path,
      timestamp: new Date().toISOString(),
    })

    const tenant = await prismaMaster.tenant.update({
      where: { id: tenantId },
      data: {
        isBlocked: true,
        blockedReason: reason,
        blockedAt: new Date(),
        blockedBy: session.user.id,
        isActive: false,
      },
    })

    const duration = Date.now() - startTime
    logTenantAction('block', tenantId, session.user.id, { reason })

    logger.info('POST /api/admin/tenants/[id]/block - Success', {
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
    logger.error('POST /api/admin/tenants/[id]/block - Error', {
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
