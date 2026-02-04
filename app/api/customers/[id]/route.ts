import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateCustomerSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'

const WRITE_ROLES = new Set(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'])

async function canEditCustomer(
  prisma: ReturnType<typeof prismaTenant>,
  tenantId: string,
  customerId: string,
  user: { id: string; role: string }
) {
  if (WRITE_ROLES.has(user.role)) return true
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      createdById: true,
      responsibles: { where: { userId: user.id }, select: { userId: true } },
    },
  })
  if (!customer) throw new ApiError(404, 'Not found', 'NOT_FOUND')
  return customer.createdById === user.id || customer.responsibles.length > 0
}

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
    const customer = await prisma.customer.findFirst({
      where: { id, tenantId },
      include: {
        contacts: true,
        bankAccounts: { orderBy: { createdAt: 'desc' } },
        createdBy: { select: { id: true, name: true, role: true } },
        responsibles: { include: { user: { select: { id: true, name: true, role: true } } } },
        vehicles: {
          orderBy: { createdAt: 'desc' },
          include: {
            tachographs: {
              select: {
                id: true,
                serialNumber: true,
                model: true,
                skzi: { select: { id: true, serialNumber: true } },
              },
            },
            calibrationHistory: {
              orderBy: { calibrationDate: 'desc' },
              take: 1,
              select: {
                w: true,
                k: true,
                l: true,
                calibrationDate: true,
              },
            },
          },
        },
        orders: { orderBy: { createdAt: 'desc' }, take: 20 },
        invoices: { orderBy: { createdAt: 'desc' }, take: 20 },
        documents: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!customer) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(customer)
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
    if (!WRITE_ROLES.has(session.user.role)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, updateCustomerSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const allowed = await canEditCustomer(prisma, tenantId, id, {
      id: session.user.id,
      role: session.user.role,
    })
    if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    // Получаем старые данные для логирования
    const oldData = await prisma.customer.findFirst({
      where: { id, tenantId },
      select: {
        type: true,
        name: true,
        fullName: true,
        inn: true,
        kpp: true,
        ogrn: true,
        okpo: true,
        firstName: true,
        lastName: true,
        middleName: true,
        passport: true,
        address: true,
        addressComment: true,
        legalAddress: true,
        phone: true,
        email: true,
        comment: true,
      },
    })

    const updated = await prisma.customer.update({
      where: { id },
      data: {
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.name !== undefined ? { name: data.name ?? '' } : {}),
        ...(data.fullName !== undefined ? { fullName: data.fullName } : {}),
        ...(data.inn !== undefined ? { inn: data.inn } : {}),
        ...(data.kpp !== undefined ? { kpp: data.kpp } : {}),
        ...(data.ogrn !== undefined ? { ogrn: data.ogrn } : {}),
        ...(data.okpo !== undefined ? { okpo: data.okpo } : {}),
        ...(data.firstName !== undefined ? { firstName: data.firstName } : {}),
        ...(data.lastName !== undefined ? { lastName: data.lastName } : {}),
        ...(data.middleName !== undefined ? { middleName: data.middleName } : {}),
        ...(data.passport !== undefined ? { passport: data.passport } : {}),
        ...(data.address !== undefined ? { address: data.address } : {}),
        ...(data.addressComment !== undefined ? { addressComment: data.addressComment } : {}),
        ...(data.legalAddress !== undefined ? { legalAddress: data.legalAddress } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
      },
    })

    // Логируем изменение
    await logChange({
      entityType: 'customer',
      entityId: id,
      action: 'UPDATE',
      oldData: oldData ?? null,
      newData: {
        type: updated.type,
        name: updated.name,
        fullName: updated.fullName,
        inn: updated.inn,
        kpp: updated.kpp,
        ogrn: updated.ogrn,
        okpo: updated.okpo,
        firstName: updated.firstName,
        lastName: updated.lastName,
        middleName: updated.middleName,
        passport: updated.passport,
        address: updated.address,
        addressComment: updated.addressComment,
        legalAddress: updated.legalAddress,
        phone: updated.phone,
        email: updated.email,
        comment: updated.comment,
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
    if (session.user.role !== 'TENANT_ADMIN') throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.customer.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        type: true,
        name: true,
        fullName: true,
        inn: true,
        kpp: true,
        ogrn: true,
        okpo: true,
        firstName: true,
        lastName: true,
        middleName: true,
        passport: true,
        address: true,
        addressComment: true,
        legalAddress: true,
        phone: true,
        email: true,
        comment: true,
      },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    await prisma.customer.delete({ where: { id } })

    // Логируем удаление
    await logChange({
      entityType: 'customer',
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
