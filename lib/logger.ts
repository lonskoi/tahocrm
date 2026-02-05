// Простой структурированный логгер без сложных зависимостей.
// В разработке логи — основной инструмент диагностики, поэтому:
// - в production по умолчанию логируем info/warn/error
// - debug включается через LOG_LEVEL=debug

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const levelWeight: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
}

function normalizeLevel(v: string | undefined): LogLevel | null {
  const raw = (v ?? '').trim().toLowerCase()
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw
  return null
}

const defaultLevel: LogLevel = process.env.NODE_ENV === 'development' ? 'debug' : 'info'
const minLevel: LogLevel = normalizeLevel(process.env.LOG_LEVEL) ?? defaultLevel

function shouldLog(level: LogLevel): boolean {
  return levelWeight[level] >= levelWeight[minLevel]
}

function emit(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (!shouldLog(level)) return
  const ts = new Date().toISOString()
  const prefix = `${ts} [${level.toUpperCase()}]`

  const out = meta ? { ...meta } : undefined
  // Keep logs readable: message always first.
  const line = `${prefix} ${message}`

  if (level === 'error') {
    // console.error keeps stack traces in container logs.
    out ? console.error(line, out) : console.error(line)
    return
  }
  if (level === 'warn') {
    out ? console.warn(line, out) : console.warn(line)
    return
  }
  if (level === 'debug') {
    out ? console.log(line, out) : console.log(line)
    return
  }
  out ? console.log(line, out) : console.log(line)
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    emit('info', message, meta)
  },
  warn: (message: string, meta?: Record<string, unknown>) => {
    emit('warn', message, meta)
  },
  error: (message: string, meta?: Record<string, unknown>) => {
    emit('error', message, meta)
  },
  debug: (message: string, meta?: Record<string, unknown>) => {
    emit('debug', message, meta)
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
