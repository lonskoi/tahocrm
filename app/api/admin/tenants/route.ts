import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaMaster } from '@/lib/prisma'
import { logger, logApiRequest } from '@/lib/logger'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createTenantSchema } from '@/lib/validation/schemas'
import { tenantDbName, tenantDatabaseUrl, prismaTenant } from '@/lib/prisma'
import { Client } from 'pg'
import { spawn } from 'child_process'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('GET /api/admin/tenants - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('GET /api/admin/tenants - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    if (session.user.role !== 'SUPER_ADMIN') {
      logger.warn('GET /api/admin/tenants - Forbidden: not super admin', {
        userId: session.user.id,
        role: session.user.role,
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(403, 'Forbidden: Super admin access required', 'FORBIDDEN')
    }

    logApiRequest('GET', path, session.user.id, session.user.tenantId ?? undefined)

    logger.debug('GET /api/admin/tenants - Fetching tenants from database', {
      adminId: session.user.id,
      path,
      timestamp: new Date().toISOString(),
    })

    const tenants = await prismaMaster.tenant.findMany({
      include: {
        _count: {
          select: {
            users: true,
            vehicles: true,
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Преобразуем данные для фронтенда
    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      inn: tenant.inn,
      email: tenant.email,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionPlan: tenant.subscriptionPlan,
      subscriptionEndDate: tenant.subscriptionEndDate?.toISOString() || null,
      isActive: tenant.isActive,
      isBlocked: tenant.isBlocked,
      blockedReason: tenant.blockedReason,
      currentUsersCount: tenant.currentUsersCount,
      maxUsers: tenant.maxUsers,
      createdAt: tenant.createdAt.toISOString(),
    }))

    const duration = Date.now() - startTime
    logger.info('GET /api/admin/tenants - Success', {
      adminId: session.user.id,
      tenantCount: formattedTenants.length,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(formattedTenants)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('GET /api/admin/tenants - Error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })
    return handleApiError(error, {
      method: 'GET',
      path,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}

async function ensureDatabaseExists(adminUrl: string, dbName: string) {
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(`CREATE DATABASE "${dbName}"`)
  } catch (e: unknown) {
    // 42P04: duplicate_database
    const err = e as { code?: string }
    if (err?.code !== '42P04') throw e
  } finally {
    await client.end().catch(() => {})
  }
}

async function prismaDbPush(targetDatabaseUrl: string) {
  await new Promise<void>((resolve, reject) => {
    const child = spawn('npx', ['prisma', 'db', 'push'], {
      shell: true,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: targetDatabaseUrl },
    })
    let stderr = ''
    child.stderr.on('data', d => (stderr += String(d)))
    child.on('close', code => {
      if (code === 0) return resolve()
      reject(new Error(`prisma db push failed (${code}): ${stderr}`))
    })
  })
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('POST /api/admin/tenants - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    if (session.user.role !== 'SUPER_ADMIN') {
      throw new ApiError(403, 'Forbidden: Super admin access required', 'FORBIDDEN')
    }

    logApiRequest('POST', path, session.user.id, session.user.tenantId ?? undefined)

    const validation = await validateRequest(request, createTenantSchema)
    if (validation.error) return validation.error

    const { name, inn, email, subscriptionPlan, maxUsers } = validation.data

    if (!name || name.trim() === '') {
      throw new ApiError(400, 'Name is required', 'VALIDATION_ERROR')
    }

    const plan = subscriptionPlan?.toUpperCase()
    const safePlan: 'BASIC' | 'PROFESSIONAL' | 'ENTERPRISE' | undefined =
      plan === 'BASIC' || plan === 'PROFESSIONAL' || plan === 'ENTERPRISE' ? plan : undefined

    // 1) Create tenant registry record in master DB
    const tenant = await prismaMaster.tenant.create({
      data: {
        name: name.trim(),
        inn: inn ?? null,
        email: email ?? null,
        defaultVatRate: 'VAT_22',
        ...(safePlan ? { subscriptionPlan: safePlan } : {}),
        ...(typeof maxUsers === 'number' ? { maxUsers } : {}),
      },
    })

    // 2) Provision tenant DB (dev only / guarded)
    const allowProvision =
      process.env.ALLOW_DB_PROVISIONING === '1' || process.env.NODE_ENV !== 'production'
    if (allowProvision) {
      const adminUrl = process.env.DATABASE_URL_ADMIN
      if (!adminUrl) {
        throw new ApiError(500, 'DATABASE_URL_ADMIN is required for provisioning', 'CONFIG_ERROR')
      }

      const dbName = tenantDbName(tenant.id)
      await ensureDatabaseExists(adminUrl, dbName)

      const tenantUrl = tenantDatabaseUrl(tenant.id)
      await prismaDbPush(tenantUrl)

      // Ensure Tenant row exists inside tenant DB (FKs require it)
      const prisma = prismaTenant(tenant.id)
      await prisma.tenant.upsert({
        where: { id: tenant.id },
        update: {
          name: tenant.name,
          inn: tenant.inn,
          email: tenant.email,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          isActive: tenant.isActive,
          isBlocked: tenant.isBlocked,
          blockedReason: tenant.blockedReason,
          maxUsers: tenant.maxUsers,
          maxVehicles: tenant.maxVehicles,
          maxOrdersPerMonth: tenant.maxOrdersPerMonth,
          defaultVatRate: tenant.defaultVatRate,
        },
        create: {
          id: tenant.id,
          name: tenant.name,
          inn: tenant.inn,
          email: tenant.email,
          subscriptionPlan: tenant.subscriptionPlan,
          subscriptionStatus: tenant.subscriptionStatus,
          isActive: tenant.isActive,
          isBlocked: tenant.isBlocked,
          blockedReason: tenant.blockedReason,
          maxUsers: tenant.maxUsers,
          maxVehicles: tenant.maxVehicles,
          maxOrdersPerMonth: tenant.maxOrdersPerMonth,
          defaultVatRate: tenant.defaultVatRate,
        },
      })
    }

    const duration = Date.now() - startTime
    logger.info('POST /api/admin/tenants - Success', {
      adminId: session.user.id,
      tenantId: tenant.id,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    return handleApiError(error, {
      method: 'POST',
      path,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}
