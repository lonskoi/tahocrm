/**
 * Tests for /api/orders (core CRM)
 */

import { GET, POST } from '@/app/api/orders/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const order = {
    findMany: jest.fn(),
    create: jest.fn(),
  }
  const prismaTenantMock = {
    order,
    $transaction: jest.fn(async (fn: unknown) =>
      (fn as (tx: { order: typeof order }) => Promise<unknown>)({
        order,
      })
    ),
  }
  return {
    __prismaTenantMock: prismaTenantMock,
    prismaTenant: jest.fn(() => prismaTenantMock),
  }
})

jest.mock('@/lib/tenant-check', () => ({
  checkTenantAccess: jest.fn(() => Promise.resolve({ allowed: true })),
}))

describe('API Orders', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/orders')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('GET returns list for tenant user', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.order.findMany.mockResolvedValue([{ id: 'o-1', number: 'Z-1' }])

    const request = new NextRequest('http://localhost:3000/api/orders')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('POST creates order for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.order.create.mockResolvedValue({ id: 'o-1', number: 'Z-1' })

    const request = new NextRequest('http://localhost:3000/api/orders', {
      method: 'POST',
      body: JSON.stringify({ number: 'Z-1', type: 'OTHER', status: 'DRAFT' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
