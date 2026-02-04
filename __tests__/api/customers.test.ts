/**
 * Tests for /api/customers (core CRM)
 */

import { GET, POST } from '@/app/api/customers/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    customer: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  }
  return {
    __prismaTenantMock: prismaTenantMock,
    prismaTenant: jest.fn(() => prismaTenantMock),
  }
})

jest.mock('@/lib/tenant-check', () => ({
  checkTenantAccess: jest.fn(() => Promise.resolve({ allowed: true })),
}))

describe('API Customers', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/customers')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('GET returns list for tenant user', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.customer.findMany.mockResolvedValue([{ id: 'c-1', name: 'Acme' }])

    const request = new NextRequest('http://localhost:3000/api/customers')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('POST returns 403 for read-only role', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'CLIENT' } })

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', type: 'COMPANY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(403)
  })

  it('POST creates customer for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.customer.create.mockResolvedValue({ id: 'c-1', name: 'Acme' })

    const request = new NextRequest('http://localhost:3000/api/customers', {
      method: 'POST',
      body: JSON.stringify({ name: 'Acme', type: 'COMPANY' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.customer.create).toHaveBeenCalled()
  })
})
