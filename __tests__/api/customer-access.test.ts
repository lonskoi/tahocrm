/**
 * Tests for /api/customers/[id]/access
 */

import { NextRequest } from 'next/server'
import { PUT } from '@/app/api/customers/[id]/access/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    customer: {
      findFirst: jest.fn(),
    },
    customerResponsible: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
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

describe('API Customer Access', () => {
  const tenantId = 'tenant-1'
  const customerId = 'ckl00000000000000000000100'
  const adminUserId = 'ckl00000000000000000000101'
  const responsibleUserId = 'ckl00000000000000000000102'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('PUT updates responsibles for tenant admin', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: adminUserId, tenantId, role: 'TENANT_ADMIN' } })
    // customer exists check + final select
    prisma.customer.findFirst
      .mockResolvedValueOnce({ id: customerId, createdById: adminUserId, responsibles: [] })
      .mockResolvedValueOnce({ id: customerId })
      .mockResolvedValueOnce({
        id: customerId,
        createdById: adminUserId,
        createdBy: { id: adminUserId, name: 'Admin', role: 'TENANT_ADMIN' },
        responsibles: [
          {
            userId: responsibleUserId,
            user: { id: responsibleUserId, name: 'User2', role: 'MANAGER' },
          },
        ],
      })

    const request = new NextRequest(`http://localhost:3000/api/customers/${customerId}/access`, {
      method: 'PUT',
      body: JSON.stringify({ responsibleUserIds: [responsibleUserId] }),
    })

    const res = await PUT(request, { params: Promise.resolve({ id: customerId }) })
    expect(res.status).toBe(200)
    expect(prisma.customerResponsible.deleteMany).toHaveBeenCalled()
    expect(prisma.customerResponsible.createMany).toHaveBeenCalled()
  })
})
