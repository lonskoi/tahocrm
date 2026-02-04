/**
 * Tests for /api/tachographs (equipment)
 */

import { GET, POST } from '@/app/api/tachographs/route'
import { PATCH, DELETE } from '@/app/api/tachographs/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    tachograph: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
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
}))

describe('API Tachographs (Equipment)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/tachographs')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('GET returns list for tenant user', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.tachograph.findMany.mockResolvedValue([
      { id: 't-1', type: 'TACHOGRAPH', serialNumber: 'SN123' },
    ])

    const request = new NextRequest('http://localhost:3000/api/tachographs')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('POST creates equipment for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    const validVehicleId = 'clxxxxxxxxxxxxxxxxxxxxx'
    prisma.tachograph.create.mockResolvedValue({
      id: 't-1',
      type: 'TACHOGRAPH',
      brand: 'VDO',
      model: 'DTCO 1381',
      serialNumber: 'SN123',
    })

    const request = new NextRequest('http://localhost:3000/api/tachographs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'TACHOGRAPH',
        brand: 'VDO',
        model: 'DTCO 1381',
        serialNumber: 'SN123',
        vehicleId: validVehicleId,
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.tachograph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'TACHOGRAPH',
          brand: 'VDO',
          model: 'DTCO 1381',
          serialNumber: 'SN123',
          vehicleId: validVehicleId,
        }),
      })
    )
  })

  it('POST creates equipment with customerId', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    const validCustomerId = 'clxxxxxxxxxxxxxxxxxxxxx'
    prisma.tachograph.create.mockResolvedValue({
      id: 't-1',
      type: 'GLONASS',
      customerId: validCustomerId,
    })

    const request = new NextRequest('http://localhost:3000/api/tachographs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'GLONASS',
        brand: 'Galileo',
        model: 'GL-100',
        serialNumber: 'GL123',
        customerId: validCustomerId,
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.tachograph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: validCustomerId,
        }),
      })
    )
  })

  it('POST creates equipment with new fields (w, k, l, workDate, tireSize)', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    const validVehicleId = 'clxxxxxxxxxxxxxxxxxxxxx'
    prisma.tachograph.create.mockResolvedValue({
      id: 't-1',
      type: 'TACHOGRAPH',
      w: '1.234',
      k: '5.678',
      l: '9.012',
      workDate: new Date('2024-01-15'),
      tireSize: '205/55R16',
    })

    const request = new NextRequest('http://localhost:3000/api/tachographs', {
      method: 'POST',
      body: JSON.stringify({
        type: 'TACHOGRAPH',
        brand: 'VDO',
        serialNumber: 'SN123',
        vehicleId: validVehicleId,
        w: '1.234',
        k: '5.678',
        l: '9.012',
        workDate: '2024-01-15T00:00:00.000Z',
        tireSize: '205/55R16',
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.tachograph.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          w: '1.234',
          k: '5.678',
          l: '9.012',
          tireSize: '205/55R16',
        }),
      })
    )
  })

  it('PATCH updates equipment', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.tachograph.findFirst.mockResolvedValue({ id: 't-1' })
    prisma.tachograph.update.mockResolvedValue({
      id: 't-1',
      type: 'GLONASS',
      brand: 'Updated Brand',
      comment: 'Updated comment',
    })

    const request = new NextRequest('http://localhost:3000/api/tachographs/t-1', {
      method: 'PATCH',
      body: JSON.stringify({
        type: 'GLONASS',
        brand: 'Updated Brand',
        comment: 'Updated comment',
      }),
    })
    const response = await PATCH(request, { params: Promise.resolve({ id: 't-1' }) })
    expect(response.status).toBe(200)
    expect(prisma.tachograph.update).toHaveBeenCalled()
  })

  it('DELETE removes equipment', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.tachograph.findFirst.mockResolvedValue({ id: 't-1' })
    prisma.tachograph.delete.mockResolvedValue({ id: 't-1' })

    const request = new NextRequest('http://localhost:3000/api/tachographs/t-1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 't-1' }) })
    expect(response.status).toBe(200)
    expect(prisma.tachograph.delete).toHaveBeenCalledWith({ where: { id: 't-1' } })
  })
})
