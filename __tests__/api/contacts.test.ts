/**
 * Tests for /api/contacts
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/contacts/route'
import { PATCH, DELETE } from '@/app/api/contacts/[id]/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    customer: {
      findFirst: jest.fn(),
    },
    contact: {
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

describe('API Contacts', () => {
  const tenantId = 'tenant-1'
  const customerId = 'ckl00000000000000000000000'
  const contactId = 'ckl00000000000000000000001'
  const ownerUserId = 'ckl00000000000000000000002'
  const otherUserId = 'ckl00000000000000000000003'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST creates contact for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: ownerUserId, tenantId, role: 'MANAGER' } })
    prisma.contact.create.mockResolvedValue({ id: 'ct-1', name: 'Иванов Иван' })

    const request = new NextRequest('http://localhost:3000/api/contacts', {
      method: 'POST',
      body: JSON.stringify({ customerId, name: 'Иванов Иван' }),
    })
    const res = await POST(request)
    expect(res.status).toBe(201)
    expect(prisma.contact.create).toHaveBeenCalled()
  })

  it('PATCH returns 403 when user has no access to customer', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: otherUserId, tenantId, role: 'CLIENT' } })

    prisma.contact.findFirst.mockResolvedValue({ id: contactId, customerId })
    prisma.customer.findFirst.mockResolvedValue({ createdById: ownerUserId, responsibles: [] })

    const request = new NextRequest(`http://localhost:3000/api/contacts/${contactId}`, {
      method: 'PATCH',
      body: JSON.stringify({ phone: '+7' }),
    })
    const res = await PATCH(request, { params: Promise.resolve({ id: contactId }) })
    expect(res.status).toBe(403)
  })

  it('DELETE deletes contact for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: ownerUserId, tenantId, role: 'MANAGER' } })
    prisma.contact.findFirst.mockResolvedValue({ id: contactId, customerId })
    prisma.contact.delete.mockResolvedValue({ id: contactId })

    const request = new NextRequest(`http://localhost:3000/api/contacts/${contactId}`, {
      method: 'DELETE',
    })
    const res = await DELETE(request, { params: Promise.resolve({ id: contactId }) })
    expect(res.status).toBe(200)
    expect(prisma.contact.delete).toHaveBeenCalledWith({ where: { id: contactId } })
  })
})
