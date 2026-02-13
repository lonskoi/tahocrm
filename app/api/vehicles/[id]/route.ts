import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateVehicleCrmSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { normalizeGovNumberLike } from '@/lib/utils'
import { hasAnyRole, hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'])

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const vehicle = await prisma.vehicle.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        tachographs: {
          include: {
            customer: { select: { id: true, name: true } },
            skzi: { select: { id: true, serialNumber: true } },
          },
        },
        calibrationHistory: { orderBy: { calibrationDate: 'desc' }, take: 1 },
        orders: { orderBy: { createdAt: 'desc' }, take: 20 },
        documents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!vehicle) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const lastCalibration =
      Array.isArray(vehicle.calibrationHistory) && vehicle.calibrationHistory.length > 0
        ? vehicle.calibrationHistory[0]
        : null
    const withComputed = {
      ...vehicle,
      lastCalibration,
      currentW: lastCalibration?.w ?? null,
      currentK: lastCalibration?.k ?? null,
      currentL: lastCalibration?.l ?? null,
      lastCalibrationDate: lastCalibration?.calibrationDate
        ? lastCalibration.calibrationDate.toISOString()
        : null,
    }
    return NextResponse.json(withComputed)
  } catch (error) {
    return handleApiError(error, { method: 'GET', path, userId, tenantId: tenantIdForLog })
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const validation = await validateRequest(request, updateVehicleCrmSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.vehicle.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // Получаем старые данные для логирования
    const oldData = await prisma.vehicle.findFirst({
      where: { id, tenantId },
      select: {
        customerId: true,
        govNumber: true,
        vin: true,
        color: true,
        brand: true,
        model: true,
        year: true,
        ptsNumber: true,
        category: true,
        ecoClass: true,
        ownerInn: true,
        ownerName: true,
        ownerAddress: true,
        mileage: true,
        tireSize: true,
        notes: true,
      },
    })

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.govNumber !== undefined
          ? { govNumber: normalizeGovNumberLike(data.govNumber ?? '') }
          : {}),
        ...(data.vin !== undefined ? { vin: data.vin } : {}),
        ...(data.color !== undefined ? { color: data.color } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.year !== undefined ? { year: data.year } : {}),
        ...(data.ptsNumber !== undefined ? { ptsNumber: data.ptsNumber } : {}),
        ...(data.category !== undefined ? { category: data.category } : {}),
        ...(data.ecoClass !== undefined ? { ecoClass: data.ecoClass } : {}),
        ...(data.ownerInn !== undefined ? { ownerInn: data.ownerInn } : {}),
        ...(data.ownerName !== undefined ? { ownerName: data.ownerName } : {}),
        ...(data.ownerAddress !== undefined ? { ownerAddress: data.ownerAddress } : {}),
        ...(data.mileage !== undefined ? { mileage: data.mileage } : {}),
        ...(data.tireSize !== undefined ? { tireSize: data.tireSize } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.businessCreatedAt !== undefined
          ? { businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null }
          : {}),
        ...(data.businessUpdatedAt !== undefined
          ? { businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null }
          : {}),
      },
    })

    // Логируем изменение
    await logChange({
      entityType: 'vehicle',
      entityId: id,
      action: 'UPDATE',
      oldData: oldData ?? null,
      newData: {
        customerId: updated.customerId,
        govNumber: updated.govNumber,
        vin: updated.vin,
        color: updated.color,
        brand: updated.brand,
        model: updated.model,
        year: updated.year,
        ptsNumber: updated.ptsNumber,
        category: updated.category,
        ecoClass: updated.ecoClass,
        ownerInn: updated.ownerInn,
        ownerName: updated.ownerName,
        ownerAddress: updated.ownerAddress,
        mileage: updated.mileage,
        tireSize: updated.tireSize,
        notes: updated.notes,
      },
      userId: session.user.id,
      tenantId,
      request,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, { method: 'PATCH', path, userId, tenantId: tenantIdForLog })
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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
    if (!hasRole(session.user, 'TENANT_ADMIN')) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.vehicle.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        customerId: true,
        govNumber: true,
        vin: true,
        color: true,
        brand: true,
        model: true,
        year: true,
        ptsNumber: true,
        category: true,
        ecoClass: true,
        ownerInn: true,
        ownerName: true,
        ownerAddress: true,
        mileage: true,
        tireSize: true,
        notes: true,
      },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    await prisma.vehicle.delete({ where: { id } })

    // Логируем удаление
    await logChange({
      entityType: 'vehicle',
      entityId: id,
      action: 'DELETE',
      oldData: existing,
      userId: session.user.id,
      tenantId,
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
