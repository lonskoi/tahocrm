import { prismaMaster } from './prisma'
import { logger, logDatabaseQuery } from './logger'

/**
 * Проверка активности и подписки мастерской
 * Используется в middleware и API routes для контроля доступа
 */
export async function checkTenantAccess(rawTenantId: string | null): Promise<{
  allowed: boolean
  reason?: string
}> {
  const startTime = Date.now()
  const tenantId =
    typeof rawTenantId === 'string' && rawTenantId.trim().length > 0 ? rawTenantId.trim() : null

  try {
    logger.debug('checkTenantAccess - Starting check', {
      tenantId: tenantId ?? rawTenantId,
      timestamp: new Date().toISOString(),
    })

    if (!tenantId) {
      logger.warn('checkTenantAccess - Tenant ID is required', {
        tenantId: rawTenantId,
        timestamp: new Date().toISOString(),
      })
      return { allowed: false, reason: 'Tenant ID is required' }
    }

    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: tenantId },
      select: {
        isActive: true,
        isBlocked: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        blockedReason: true,
      },
    })

    const duration = Date.now() - startTime
    logDatabaseQuery('findUnique', 'Tenant', { id: tenantId }, duration)

    if (!tenant) {
      logger.warn('checkTenantAccess - Tenant not found', {
        tenantId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return { allowed: false, reason: 'Tenant not found' }
    }

    if (tenant.isBlocked) {
      logger.warn('checkTenantAccess - Tenant is blocked', {
        tenantId,
        blockedReason: tenant.blockedReason,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return {
        allowed: false,
        reason: tenant.blockedReason || 'Tenant is blocked by administrator',
      }
    }

    if (!tenant.isActive) {
      logger.warn('checkTenantAccess - Tenant is inactive', {
        tenantId,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return { allowed: false, reason: 'Tenant is inactive' }
    }

    // Проверка срока подписки
    if (tenant.subscriptionEndDate && new Date(tenant.subscriptionEndDate) < new Date()) {
      if (tenant.subscriptionStatus !== 'TRIAL') {
        logger.warn('checkTenantAccess - Subscription expired', {
          tenantId,
          subscriptionStatus: tenant.subscriptionStatus,
          subscriptionEndDate: tenant.subscriptionEndDate,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })
        return { allowed: false, reason: 'Subscription expired' }
      }
    }

    // Проверка статуса подписки
    if (tenant.subscriptionStatus === 'SUSPENDED' || tenant.subscriptionStatus === 'EXPIRED') {
      logger.warn('checkTenantAccess - Subscription suspended or expired', {
        tenantId,
        subscriptionStatus: tenant.subscriptionStatus,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return {
        allowed: false,
        reason: `Subscription is ${tenant.subscriptionStatus.toLowerCase()}`,
      }
    }

    logger.debug('checkTenantAccess - Access granted', {
      tenantId,
      subscriptionStatus: tenant.subscriptionStatus,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    return { allowed: true }
  } catch (error) {
    const duration = Date.now() - startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorCode =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof (error as { code?: unknown }).code === 'string'
        ? ((error as { code: string }).code ?? '')
        : ''
    const isConnectionIssue =
      errorCode === 'ECONNREFUSED' ||
      errorMessage.includes('connect') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('P1001') ||
      errorMessage.includes("Can't reach database")

    logger.error('checkTenantAccess - Error', {
      tenantId: tenantId ?? rawTenantId,
      error: errorMessage,
      code: errorCode || undefined,
      stack: errorStack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })

    // Более детальное сообщение об ошибке для диагностики
    if (isConnectionIssue) {
      return {
        allowed: false,
        reason: 'Cannot reach master database. Please ensure PostgreSQL is running.',
      }
    }

    return { allowed: false, reason: `Error checking tenant access: ${errorMessage}` }
  }
}

/**
 * Проверка лимитов мастерской
 */
export async function checkTenantLimits(
  tenantId: string,
  resource: 'users' | 'vehicles' | 'orders'
): Promise<{
  allowed: boolean
  reason?: string
  current?: number
  max?: number
}> {
  const startTime = Date.now()

  try {
    logger.debug('checkTenantLimits - Starting check', {
      tenantId,
      resource,
      timestamp: new Date().toISOString(),
    })

    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: tenantId },
      select: {
        maxUsers: true,
        maxVehicles: true,
        maxOrdersPerMonth: true,
        currentUsersCount: true,
        currentVehiclesCount: true,
        ordersThisMonth: true,
        lastResetDate: true,
      },
    })

    const duration = Date.now() - startTime
    logDatabaseQuery('findUnique', 'Tenant', { id: tenantId }, duration)

    if (!tenant) {
      logger.warn('checkTenantLimits - Tenant not found', {
        tenantId,
        resource,
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      })
      return { allowed: false, reason: 'Tenant not found' }
    }

    // Сброс счетчика заказов в начале месяца
    const now = new Date()
    const lastReset = new Date(tenant.lastResetDate)
    if (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
      logger.info('checkTenantLimits - Resetting monthly order counter', {
        tenantId,
        oldCount: tenant.ordersThisMonth,
        timestamp: new Date().toISOString(),
      })

      await prismaMaster.tenant.update({
        where: { id: tenantId },
        data: {
          ordersThisMonth: 0,
          lastResetDate: now,
        },
      })
      tenant.ordersThisMonth = 0
    }

    switch (resource) {
      case 'users':
        if (tenant.currentUsersCount >= tenant.maxUsers) {
          logger.warn('checkTenantLimits - User limit reached', {
            tenantId,
            current: tenant.currentUsersCount,
            max: tenant.maxUsers,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          })
          return {
            allowed: false,
            reason: 'User limit reached',
            current: tenant.currentUsersCount,
            max: tenant.maxUsers,
          }
        }
        logger.debug('checkTenantLimits - User limit OK', {
          tenantId,
          current: tenant.currentUsersCount,
          max: tenant.maxUsers,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })
        return { allowed: true, current: tenant.currentUsersCount, max: tenant.maxUsers }

      case 'vehicles':
        if (tenant.currentVehiclesCount >= tenant.maxVehicles) {
          logger.warn('checkTenantLimits - Vehicle limit reached', {
            tenantId,
            current: tenant.currentVehiclesCount,
            max: tenant.maxVehicles,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          })
          return {
            allowed: false,
            reason: 'Vehicle limit reached',
            current: tenant.currentVehiclesCount,
            max: tenant.maxVehicles,
          }
        }
        logger.debug('checkTenantLimits - Vehicle limit OK', {
          tenantId,
          current: tenant.currentVehiclesCount,
          max: tenant.maxVehicles,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })
        return { allowed: true, current: tenant.currentVehiclesCount, max: tenant.maxVehicles }

      case 'orders':
        if (tenant.ordersThisMonth >= tenant.maxOrdersPerMonth) {
          logger.warn('checkTenantLimits - Monthly order limit reached', {
            tenantId,
            current: tenant.ordersThisMonth,
            max: tenant.maxOrdersPerMonth,
            duration: `${duration}ms`,
            timestamp: new Date().toISOString(),
          })
          return {
            allowed: false,
            reason: 'Monthly order limit reached',
            current: tenant.ordersThisMonth,
            max: tenant.maxOrdersPerMonth,
          }
        }
        logger.debug('checkTenantLimits - Order limit OK', {
          tenantId,
          current: tenant.ordersThisMonth,
          max: tenant.maxOrdersPerMonth,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })
        return { allowed: true, current: tenant.ordersThisMonth, max: tenant.maxOrdersPerMonth }

      default:
        logger.warn('checkTenantLimits - Unknown resource', {
          tenantId,
          resource,
          duration: `${duration}ms`,
          timestamp: new Date().toISOString(),
        })
        return { allowed: false, reason: 'Unknown resource' }
    }
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('checkTenantLimits - Error', {
      tenantId,
      resource,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
    })
    return { allowed: false, reason: 'Error checking tenant limits' }
  }
}
