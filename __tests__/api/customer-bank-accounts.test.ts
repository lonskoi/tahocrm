/**
 * Tests for /api/customer-bank-accounts
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/customer-bank-accounts/route'
import { PATCH, DELETE } from '@/app/api/customer-bank-accounts/[id]/route'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const prismaTenantMock = {
    customer: {
      findFirst: jest.fn(),
    },
    customerBankAccount: {
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

describe('API Customer Bank Accounts', () => {
  const tenantId = 'tenant-1'
  const customerId = 'ckl00000000000000000000010'
  const bankAccountId = 'ckl00000000000000000000011'
  const userId = 'ckl00000000000000000000012'

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('POST creates bank account for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: userId, tenantId, role: 'MANAGER' } })
    prisma.customerBankAccount.create.mockResolvedValue({ id: 'ba-1' })

    const request = new NextRequest('http://localhost:3000/api/customer-bank-accounts', {
      method: 'POST',
      body: JSON.stringify({ customerId, bik: '044525225' }),
    })
    const res = await POST(request)
    expect(res.status).toBe(201)
    expect(prisma.customerBankAccount.create).toHaveBeenCalled()
  })

  it('PATCH returns 404 if bank account not found', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: userId, tenantId, role: 'MANAGER' } })
    prisma.customerBankAccount.findFirst.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/customer-bank-accounts/ba-1', {
      method: 'PATCH',
      body: JSON.stringify({ bankName: 'Банк' }),
    })
    const res = await PATCH(request, { params: Promise.resolve({ id: bankAccountId }) })
    expect(res.status).toBe(404)
  })

  it('DELETE deletes bank account for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant(tenantId)

    auth.mockResolvedValue({ user: { id: userId, tenantId, role: 'MANAGER' } })
    prisma.customerBankAccount.findFirst.mockResolvedValue({ id: bankAccountId, customerId })
    prisma.customerBankAccount.delete.mockResolvedValue({ id: bankAccountId })

    const request = new NextRequest(
      `http://localhost:3000/api/customer-bank-accounts/${bankAccountId}`,
      { method: 'DELETE' }
    )
    const res = await DELETE(request, { params: Promise.resolve({ id: bankAccountId }) })
    expect(res.status).toBe(200)
    expect(prisma.customerBankAccount.delete).toHaveBeenCalledWith({ where: { id: bankAccountId } })
  })
})
