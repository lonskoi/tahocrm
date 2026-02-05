import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateTachographSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { hasAnyRole } from '@/lib/authz'
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
    const equipment = await prisma.tachograph.findFirst({
      where: { id, tenantId },
      include: {
        vehicle: { select: { id: true, govNumber: true } },
        customer: { select: { id: true, name: true } },
        skzi: { select: { id: true, serialNumber: true, expiryDate: true } },
      },
    })
    if (!equipment) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(equipment)
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

    const validation = await validateRequest(request, updateTachographSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.tachograph.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // Получаем старые данные для логирования
    const oldData = await prisma.tachograph.findFirst({
      where: { id, tenantId },
      select: {
        type: true,
        vehicleId: true,
        customerId: true,
        brand: true,
        model: true,
        serialNumber: true,
        comment: true,
        skziId: true,
        batteryReplaced: true,
        w: true,
        k: true,
        l: true,
        workDate: true,
        tireSize: true,
      },
    })

    // Обработка skziSerialNumber: найти или создать блок СКЗИ
    let finalSkziId: string | null | undefined = data.skziId
    if (data.skziSerialNumber !== undefined) {
      if (data.skziSerialNumber && data.skziSerialNumber.trim() !== '') {
        // Приоритет: если передан и skziId и skziSerialNumber, используем skziId
        if (!finalSkziId) {
          const serialNumber = data.skziSerialNumber.trim()
          // Ищем существующий блок по номеру
          const existingSkzi = await prisma.sKZI.findFirst({
            where: { tenantId, serialNumber },
          })
          if (existingSkzi) {
            finalSkziId = existingSkzi.id
          } else {
            // Создаем новый блок СКЗИ
            const workDate =
              data.workDate !== undefined
                ? data.workDate
                  ? typeof data.workDate === 'string'
                    ? new Date(data.workDate)
                    : data.workDate
                  : null
                : null
            const newSkzi = await prisma.sKZI.create({
              data: {
                tenantId,
                serialNumber,
                activationDate: workDate,
                expiryDate: workDate
                  ? new Date(new Date(workDate).setMonth(new Date(workDate).getMonth() + 35))
                  : null,
                isActive: true,
              },
            })
            finalSkziId = newSkzi.id
          }
        }
      } else {
        // Явное удаление привязки
        finalSkziId = null
      }
    }

    const updated = await prisma.tachograph.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.vehicleId !== undefined ? { vehicleId: data.vehicleId } : {}),
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.brand !== undefined ? { brand: data.brand } : {}),
        ...(data.model !== undefined ? { model: data.model } : {}),
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
        ...(finalSkziId !== undefined ? { skziId: finalSkziId } : {}),
        ...(data.batteryReplaced !== undefined ? { batteryReplaced: data.batteryReplaced } : {}),
        ...(data.w !== undefined ? { w: data.w } : {}),
        ...(data.k !== undefined ? { k: data.k } : {}),
        ...(data.l !== undefined ? { l: data.l } : {}),
        ...(data.workDate !== undefined
          ? {
              workDate: data.workDate
                ? typeof data.workDate === 'string'
                  ? new Date(data.workDate)
                  : data.workDate
                : null,
            }
          : {}),
        ...(data.tireSize !== undefined ? { tireSize: data.tireSize } : {}),
      },
    })

    // Логируем изменение
    await logChange({
      entityType: 'tachograph',
      entityId: id,
      action: 'UPDATE',
      oldData: oldData ?? null,
      newData: {
        type: updated.type,
        vehicleId: updated.vehicleId,
        customerId: updated.customerId,
        brand: updated.brand,
        model: updated.model,
        serialNumber: updated.serialNumber,
        comment: updated.comment,
        skziId: updated.skziId,
        batteryReplaced: updated.batteryReplaced,
        w: updated.w,
        k: updated.k,
        l: updated.l,
        workDate: updated.workDate,
        tireSize: updated.tireSize,
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
    if (!hasAnyRole(session.user, WRITE_ROLES)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.tachograph.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    await prisma.tachograph.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
