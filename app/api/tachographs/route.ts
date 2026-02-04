import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest, validateQuery } from '@/lib/validation/middleware'
import { createTachographSchema } from '@/lib/validation/schemas'
import { z } from 'zod'
import { logChange } from '@/lib/audit'

const WRITE_ROLES = new Set(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'])

const equipmentQuerySchema = z.object({
  vehicleId: z.string().cuid().optional(),
  customerId: z.string().cuid().optional(),
  type: z.enum(['TACHOGRAPH', 'GLONASS', 'OTHER']).optional(),
})

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

    const validation = validateQuery(request, equipmentQuerySchema)
    if (validation.error) return validation.error
    const query = validation.data

    const prisma = prismaTenant(tenantId)
    const where: {
      tenantId: string
      vehicleId?: string
      customerId?: string
      type?: 'TACHOGRAPH' | 'GLONASS' | 'OTHER'
    } = { tenantId }
    if (query.vehicleId) where.vehicleId = query.vehicleId
    if (query.customerId) where.customerId = query.customerId
    if (query.type) where.type = query.type

    const equipment = await prisma.tachograph.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle: { select: { id: true, govNumber: true } },
        customer: { select: { id: true, name: true } },
        skzi: { select: { id: true, serialNumber: true, expiryDate: true } },
      },
    })
    return NextResponse.json(equipment)
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
    if (!WRITE_ROLES.has(session.user.role)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, createTachographSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)

    // Обработка skziSerialNumber: найти или создать блок СКЗИ
    let finalSkziId: string | null = data.skziId ?? null
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
          const workDate = data.workDate
            ? typeof data.workDate === 'string'
              ? new Date(data.workDate)
              : data.workDate
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
    } else if (data.skziSerialNumber === '' || data.skziSerialNumber === null) {
      // Явное удаление привязки
      finalSkziId = null
    }

    const created = await prisma.tachograph.create({
      data: {
        tenantId,
        type: data.type ?? 'TACHOGRAPH',
        vehicleId: data.vehicleId ?? null,
        customerId: data.customerId ?? null,
        brand: data.brand ?? null,
        model: data.model ?? null,
        serialNumber: data.serialNumber ?? null,
        comment: data.comment ?? null,
        skziId: finalSkziId,
        batteryReplaced: data.batteryReplaced ?? false,
        w: data.w ?? null,
        k: data.k ?? null,
        l: data.l ?? null,
        workDate: data.workDate
          ? typeof data.workDate === 'string'
            ? new Date(data.workDate)
            : data.workDate
          : null,
        tireSize: data.tireSize ?? null,
      },
    })

    // Логируем создание
    await logChange({
      entityType: 'tachograph',
      entityId: created.id,
      action: 'CREATE',
      newData: {
        type: created.type,
        vehicleId: created.vehicleId,
        customerId: created.customerId,
        brand: created.brand,
        model: created.model,
        serialNumber: created.serialNumber,
        comment: created.comment,
        skziId: created.skziId,
        batteryReplaced: created.batteryReplaced,
        w: created.w,
        k: created.k,
        l: created.l,
        workDate: created.workDate,
        tireSize: created.tireSize,
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
