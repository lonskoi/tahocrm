import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createVehicleCrmSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { normalizeGovNumberLike } from '@/lib/utils'
import { hasAnyRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'])

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

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const prisma = prismaTenant(tenantId)
    const vehicles = await prisma.vehicle.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, inn: true, type: true } },
        tachographs: { select: { id: true, serialNumber: true, model: true } },
      },
    })
    return NextResponse.json(vehicles)
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
    if (!hasAnyRole(session.user, WRITE_ROLES)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, createVehicleCrmSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const created = await prisma.vehicle.create({
      data: {
        tenantId,
        customerId: data.customerId ?? null,
        govNumber: normalizeGovNumberLike(data.govNumber ?? ''),
        vin: data.vin ?? null,
        color: data.color ?? null,
        brand: data.brand ?? null,
        model: data.model ?? null,
        year: data.year ?? null,
        ptsNumber: data.ptsNumber ?? null,
        category: data.category ?? null,
        ecoClass: data.ecoClass ?? null,
        ownerInn: data.ownerInn ?? null,
        ownerName: data.ownerName ?? null,
        ownerAddress: data.ownerAddress ?? null,
        mileage: data.mileage ?? null,
        tireSize: data.tireSize ?? null,
        notes: data.notes ?? null,
      },
    })

    // Логируем создание
    await logChange({
      entityType: 'vehicle',
      entityId: created.id,
      action: 'CREATE',
      newData: {
        customerId: created.customerId,
        govNumber: created.govNumber,
        vin: created.vin,
        color: created.color,
        brand: created.brand,
        model: created.model,
        year: created.year,
        ptsNumber: created.ptsNumber,
        category: created.category,
        ecoClass: created.ecoClass,
        ownerInn: created.ownerInn,
        ownerName: created.ownerName,
        ownerAddress: created.ownerAddress,
        mileage: created.mileage,
        tireSize: created.tireSize,
        notes: created.notes,
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
