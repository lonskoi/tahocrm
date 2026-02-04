/**
 * Unit tests for tenant access/limits logic (many branches)
 */

import { checkTenantAccess, checkTenantLimits } from '@/lib/tenant-check'

jest.mock('@/lib/prisma', () => ({
  prismaMaster: {
    tenant: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
  logDatabaseQuery: jest.fn(),
}))

describe('tenant-check', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkTenantAccess', () => {
    it('denies when tenantId is null', async () => {
      const res = await checkTenantAccess(null)
      expect(res.allowed).toBe(false)
    })

    it('denies when tenant not found', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue(null)

      const res = await checkTenantAccess('tenant-1')
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('Tenant not found')
    })

    it('denies when tenant is blocked', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        isActive: true,
        isBlocked: true,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: null,
        blockedReason: 'No pay',
      })

      const res = await checkTenantAccess('tenant-1')
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('No pay')
    })

    it('denies when tenant is inactive', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        isActive: false,
        isBlocked: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: null,
        blockedReason: null,
      })

      const res = await checkTenantAccess('tenant-1')
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('Tenant is inactive')
    })

    it('denies when subscription suspended', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        isActive: true,
        isBlocked: false,
        subscriptionStatus: 'SUSPENDED',
        subscriptionEndDate: null,
        blockedReason: null,
      })

      const res = await checkTenantAccess('tenant-1')
      expect(res.allowed).toBe(false)
      expect(String(res.reason)).toContain('Subscription is')
    })

    it('allows for active tenant', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        isActive: true,
        isBlocked: false,
        subscriptionStatus: 'ACTIVE',
        subscriptionEndDate: null,
        blockedReason: null,
      })

      const res = await checkTenantAccess('tenant-1')
      expect(res.allowed).toBe(true)
    })
  })

  describe('checkTenantLimits', () => {
    it('denies when tenant not found', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue(null)

      const res = await checkTenantLimits('tenant-1', 'users')
      expect(res.allowed).toBe(false)
    })

    it('denies when user limit reached', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        maxUsers: 1,
        maxVehicles: 1,
        maxOrdersPerMonth: 1,
        currentUsersCount: 1,
        currentVehiclesCount: 0,
        ordersThisMonth: 0,
        lastResetDate: new Date(),
      })

      const res = await checkTenantLimits('tenant-1', 'users')
      expect(res.allowed).toBe(false)
      expect(res.reason).toBe('User limit reached')
    })

    it('allows when vehicle limit ok', async () => {
      const { prismaMaster } = require('@/lib/prisma')
      prismaMaster.tenant.findUnique.mockResolvedValue({
        maxUsers: 10,
        maxVehicles: 10,
        maxOrdersPerMonth: 10,
        currentUsersCount: 0,
        currentVehiclesCount: 0,
        ordersThisMonth: 0,
        lastResetDate: new Date(),
      })

      const res = await checkTenantLimits('tenant-1', 'vehicles')
      expect(res.allowed).toBe(true)
    })
  })
})
