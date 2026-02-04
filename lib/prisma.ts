import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

type GlobalPrisma = {
  prismaByUrl: Map<string, PrismaClient> | undefined
  // Some environments/types may mismatch `pg` Pool typings; we only need `end()` for cleanup.
  poolByUrl: Map<string, any> | undefined
}

const globalForPrisma = globalThis as unknown as GlobalPrisma

function getOrCreateMaps() {
  if (!globalForPrisma.prismaByUrl) globalForPrisma.prismaByUrl = new Map()
  if (!globalForPrisma.poolByUrl) globalForPrisma.poolByUrl = new Map()
  return { prismaByUrl: globalForPrisma.prismaByUrl, poolByUrl: globalForPrisma.poolByUrl }
}

function makeClient(connectionString: string): PrismaClient {
  const pool = new Pool({ connectionString })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

function getPrismaForUrl(connectionString: string): PrismaClient {
  // In production we avoid global caching to reduce cross-request state.
  if (process.env.NODE_ENV === 'production') {
    return makeClient(connectionString)
  }

  const { prismaByUrl } = getOrCreateMaps()
  const existing = prismaByUrl.get(connectionString)
  if (existing) return existing

  const created = makeClient(connectionString)
  prismaByUrl.set(connectionString, created)
  return created
}

function withDb(connectionString: string, dbName: string): string {
  const u = new URL(connectionString)
  u.pathname = `/${dbName}`
  return u.toString()
}

export function tenantDbName(tenantId: string): string {
  return `tahocrm_tenant_${tenantId}`
}

function getMasterDatabaseUrl(): string {
  // Приоритет: DATABASE_URL_MASTER > DATABASE_URL_ADMIN (с указанием БД) > дефолт
  // Игнорируем DATABASE_URL, если он указывает на Prisma Cloud или другой сервис (prisma+postgres://)

  if (process.env.DATABASE_URL_MASTER) {
    // Проверяем, что это не Prisma Cloud URL
    if (!process.env.DATABASE_URL_MASTER.startsWith('prisma+')) {
      return process.env.DATABASE_URL_MASTER
    }
  }

  if (process.env.DATABASE_URL_ADMIN) {
    // Проверяем, что это не Prisma Cloud URL
    if (!process.env.DATABASE_URL_ADMIN.startsWith('prisma+')) {
      return withDb(process.env.DATABASE_URL_ADMIN, 'tahocrm_master')
    }
  }

  // Проверяем DATABASE_URL только если это обычный postgresql:// URL
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
    try {
      const url = new URL(process.env.DATABASE_URL)
      if (url.pathname.includes('tahocrm_master')) {
        return process.env.DATABASE_URL
      }
      // Если нет, создаем URL с указанием master БД
      return withDb(process.env.DATABASE_URL, 'tahocrm_master')
    } catch {
      // Если невалидный URL, игнорируем
    }
  }

  // Дефолт для Docker Compose (из docker-compose.yml)
  return 'postgresql://user:password@localhost:5432/tahocrm_master'
}

export function tenantDatabaseUrl(tenantId: string): string {
  // Игнорируем Prisma Cloud URL, используем только обычные postgresql:// URL
  let baseUrl: string | undefined

  if (process.env.DATABASE_URL_ADMIN && !process.env.DATABASE_URL_ADMIN.startsWith('prisma+')) {
    baseUrl = process.env.DATABASE_URL_ADMIN
  } else if (
    process.env.DATABASE_URL_MASTER &&
    !process.env.DATABASE_URL_MASTER.startsWith('prisma+')
  ) {
    // Используем master URL как базу, но заменим БД на tenant БД
    const url = new URL(process.env.DATABASE_URL_MASTER)
    url.pathname = '/postgres' // Базовая БД для создания tenant БД
    baseUrl = url.toString()
  } else if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://')) {
    baseUrl = process.env.DATABASE_URL
  }

  // Дефолт для Docker Compose
  const defaultBase = baseUrl ?? 'postgresql://user:password@localhost:5432/postgres'
  return withDb(defaultBase, tenantDbName(tenantId))
}

// Создаем prismaMaster сразу с правильным URL (с fallback на дефолт)
// Это более надежно, чем Proxy, так как Prisma Client требует прямой доступ к свойствам
const masterDatabaseUrl = getMasterDatabaseUrl()
export const prismaMaster = getPrismaForUrl(masterDatabaseUrl)

export function prismaTenant(tenantId: string): PrismaClient {
  return getPrismaForUrl(tenantDatabaseUrl(tenantId))
}

/**
 * Очищает кеш Prisma Client для всех URL
 * Полезно в dev режиме после изменения схемы Prisma
 */
export function clearPrismaCache(): void {
  const { prismaByUrl, poolByUrl } = getOrCreateMaps()

  // Отключаем все существующие клиенты
  if (prismaByUrl) {
    for (const client of prismaByUrl.values()) {
      client.$disconnect().catch(() => {
        // Игнорируем ошибки при отключении
      })
    }
    prismaByUrl.clear()
  }

  // Закрываем все пулы соединений
  if (poolByUrl) {
    for (const pool of poolByUrl.values()) {
      pool.end().catch(() => {
        // Игнорируем ошибки при закрытии
      })
    }
    poolByUrl.clear()
  }
}

/**
 * Пересоздает prismaMaster с новым Prisma Client
 * Используется после перегенерации Prisma Client
 */
export function reloadPrismaMaster(): PrismaClient {
  const { prismaByUrl } = getOrCreateMaps()
  const url = getMasterDatabaseUrl()

  // Удаляем старый клиент из кеша
  const oldClient = prismaByUrl.get(url)
  if (oldClient) {
    oldClient.$disconnect().catch(() => {})
    prismaByUrl.delete(url)
  }

  // Создаем новый клиент
  return getPrismaForUrl(url)
}
