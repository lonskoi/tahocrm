import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createCustomerSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { hasAnyRole, hasInvalidTenantSessionIdentity } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'CARD_SPECIALIST'])

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    const session = await auth()
    if (!session?.user) throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    if (hasInvalidTenantSessionIdentity(session.user)) {
      throw new ApiError(401, 'Invalid session identity. Please sign in again.', 'INVALID_SESSION')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const prisma = prismaTenant(tenantId)
    const customers = await prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { vehicles: true, orders: true, invoices: true },
        },
      },
    })

    return NextResponse.json(customers)
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
    if (hasInvalidTenantSessionIdentity(session.user)) {
      throw new ApiError(401, 'Invalid session identity. Please sign in again.', 'INVALID_SESSION')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId ?? undefined

    const tenantId = session.user.tenantId
    if (!tenantId) throw new ApiError(400, 'Tenant ID is required', 'TENANT_ID_REQUIRED')
    if (!hasAnyRole(session.user, WRITE_ROLES)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, createCustomerSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const created = await prisma.customer.create({
      data: {
        tenantId,
        type: data.type ?? 'COMPANY',
        name: data.name ?? '',
        fullName: data.fullName ?? null,
        inn: data.inn ?? null,
        kpp: data.kpp ?? null,
        ogrn: data.ogrn ?? null,
        okpo: data.okpo ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        middleName: data.middleName ?? null,
        passport: data.passport ?? null,
        address: data.address ?? null,
        addressComment: data.addressComment ?? null,
        legalAddress: data.legalAddress ?? null,
        phone: data.phone ?? null,
        email: data.email ?? null,
        comment: data.comment ?? null,
        businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null,
        businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null,
        createdById: session.user.id,
        responsibles: {
          create: [{ userId: session.user.id }],
        },
      },
    })

    // Логируем создание
    await logChange({
      entityType: 'customer',
      entityId: created.id,
      action: 'CREATE',
      newData: {
        type: created.type,
        name: created.name,
        fullName: created.fullName,
        inn: created.inn,
        kpp: created.kpp,
        ogrn: created.ogrn,
        okpo: created.okpo,
        firstName: created.firstName,
        lastName: created.lastName,
        middleName: created.middleName,
        passport: created.passport,
        address: created.address,
        addressComment: created.addressComment,
        legalAddress: created.legalAddress,
        phone: created.phone,
        email: created.email,
        comment: created.comment,
      },
      userId: session.user.id,
      tenantId,
      request,
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
