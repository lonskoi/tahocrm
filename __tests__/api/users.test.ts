/**
 * Тесты для API пользователей (tenant-scoped)
 */

import { GET, POST } from '@/app/api/users/route'
import { PATCH, DELETE } from '@/app/api/users/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    user: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  }
  return {
    __prismaTenantMock: prismaTenantMock,
    prismaTenant: jest.fn(() => prismaTenantMock),
  }
})

jest.mock('@/lib/tenant-check', () => ({
  checkTenantAccess: jest.fn(() => Promise.resolve({ allowed: true })),
  checkTenantLimits: jest.fn(() => Promise.resolve({ allowed: true, current: 0, max: 5 })),
}))

describe('API Users', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET should return 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('GET should return 403 if not TENANT_ADMIN', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue({
      user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    const request = new NextRequest('http://localhost:3000/api/users')
    const response = await GET(request)
    expect(response.status).toBe(403)
  })

  it('GET should return users for TENANT_ADMIN', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'u-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' },
    })

    prisma.user.findMany.mockResolvedValue([{ id: 'u-2', email: 'a@b.com', name: 'A' }])

    const request = new NextRequest('http://localhost:3000/api/users')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(Array.isArray(data)).toBe(true)
  })

  it('POST should create user (TENANT_ADMIN)', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'u-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' },
    })

    prisma.user.create.mockResolvedValue({ id: 'u-2', email: 'new@b.com', name: 'New' })

    const request = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'new@b.com',
        password: 'admin123',
        name: 'New',
        phone: null,
        role: 'MANAGER',
        tenantId: null,
        isActive: true,
      }),
    })

    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.user.create).toHaveBeenCalled()
  })

  it('PATCH should update user (TENANT_ADMIN)', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'u-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' },
    })

    prisma.user.findFirst.mockResolvedValue({ id: 'u-2' })
    prisma.user.update.mockResolvedValue({ id: 'u-2', email: 'x@b.com', name: 'X' })

    const request = new NextRequest('http://localhost:3000/api/users/u-2', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'X2' }),
    })

    const response = await PATCH(request, { params: Promise.resolve({ id: 'u-2' }) })
    expect(response.status).toBe(200)
    expect(prisma.user.update).toHaveBeenCalled()
  })

  it('DELETE should delete user (TENANT_ADMIN)', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'u-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' },
    })

    prisma.user.findFirst.mockResolvedValue({ id: 'u-2' })
    prisma.user.delete.mockResolvedValue({ id: 'u-2' })

    const request = new NextRequest('http://localhost:3000/api/users/u-2', { method: 'DELETE' })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'u-2' }) })
    expect(response.status).toBe(200)
    expect(prisma.user.delete).toHaveBeenCalled()
  })
})
