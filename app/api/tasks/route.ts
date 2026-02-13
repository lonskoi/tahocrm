import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { logger, logApiRequest, logWithContext } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { checkTenantAccess } from '@/lib/tenant-check'
import { validateRequest } from '@/lib/validation/middleware'
import { createTaskSchema } from '@/lib/validation/schemas'
import { hasInvalidTenantSessionIdentity, hasRole } from '@/lib/authz'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('GET /api/tasks - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('GET /api/tasks - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    if (hasInvalidTenantSessionIdentity(session.user)) {
      throw new ApiError(401, 'Invalid session identity. Please sign in again.', 'INVALID_SESSION')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    logApiRequest('GET', path, session.user.id, session.user.tenantId ?? undefined)

    const tenantId = session.user.tenantId
    if (!tenantId && !hasRole(session.user, 'SUPER_ADMIN')) {
      logger.warn('GET /api/tasks - Tenant ID required', {
        userId: session.user.id,
        role: session.user.role,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    }
    if (!tenantId) {
      throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    }

    // Проверка доступа мастерской
    if (tenantId) {
      const accessCheck = await checkTenantAccess(tenantId)
      if (!accessCheck.allowed) {
        logger.warn('GET /api/tasks - Tenant access denied', {
          tenantId,
          reason: accessCheck.reason,
          userId: session.user.id,
          path,
          timestamp: new Date().toISOString(),
        })
        throw new ApiError(403, accessCheck.reason || 'Access denied', 'TENANT_ACCESS_DENIED')
      }
    }

    logger.debug('GET /api/tasks - Fetching tasks from database', {
      tenantId: tenantId || 'SUPER_ADMIN',
      userId: session.user.id,
      path,
      timestamp: new Date().toISOString(),
    })

    const prisma = prismaTenant(tenantId)
    const customerId = request.nextUrl.searchParams.get('customerId')
    const tasks = await prisma.task.findMany({
      where: { tenantId, ...(customerId ? { customerId } : {}) },
      include: {
        creator: {
          select: { name: true },
        },
        assignee: {
          select: { name: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    const duration = Date.now() - startTime
    logger.info('GET /api/tasks - Success', {
      tenantId,
      userId: session.user.id,
      taskCount: tasks.length,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(tasks)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('GET /api/tasks - Error', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })
    return handleApiError(error, {
      method: 'GET',
      path,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('POST /api/tasks - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('POST /api/tasks - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    if (hasInvalidTenantSessionIdentity(session.user)) {
      throw new ApiError(401, 'Invalid session identity. Please sign in again.', 'INVALID_SESSION')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    logApiRequest('POST', path, session.user.id, session.user.tenantId ?? undefined)

    const tenantId = session.user.tenantId
    if (!tenantId && !hasRole(session.user, 'SUPER_ADMIN')) {
      logger.warn('POST /api/tasks - Tenant ID required', {
        userId: session.user.id,
        role: session.user.role,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    }
    if (!tenantId) {
      throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    }

    // Проверка доступа мастерской
    if (tenantId) {
      const accessCheck = await checkTenantAccess(tenantId)
      if (!accessCheck.allowed) {
        logger.warn('POST /api/tasks - Tenant access denied', {
          tenantId,
          reason: accessCheck.reason,
          userId: session.user.id,
          path,
          timestamp: new Date().toISOString(),
        })
        throw new ApiError(403, accessCheck.reason || 'Access denied', 'TENANT_ACCESS_DENIED')
      }
    }

    // Валидация body
    const validation = await validateRequest(request, createTaskSchema)
    if (validation.error) {
      return validation.error
    }
    const {
      title,
      description,
      assigneeId,
      vehicleId,
      orderId,
      customerId,
      dueDate,
      businessCreatedAt,
      businessUpdatedAt,
    } = validation.data

    logger.debug('POST /api/tasks - Request body', {
      tenantId,
      userId: session.user.id,
      body: { title, description, assigneeId, vehicleId, orderId },
      path,
      timestamp: new Date().toISOString(),
    })

    logger.debug('POST /api/tasks - Creating task in database', {
      tenantId,
      userId: session.user.id,
      taskData: { title, description, assigneeId, vehicleId, orderId },
      path,
      timestamp: new Date().toISOString(),
    })

    const prisma = prismaTenant(tenantId)
    const task = await prisma.task.create({
      data: {
        title: title ?? '',
        description: description ?? null,
        tenantId,
        creatorId: session.user.id,
        assigneeId: assigneeId ?? null,
        vehicleId: vehicleId ?? null,
        orderId: orderId ?? null,
        customerId: customerId ?? null,
        dueDate: dueDate ? new Date(dueDate) : null,
        businessCreatedAt: businessCreatedAt ? new Date(businessCreatedAt) : null,
        businessUpdatedAt: businessUpdatedAt ? new Date(businessUpdatedAt) : null,
      },
      include: {
        creator: {
          select: { name: true },
        },
        assignee: {
          select: { name: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
    })

    const duration = Date.now() - startTime
    logWithContext('info', 'Task created successfully', {
      userId: session.user.id,
      tenantId,
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task.id,
      duration: `${duration}ms`,
    })

    logger.info('POST /api/tasks - Success', {
      tenantId,
      userId: session.user.id,
      taskId: task.id,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(task)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('POST /api/tasks - Error', {
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
