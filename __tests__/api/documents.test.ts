/**
 * Tests for /api/documents (core CRM)
 */

import { GET, POST } from '@/app/api/documents/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    document: {
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

describe('API Documents', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)
    const request = new NextRequest('http://localhost:3000/api/documents')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('GET returns list for tenant user', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.document.findMany.mockResolvedValue([
      { id: 'd-1', fileName: 'x.pdf', fileUrl: 'http://x' },
    ])

    const request = new NextRequest('http://localhost:3000/api/documents')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })

  it('POST creates document for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.document.create.mockResolvedValue({ id: 'd-1' })

    const request = new NextRequest('http://localhost:3000/api/documents', {
      method: 'POST',
      body: JSON.stringify({ fileName: 'x.pdf', fileUrl: 'http://x', type: 'OTHER' }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
