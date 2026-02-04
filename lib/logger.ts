// Простой логгер без сложных зависимостей
const isDevelopment = process.env.NODE_ENV === 'development'

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, meta || '')
    }
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    console.warn(`[WARN] ${message}`, meta || '')
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    console.error(`[ERROR] ${message}`, meta || '')
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, meta || '')
    }
  },
}

export const logApiRequest = (method: string, path: string, userId?: string, tenantId?: string) => {
  logger.info(`API ${method} ${path}`, { userId, tenantId })
}

export const logApiError = (
  method: string,
  path: string,
  error: Error,
  userId?: string,
  tenantId?: string
) => {
  logger.error(`API Error ${method} ${path}`, { error: error.message, userId, tenantId })
}

export const logWithContext = (
  level: 'info' | 'warn' | 'error' | 'debug',
  message: string,
  context?: Record<string, unknown>
) => {
  logger[level](message, context)
}

export const logAuth = (
  action: string,
  userId?: string,
  email?: string,
  success?: boolean,
  error?: string
) => {
  if (success) {
    logger.info(`Auth ${action}`, { userId, email })
  } else {
    logger.warn(`Auth ${action} failed`, { userId, email, error })
  }
}

export const logTenantAction = (
  action: string,
  tenantId: string,
  adminId: string,
  details?: Record<string, unknown>
) => {
  logger.info(`Tenant ${action}`, { tenantId, adminId, details })
}

export const logDatabaseQuery = (
  operation: string,
  model: string,
  query?: unknown,
  duration?: number,
  error?: Error
) => {
  if (error) {
    logger.error(`DB ${operation} ${model}`, { error: error.message, query, duration })
  } else {
    logger.debug(`DB ${operation} ${model}`, { query, duration })
  }
}

export const logWorkflowStep = (
  orderId: string,
  stepType: string,
  status: string,
  userId?: string,
  tenantId?: string,
  error?: Error
) => {
  if (error) {
    logger.error(`Workflow ${stepType}`, {
      orderId,
      status,
      userId,
      tenantId,
      error: error.message,
    })
  } else {
    logger.info(`Workflow ${stepType}`, { orderId, status, userId, tenantId })
  }
}

export default logger
