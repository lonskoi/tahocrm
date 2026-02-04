import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { validateParams } from '@/lib/validation/middleware'
import { idParamSchema } from '@/lib/validation/schemas'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('POST /api/tasks/[id]/confirm - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('POST /api/tasks/[id]/confirm - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined
    const tenantId = session.user.tenantId
    if (!tenantId) {
      throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    }
    const prisma = prismaTenant(tenantId)

    // Next.js (App Router) provides async params
    const { id } = await context.params

    // Валидация params
    const validation = validateParams({ id }, idParamSchema)
    if (validation.error) {
      return validation.error
    }
    const { id: taskId } = validation.data

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!task) {
      logger.warn('POST /api/tasks/[id]/confirm - Task not found', {
        taskId,
        userId: session.user.id,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(404, 'Task not found', 'NOT_FOUND')
    }

    // Только создатель может подтвердить закрытие задачи
    if (task.creatorId !== session.user.id) {
      logger.warn('POST /api/tasks/[id]/confirm - Forbidden: not creator', {
        taskId,
        userId: session.user.id,
        creatorId: task.creatorId,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(403, 'Forbidden: Only creator can confirm task', 'FORBIDDEN')
    }

    if (task.tenantId !== tenantId) {
      throw new ApiError(403, 'Forbidden: cross-tenant access denied', 'FORBIDDEN')
    }

    if (task.status !== 'COMPLETED') {
      logger.warn('POST /api/tasks/[id]/confirm - Task must be completed first', {
        taskId,
        currentStatus: task.status,
        userId: session.user.id,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(400, 'Task must be completed first', 'INVALID_STATUS')
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: {
        creator: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    })

    const duration = Date.now() - startTime
    logger.info('POST /api/tasks/[id]/confirm - Success', {
      taskId,
      userId: session.user.id,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('POST /api/tasks/[id]/confirm - Error', {
      error: error instanceof Error ? error.message : String(error),
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
