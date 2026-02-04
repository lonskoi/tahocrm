/**
 * Unit тесты для lib/prisma (без реального подключения к БД)
 */

describe('lib/prisma', () => {
  beforeEach(() => {
    jest.resetModules()
    process.env.DATABASE_URL_ADMIN = 'postgresql://user:password@localhost:5432/postgres'
    process.env.DATABASE_URL_MASTER = 'postgresql://user:password@localhost:5432/tahocrm_master'
    process.env.DATABASE_URL = process.env.DATABASE_URL_MASTER
  })

  it('строит имя tenant DB', async () => {
    jest.doMock('pg', () => ({ Pool: class Pool {} }))
    jest.doMock('@prisma/adapter-pg', () => ({ PrismaPg: class PrismaPg {} }))
    jest.doMock('@prisma/client', () => ({
      PrismaClient: class PrismaClient {
        constructor() {}
      },
    }))

    const { tenantDbName } = await import('@/lib/prisma')
    expect(tenantDbName('tenant-1')).toBe('tahocrm_tenant_tenant-1')
  })

  it('строит tenant DATABASE_URL из admin/master URL', async () => {
    jest.doMock('pg', () => ({ Pool: class Pool {} }))
    jest.doMock('@prisma/adapter-pg', () => ({ PrismaPg: class PrismaPg {} }))
    jest.doMock('@prisma/client', () => ({
      PrismaClient: class PrismaClient {
        constructor() {}
      },
    }))

    const { tenantDatabaseUrl } = await import('@/lib/prisma')
    expect(tenantDatabaseUrl('tenant-1')).toContain('/tahocrm_tenant_tenant-1')
  })

  it('кеширует prismaTenant по URL в non-production', async () => {
    jest.doMock('pg', () => ({
      Pool: class Pool {
        constructor(public config?: unknown) {}
      },
    }))
    jest.doMock('@prisma/adapter-pg', () => ({
      PrismaPg: class PrismaPg {
        constructor(public pool?: unknown) {}
      },
    }))
    jest.doMock('@prisma/client', () => ({
      PrismaClient: class PrismaClient {
        public opts: unknown
        constructor(opts?: unknown) {
          this.opts = opts
        }
      },
    }))

    const { prismaTenant } = await import('@/lib/prisma')
    const a = prismaTenant('tenant-1')
    const b = prismaTenant('tenant-1')
    expect(a).toBe(b)
  })

  it('создаёт prismaMaster из DATABASE_URL_MASTER', async () => {
    jest.doMock('pg', () => ({ Pool: class Pool {} }))
    jest.doMock('@prisma/adapter-pg', () => ({ PrismaPg: class PrismaPg {} }))
    const PrismaClientMock = class PrismaClient {
      constructor() {}
    }
    jest.doMock('@prisma/client', () => ({ PrismaClient: PrismaClientMock }))

    const { prismaMaster } = await import('@/lib/prisma')
    expect(prismaMaster).toBeTruthy()
    expect(typeof prismaMaster).toBe('object')
    expect((prismaMaster as { constructor?: { name?: string } }).constructor?.name).toBe(
      'PrismaClient'
    )
  })
})
