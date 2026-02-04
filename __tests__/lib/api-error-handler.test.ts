/**
 * Unit tests for api-error-handler (branches coverage)
 */

import { ApiError, handleApiError } from '@/lib/api-error-handler'

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
  },
  logApiError: jest.fn(),
}))

describe('api-error-handler', () => {
  it('handles ApiError with status/code', async () => {
    const res = handleApiError(new ApiError(403, 'Forbidden', 'FORBIDDEN'), {
      method: 'GET',
      path: '/x',
      userId: 'u',
      tenantId: 't',
    })
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Forbidden')
    expect(json.code).toBe('FORBIDDEN')
  })

  it('handles Prisma unique constraint', async () => {
    const err = new Error('P2002') as unknown as {
      name: string
      code?: string
      meta?: { target?: string[] }
    }
    err.name = 'PrismaClientKnownRequestError'
    err.code = 'P2002'
    err.meta = { target: ['email'] }

    const res = handleApiError(err, {
      method: 'POST',
      path: '/x',
      userId: 'u',
      tenantId: 't',
    })
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.code).toBe('UNIQUE_CONSTRAINT')
  })

  it('handles generic Error (500)', async () => {
    const res = handleApiError(new Error('boom'), {
      method: 'GET',
      path: '/x',
      userId: 'u',
      tenantId: 't',
    })
    expect(res.status).toBe(500)
  })
})
