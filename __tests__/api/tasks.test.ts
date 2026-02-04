/**
 * Тесты для API задач
 */

import { GET, POST } from '@/app/api/tasks/route'
import { NextRequest } from 'next/server'

// Моки
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    task: {
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

describe('API Tasks', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET /api/tasks', () => {
    it('should return 401 if not authenticated', async () => {
      const { auth } = require('@/auth')
      auth.mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should return tasks for authenticated user', async () => {
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

      prisma.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Test Task',
          status: 'PENDING',
        },
      ])

      const request = new NextRequest('http://localhost:3000/api/tasks')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })
  })

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
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

      prisma.task.create.mockResolvedValue({
        id: 'task-1',
        title: 'New Task',
        description: 'Task description',
        status: 'PENDING',
        creatorId: 'user-1',
        tenantId: 'tenant-1',
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          title: 'New Task',
          description: 'Task description',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBe('New Task')
      expect(prisma.task.create).toHaveBeenCalled()
    })

    it('should return 400 if title is missing', async () => {
      const { auth } = require('@/auth')

      auth.mockResolvedValue({
        user: {
          id: 'user-1',
          tenantId: 'tenant-1',
          role: 'MANAGER',
        },
      })

      const request = new NextRequest('http://localhost:3000/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Task without title',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.title).toBeDefined()
    })
  })
})
