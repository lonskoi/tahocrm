/**
 * Tests for /api/invoices (core CRM)
 */

import { GET, POST } from '@/app/api/invoices/route'
import { NextRequest } from 'next/server'

jest.mock('@/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/prisma', () => {
  const invoice = {
    findMany: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  }
  const invoiceLineItem = {
    createMany: jest.fn(),
  }
  const documentNumberSequence = {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  }
  const prismaTenantMock = {
    invoice,
    invoiceLineItem,
    documentNumberSequence,
    $transaction: jest.fn(async (fn: unknown) =>
      (
        fn as (tx: {
          invoice: typeof invoice
          invoiceLineItem: typeof invoiceLineItem
          documentNumberSequence: typeof documentNumberSequence
        }) => Promise<unknown>
      )({
        invoice,
        invoiceLineItem,
        documentNumberSequence,
      })
    ),
  }
  return {
    __prismaTenantMock: prismaTenantMock,
    prismaTenant: jest.fn(() => prismaTenantMock),
  }
})

jest.mock('@/lib/tenant-check', () => ({
  checkTenantAccess: jest.fn(() => Promise.resolve({ allowed: true })),
}))

describe('API Invoices', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('GET returns 401 if not authenticated', async () => {
    const { auth } = require('@/auth')
    auth.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/invoices')
    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('POST creates invoice for manager', async () => {
    const { auth } = require('@/auth')
    const { prismaTenant } = require('@/lib/prisma')
    const prisma = prismaTenant('tenant-1')

    auth.mockResolvedValue({ user: { id: 'u-1', tenantId: 'tenant-1', role: 'MANAGER' } })
    prisma.invoice.create.mockResolvedValue({ id: 'i-1', number: 'S-1' })
    prisma.documentNumberSequence.findUnique.mockResolvedValue(null)
    prisma.documentNumberSequence.create.mockResolvedValue({ id: 'seq-1' })

    const request = new NextRequest('http://localhost:3000/api/invoices', {
      method: 'POST',
      body: JSON.stringify({
        number: 'S-1',
        items: [{ name: 'Услуга', quantity: 1, price: 1000, vatRate: 'VAT_20' }],
      }),
    })
    const response = await POST(request)
    expect(response.status).toBe(201)
  })
})
