/**
 * Tests for /api/ui-config (Tenant UI config)
 */

import { GET, PUT } from '@/app/api/ui-config/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    tenantUiConfig: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
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

describe('API UI Config', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns default config if none exists', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.tenantUiConfig.findUnique.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/ui-config')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('PUT requires TENANT_ADMIN', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })

    const request = new NextRequest('http://localhost:3000/api/ui-config', {
      method: 'PUT',
      body: JSON.stringify({ modules: { customers: true } }),
    })
    const response = await PUT(request)
    expect(response.status).toBe(403)
  })
})
