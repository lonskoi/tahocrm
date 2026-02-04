/**
 * Middleware для валидации запросов с использованием Zod
 */

import { NextRequest, NextResponse } from 'next/server'
import { ZodError, ZodSchema } from 'zod'

/**
 * Валидация body запроса
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
          { status: 400 }
        ),
      }
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid request body',
          code: 'INVALID_REQUEST',
        },
        { status: 400 }
      ),
    }
  }
}

/**
 * Валидация query параметров
 */
export function validateQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    const searchParams = request.nextUrl.searchParams
    const params: Record<string, string> = {}

    searchParams.forEach((value, key) => {
      params[key] = value
    })

    const data = schema.parse(params)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
          { status: 400 }
        ),
      }
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid query parameters',
          code: 'INVALID_QUERY',
        },
        { status: 400 }
      ),
    }
  }
}

/**
 * Валидация path параметров (например, из [id])
 */
export function validateParams<T>(
  params: Record<string, string | string[] | undefined>,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    // Преобразуем params в объект со string значениями
    const paramsObj: Record<string, string> = {}
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        paramsObj[key] = value[0] || ''
      } else if (value !== undefined) {
        paramsObj[key] = value
      }
    }

    const data = schema.parse(paramsObj)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      const details = error.issues.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      }))

      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation error',
            code: 'VALIDATION_ERROR',
            details,
          },
          { status: 400 }
        ),
      }
    }

    return {
      data: null,
      error: NextResponse.json(
        {
          error: 'Invalid path parameters',
          code: 'INVALID_PARAMS',
        },
        { status: 400 }
      ),
    }
  }
}

/**
 * Обертка для API handlers с автоматической валидацией
 */
export function withValidation<TBody, TQuery, TParams>(
  schemas: {
    body?: ZodSchema<TBody>
    query?: ZodSchema<TQuery>
    params?: ZodSchema<TParams>
  },
  handler: (args: {
    request: NextRequest
    body: TBody | null
    query: TQuery | null
    params: TParams | null
  }) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    context?: { params?: Record<string, string | string[] | undefined> }
  ): Promise<NextResponse> => {
    // Валидация body
    let body: TBody | null = null
    if (schemas.body) {
      const result = await validateRequest(request, schemas.body)
      if (result.error) {
        return result.error
      }
      body = result.data
    }

    // Валидация query
    let query: TQuery | null = null
    if (schemas.query) {
      const result = validateQuery(request, schemas.query)
      if (result.error) {
        return result.error
      }
      query = result.data
    }

    // Валидация params
    let params: TParams | null = null
    if (schemas.params && context?.params) {
      const result = validateParams(context.params, schemas.params)
      if (result.error) {
        return result.error
      }
      params = result.data
    }

    return handler({ request, body, query, params })
  }
}
