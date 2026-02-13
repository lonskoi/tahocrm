import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess, checkTenantLimits } from '@/lib/tenant-check'
import { validateRequest } from '@/lib/validation/middleware'
import { createUserSchema } from '@/lib/validation/schemas'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import bcrypt from 'bcryptjs'
import { hasAnyRole, hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    if (!hasAnyRole(session.user, ['TENANT_ADMIN', 'DIRECTOR'])) {
      throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
    }

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const prisma = prismaTenant(tenantId)
    const users = await prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        roles: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        businessCreatedAt: true,
        businessUpdatedAt: true,
        lastLogin: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(users)
  } catch (error) {
    return handleApiError(error, { method: 'GET', path, userId, tenantId: tenantIdForLog })
  }
}

export async function POST(request: NextRequest) {
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    if (!hasRole(session.user, 'TENANT_ADMIN')) {
      throw new ApiError(403, 'Forbidden', 'FORBIDDEN')
    }

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const limits = await checkTenantLimits(tenantId, 'users')
    if (!limits.allowed) {
      throw new ApiError(403, limits.reason || 'User limit reached', 'TENANT_LIMITS', {
        current: limits.current,
        max: limits.max,
      })
    }

    const validation = await validateRequest(request, createUserSchema)
    if (validation.error) return validation.error
    const {
      email,
      password,
      name,
      phone,
      role,
      roles,
      isActive,
      businessCreatedAt,
      businessUpdatedAt,
    } = validation.data

    if (role === 'SUPER_ADMIN') {
      throw new ApiError(400, 'Invalid role', 'INVALID_ROLE')
    }
    if (Array.isArray(roles) && roles.includes('SUPER_ADMIN')) {
      throw new ApiError(400, 'Invalid role', 'INVALID_ROLE')
    }

    const extraRoles = Array.from(
      new Set((roles ?? []).filter(r => r !== 'SUPER_ADMIN' && r !== role))
    ) as UserRole[]

    const prisma = prismaTenant(tenantId)
    const hashedPassword = await bcrypt.hash(password, 10)

    const created = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        phone: phone ?? null,
        role,
        roles: extraRoles,
        tenantId,
        isActive: isActive ?? true,
        businessCreatedAt: businessCreatedAt ? new Date(businessCreatedAt) : null,
        businessUpdatedAt: businessUpdatedAt ? new Date(businessUpdatedAt) : null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        roles: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        businessCreatedAt: true,
        businessUpdatedAt: true,
        lastLogin: true,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
