import { NextResponse } from 'next/server'
import { logger, logApiError } from './logger'
import type { ErrorDetails } from '@/types/utils'

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public details?: ErrorDetails
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export function handleApiError(
  error: unknown,
  context: {
    method: string
    path: string
    userId: string | undefined
    tenantId: string | undefined
  }
): NextResponse {
  // Логируем ошибку
  if (error instanceof Error) {
    logApiError(context.method, context.path, error, context.userId, context.tenantId)
  } else {
    logger.error('Unknown API Error', {
      ...context,
      error: String(error),
      timestamp: new Date().toISOString(),
    })
  }

  // Обрабатываем разные типы ошибок
  if (error instanceof ApiError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    )
  }

  if (error instanceof Error) {
    // Prisma ошибки
    if (error.name === 'PrismaClientKnownRequestError') {
      interface PrismaError {
        code?: string
        meta?: {
          target?: string | string[]
        }
      }
      const prismaError = error as PrismaError
      if (prismaError.code === 'P2002') {
        const target = Array.isArray(prismaError.meta?.target)
          ? prismaError.meta.target.join(', ')
          : prismaError.meta?.target
        return NextResponse.json(
          {
            error: 'Unique constraint violation',
            code: 'UNIQUE_CONSTRAINT',
            field: target,
          },
          { status: 409 }
        )
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json(
          {
            error: 'Record not found',
            code: 'NOT_FOUND',
          },
          { status: 404 }
        )
      }
    }

    // Общая ошибка
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        code: 'INTERNAL_ERROR',
        ...(process.env.NODE_ENV !== 'production' && { stack: error.stack }),
      },
      { status: 500 }
    )
  }

  // Неизвестная ошибка
  return NextResponse.json(
    {
      error: 'Internal server error',
      code: 'UNKNOWN_ERROR',
    },
    { status: 500 }
  )
}

// Wrapper для API routes с автоматической обработкой ошибок
import type { NextRequest } from 'next/server'

export function withErrorHandling(
  handler: (
    req: NextRequest,
    context?: { params?: Record<string, string> }
  ) => Promise<NextResponse>,
  context: {
    method: string
    path: string
  }
) {
  return async (req: NextRequest, routeContext?: { params?: Record<string, string> }) => {
    try {
      return await handler(req, routeContext)
    } catch (error) {
      return handleApiError(error, {
        ...context,
        path: req.nextUrl?.pathname || context.path,
        userId: undefined,
        tenantId: undefined,
      })
    }
  }
}
