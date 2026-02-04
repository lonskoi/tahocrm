/**
 * Unit tests for middleware tenant scoping (branches coverage)
 */

import { NextRequest } from 'next/server'

jest.mock('next-auth/jwt', () => ({
  getToken: jest.fn(),
}))

import { middleware } from '@/middleware'

describe('middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('allows public tenant login', async () => {
    const req = new NextRequest('http://localhost:3000/crm/tenant-1/login')
    const res = await middleware(req)
    // NextResponse.next() returns 200; the key check is "no redirect"
    expect(res.status).toBe(200)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects unauthenticated tenant page to tenant login', async () => {
    const { getToken } = require('next-auth/jwt')
    getToken.mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3000/crm/tenant-1/customers')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/crm/tenant-1/login')
  })

  it('redirects SUPER_ADMIN away from crm', async () => {
    const { getToken } = require('next-auth/jwt')
    getToken.mockResolvedValue({ role: 'SUPER_ADMIN', tenantId: null })

    const req = new NextRequest('http://localhost:3000/crm/tenant-1/customers')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/crm/login')
  })

  it('redirects when token tenantId mismatches path tenantId', async () => {
    const { getToken } = require('next-auth/jwt')
    getToken.mockResolvedValue({ role: 'MANAGER', tenantId: 'tenant-2' })

    const req = new NextRequest('http://localhost:3000/crm/tenant-1/customers')
    const res = await middleware(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/crm/tenant-2')
  })
})
