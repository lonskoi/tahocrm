/**
 * Tests for /api/vehicles (core CRM)
 */

import { GET, POST } from '@/app/api/vehicles/route'
import { DELETE } from '@/app/api/vehicles/[id]/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    vehicle: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
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

describe('API Vehicles', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/vehicles')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('GET returns list for tenant user', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.vehicle.findMany.mockResolvedValue([{ id: 'v-1', govNumber: 'A123BC' }])

    const request = new NextRequest('http://localhost:3000/api/vehicles')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('POST creates vehicle for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.vehicle.create.mockResolvedValue({ id: 'v-1', govNumber: 'A123BC' })

    const request = new NextRequest('http://localhost:3000/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ govNumber: 'A123BC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
  })

  it('POST creates vehicle with all new fields', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.vehicle.create.mockResolvedValue({
      id: 'v-1',
      govNumber: 'A123BC',
      vin: 'VIN123',
      brand: 'Toyota',
      model: 'Camry',
      year: 2020,
      color: 'Black',
      ptsNumber: 'PTS123',
      category: 'M1',
      ecoClass: 'Euro5',
      ownerInn: '1234567890',
      ownerName: 'Owner Name',
      ownerAddress: 'Address',
      mileage: 50000,
      tireSize: '205/55R16',
    })

    const request = new NextRequest('http://localhost:3000/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({
        govNumber: 'A123BC',
        vin: 'VIN123',
        brand: 'Toyota',
        model: 'Camry',
        year: 2020,
        color: 'Black',
        ptsNumber: 'PTS123',
        category: 'M1',
        ecoClass: 'Euro5',
        ownerInn: '1234567890',
        ownerName: 'Owner Name',
        ownerAddress: 'Address',
        mileage: 50000,
        tireSize: '205/55R16',
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          govNumber: 'А123ВС',
          vin: 'VIN123',
          brand: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Black',
          ptsNumber: 'PTS123',
          category: 'M1',
          ecoClass: 'Euro5',
          ownerInn: '1234567890',
          ownerName: 'Owner Name',
          ownerAddress: 'Address',
          mileage: 50000,
          tireSize: '205/55R16',
        }),
      })
    )
  })

  it('POST creates vehicle without customerId (optional)', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.vehicle.create.mockResolvedValue({ id: 'v-1', govNumber: 'A123BC', customerId: null })

    const request = new NextRequest('http://localhost:3000/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ govNumber: 'A123BC' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: null,
        }),
      })
    )
  })

  it('POST creates vehicle with customerId', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    // Use valid CUID format (starts with 'c' and has proper structure)
    const validCustomerId = 'clxxxxxxxxxxxxxxxxxxxxx'
    prisma.vehicle.create.mockResolvedValue({
      id: 'v-1',
      govNumber: 'A123BC',
      customerId: validCustomerId,
    })

    const request = new NextRequest('http://localhost:3000/api/vehicles', {
      method: 'POST',
      body: JSON.stringify({ govNumber: 'A123BC', customerId: validCustomerId }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
    expect(prisma.vehicle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: validCustomerId,
        }),
      })
    )
  })

  it('DELETE removes vehicle for tenant admin', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'TENANT_ADMIN' } })
    prisma.vehicle.findFirst.mockResolvedValue({ id: 'v-1' })
    prisma.vehicle.delete.mockResolvedValue({ id: 'v-1' })

    const request = new NextRequest('http://localhost:3000/api/vehicles/v-1', {
      method: 'DELETE',
    })
    const response = await DELETE(request, { params: Promise.resolve({ id: 'v-1' }) })
    expect(response.status).toBe(200)
    expect(prisma.vehicle.delete).toHaveBeenCalledWith({ where: { id: 'v-1' } })
  })
})
