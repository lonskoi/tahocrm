/**
 * Integration тесты для API управления тенантами
 */

import { GET } from '@/app/api/admin/tenants/route'
import { POST as BLOCK } from '@/app/api/admin/tenants/[id]/block/route'
import { POST as UNBLOCK } from '@/app/api/admin/tenants/[id]/unblock/route'
import { NextRequest } from 'next/server'

// Моки
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaMasterMock = {
    tenant: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  }
  return {
    __prismaMasterMock: prismaMasterMock,
    prismaMaster: prismaMasterMock,
  }
})

describe('API Admin Tenants', () => {
  const validTenantId = 'ckl2m5x4u0000y8z4gq5y5wz2'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/admin/tenants', () => {
    it('возвращает 401 если не авторизован', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/admin/tenants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('возвращает 403 если не SUPER_ADMIN', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/admin/tenants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Super admin')
    })

    it('возвращает список тенантов для SUPER_ADMIN', async () => {
      const { auth } = require('@/auth')
      const { prismaMaster } = require('@/lib/prisma')

      auth.mockResolvedValue({
        user: {
          id: 'admin-1',
          tenantId: null,
          role: 'SUPER_ADMIN',
        },
      })

      prismaMaster.tenant.findMany.mockResolvedValue([
        {
          id: validTenantId,
          name: 'Tenant 1',
          inn: '1234567890',
          email: 'tenant1@test.com',
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: 'BASIC',
          subscriptionEndDate: new Date(),
          isActive: true,
          isBlocked: false,
          blockedReason: null,
          currentUsersCount: 5,
          maxUsers: 10,
          createdAt: new Date(),
          _count: {
            users: 5,
            vehicles: 10,
            orders: 20,
          },
        },
      ])

      const request = new NextRequest('http://localhost:3000/api/admin/tenants')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('name')
    })
  })

  describe('POST /api/admin/tenants/[id]/block', () => {
    it('возвращает 403 если не SUPER_ADMIN', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/admin/tenants/${validTenantId}/block`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test reason' }),
        }
      )
      const response = await BLOCK(request, { params: Promise.resolve({ id: validTenantId }) })

      expect(response.status).toBe(403)
    })

    it('возвращает 400 если reason отсутствует', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue({
        user: {
          id: 'admin-1',
          tenantId: null,
          role: 'SUPER_ADMIN',
        },
      })

      const request = new NextRequest(
        `http://localhost:3000/api/admin/tenants/${validTenantId}/block`,
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      const response = await BLOCK(request, { params: Promise.resolve({ id: validTenantId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('успешно блокирует тенанта', async () => {
      const { auth } = require('@/auth')
      const { prismaMaster } = require('@/lib/prisma')

      auth.mockResolvedValue({
        user: {
          id: 'admin-1',
          tenantId: null,
          role: 'SUPER_ADMIN',
        },
      })

      prismaMaster.tenant.update.mockResolvedValue({
        id: validTenantId,
        name: 'Tenant 1',
        isBlocked: true,
        blockedReason: 'Test reason',
      })

      const request = new NextRequest(
        `http://localhost:3000/api/admin/tenants/${validTenantId}/block`,
        {
          method: 'POST',
          body: JSON.stringify({ reason: 'Test reason' }),
        }
      )
      const response = await BLOCK(request, { params: Promise.resolve({ id: validTenantId }) })

      expect(response.status).toBe(200)
      expect(prismaMaster.tenant.update).toHaveBeenCalledWith({
        where: { id: validTenantId },
        data: expect.objectContaining({
          isBlocked: true,
          blockedReason: 'Test reason',
          isActive: false,
        }),
      })
    })
  })

  describe('POST /api/admin/tenants/[id]/unblock', () => {
    it('успешно разблокирует тенанта', async () => {
      const { auth } = require('@/auth')
      const { prismaMaster } = require('@/lib/prisma')

      auth.mockResolvedValue({
        user: {
          id: 'admin-1',
          tenantId: null,
          role: 'SUPER_ADMIN',
        },
      })

      prismaMaster.tenant.update.mockResolvedValue({
        id: validTenantId,
        name: 'Tenant 1',
        isBlocked: false,
      })

      const request = new NextRequest(
        `http://localhost:3000/api/admin/tenants/${validTenantId}/unblock`,
        {
          method: 'POST',
        }
      )
      const response = await UNBLOCK(request, { params: Promise.resolve({ id: validTenantId }) })

      expect(response.status).toBe(200)
      expect(prismaMaster.tenant.update).toHaveBeenCalledWith({
        where: { id: validTenantId },
        data: expect.objectContaining({
          isBlocked: false,
          isActive: true,
        }),
      })
    })
  })
})
