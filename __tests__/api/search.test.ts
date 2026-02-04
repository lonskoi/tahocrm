/**
 * Integration тесты для API поиска
 */

import { GET } from '@/app/api/search/route'
import { NextRequest } from 'next/server'

// Моки
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    vehicle: {
      findMany: jest.fn(),
    },
    order: {
      findMany: jest.fn(),
    },
    tachograph: {
      findMany: jest.fn(),
    },
    driverCard: {
      findMany: jest.fn(),
    },
    sKZI: {
      findMany: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
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

describe('API Search', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/search', () => {
    it('возвращает 401 если не авторизован', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('возвращает 400 если query отсутствует', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/search')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.code).toBe('VALIDATION_ERROR')
    })

    it('возвращает 400 если query пустой', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/search?q=')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('выполняет поиск по госномеру', async () => {
      const { auth } = require('@/auth')
      const { prismaTenant } = require('@/lib/prisma')
      const prisma = prismaTenant('tenant-1')

      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      prisma.vehicle.findMany.mockResolvedValue([
        {
          id: 'vehicle-1',
          govNumber: 'А123ВВ',
          vin: 'VIN123',
        },
      ])

      const request = new NextRequest('http://localhost:3000/api/search?q=А123ВВ')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data.vehicles)).toBe(true)
      expect(prisma.vehicle.findMany).toHaveBeenCalled()
    })

    it('выполняет поиск по ИНН', async () => {
      const { auth } = require('@/auth')
      const { prismaTenant } = require('@/lib/prisma')
      const prisma = prismaTenant('tenant-1')

      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      prisma.vehicle.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/search?q=1234567890')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.vehicles).toBeDefined()
    })

    it('изолирует результаты по tenantId', async () => {
      const { auth } = require('@/auth')
      const { prismaTenant } = require('@/lib/prisma')
      const prisma = prismaTenant('tenant-1')

      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      prisma.vehicle.findMany.mockResolvedValue([])

      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      await GET(request)

      expect(prisma.vehicle.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
          }),
        })
      )
    })

    it('SUPER_ADMIN не может искать без tenantId (нужно выбрать мастерскую)', async () => {
      const { auth } = require('@/auth')

      auth.mockResolvedValue({
        user: {
          id: 'admin-1',
          tenantId: null,
          role: 'SUPER_ADMIN',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/search?q=test')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })
  })
})
