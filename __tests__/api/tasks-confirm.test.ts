/**
 * Integration тесты для API подтверждения задачи
 */

import { POST } from '@/app/api/tasks/[id]/confirm/route'
import { NextRequest } from 'next/server'

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

describe('API Tasks Confirm', () => {
  const validTaskId = 'ckl2m5x4u0000y8z4gq5y5wz1'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('возвращает 401 если не авторизован', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/tasks/task-1/confirm', {
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
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    const request = new NextRequest('http://localhost:3000/api/tasks/invalid/confirm', {
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
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    prisma.task.findUnique.mockResolvedValue(null)

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/confirm`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Task not found')
  })

  it('возвращает 403 если пользователь не создатель', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    prisma.task.findUnique.mockResolvedValue({
      id: validTaskId,
      creatorId: 'user-2',
      status: 'COMPLETED',
      tenantId: 'tenant-1',
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/confirm`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })

    expect(response.status).toBe(403)
  })

  it('возвращает 403 при попытке кросс-тенант доступа', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    prisma.task.findUnique.mockResolvedValue({
      id: validTaskId,
      creatorId: 'user-1',
      status: 'COMPLETED',
      tenantId: 'tenant-2',
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/confirm`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })

    expect(response.status).toBe(403)
  })

  it('возвращает 400 если задача не COMPLETED', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    prisma.task.findUnique.mockResolvedValue({
      id: validTaskId,
      creatorId: 'user-1',
      status: 'PENDING',
      tenantId: 'tenant-1',
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/confirm`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })

    expect(response.status).toBe(400)
  })

  it('успешно подтверждает задачу', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({
      user: { id: 'user-1', tenantId: 'tenant-1', role: 'MANAGER' },
    })

    prisma.task.findUnique.mockResolvedValue({
      id: validTaskId,
      creatorId: 'user-1',
      status: 'COMPLETED',
      tenantId: 'tenant-1',
    })

    prisma.task.update.mockResolvedValue({
      id: validTaskId,
      status: 'CONFIRMED',
      confirmedAt: new Date(),
      creator: { name: 'Creator' },
      assignee: { name: 'Assignee' },
    })

    const request = new NextRequest(`http://localhost:3000/api/tasks/${validTaskId}/confirm`, {
      method: 'POST',
    })
    const response = await POST(request, { params: Promise.resolve({ id: validTaskId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('CONFIRMED')
    expect(prisma.task.update).toHaveBeenCalled()
  })
})
