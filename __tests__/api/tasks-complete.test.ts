/**
 * Integration тесты для API завершения задачи
 */

import { POST } from '@/app/api/tasks/[id]/complete/route'
import { NextRequest } from 'next/server'

// Моки
jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    task: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  }
  return {
    __prismaTenantMock: prismaTenantMock,
    prismaTenant: jest.fn(() => prismaTenantMock),
  }
})

describe('API Tasks Complete', () => {
  const validTaskId = 'ckl2m5x4u0000y8z4gq5y5wz1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('возвращает 401 если не авторизован', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/tasks/task-1/complete', {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Unauthorized')
  })

  it('возвращает 400 при невалидном ID', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue({
      user: {
        id: 'user-1',
        tenantId: 'tenant-1',
        role: 'MANAGER',
      },
    })

    const request = new NextRequest('http://localhost:3000/api/tasks/invalid/complete', {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: 'invalid' }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.code).toBe('VALIDATION_ERROR')
  })

  it('возвращает 404 если задача не найдена', async () => {
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

    prisma.task.findUnique.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/complete`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Task not found')
  })

  it('возвращает 403 если пользователь не исполнитель', async () => {
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

    prisma.task.findUnique.mockResolvedValue({
      id: validTaskId,
      assigneeId: 'user-2', // Другой пользователь
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/complete`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toContain('Forbidden')
  })

  it('успешно завершает задачу', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    const taskId = validTaskId
    const userId = 'user-1'

    auth.mockResolvedValue({
      user: {
        id: userId,
        tenantId: 'tenant-1',
        role: 'MANAGER',
      },
    })

    prisma.task.findUnique.mockResolvedValue({
      id: taskId,
      assigneeId: userId,
      status: 'PENDING',
      tenantId: 'tenant-1',
    })

    prisma.task.update.mockResolvedValue({
      id: taskId,
      assigneeId: userId,
      status: 'COMPLETED',
      completedAt: new Date(),
      creator: { name: 'Creator' },
      assignee: { name: 'Assignee' },
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${taskId}/complete`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: taskId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('COMPLETED')
    expect(data.completedAt).toBeDefined()
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: taskId },
      data: {
        status: 'COMPLETED',
        completedAt: expect.any(Date),
      },
      include: {
        creator: { select: { name: true } },
        assignee: { select: { name: true } },
      },
    })
  })
})
