import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createOrderCrmSchema } from '@/lib/validation/schemas'
import { nextDocumentNumber } from '@/lib/documents/numbering'
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
    const orders = await prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, inn: true, type: true } },
        contact: { select: { id: true, name: true } },
        vehicle: { select: { id: true, govNumber: true, vin: true } },
        tachograph: { select: { id: true, serialNumber: true, model: true } },
        invoices: {
          select: {
            id: true,
            totalAmount: true,
            isPaid: true,
            isShipped: true,
            isDocumentsSigned: true,
          },
          take: 1,
          orderBy: { createdAt: 'desc' as const },
        },
      },
    })
    return NextResponse.json(orders)
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

    const validation = await validateRequest(request, createOrderCrmSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const created = await prisma.$transaction(async tx => {
      const documentDate = data.documentDate ? new Date(data.documentDate) : new Date()
      const number =
        data.number ?? (await nextDocumentNumber(tx as any, tenantId, 'ORDER', documentDate))

      const order = await tx.order.create({
        data: {
          tenantId,
          number,
          documentDate,
          type: (data.type ?? 'OTHER') as
            | 'SKZI_REPLACEMENT'
            | 'CALIBRATION'
            | 'BATTERY_REPLACEMENT'
            | 'CARD_ISSUE'
            | 'CUSTOMER_ORDER'
            | 'OTHER',
          status: data.status ?? 'DRAFT',
          customerId: data.customerId ?? null,
          contactId: data.contactId ?? null,
          vehicleId: data.vehicleId ?? null,
          tachographId: data.tachographId ?? null,
          description: data.description ?? null,
          comment: data.comment ?? null,
          totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
          isPaid: data.isPaid ?? false,
          isShipped: data.isShipped ?? false,
          isDocumentsSigned: data.isDocumentsSigned ?? false,
          businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null,
          businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null,
          createdById: session.user.id,
        },
      })

      const driverCards = (data as any).driverCards as any[] | undefined
      if (driverCards && driverCards.length > 0) {
        if (!order.customerId) {
          throw new ApiError(
            400,
            'Чтобы сохранить заказ с картами водителей, сначала выберите или создайте клиента.',
            'VALIDATION_ERROR'
          )
        }

        const assignee = await tx.user.findFirst({
          where: { tenantId, role: 'CARD_SPECIALIST', isActive: true },
          select: { id: true },
        })

        for (const c of driverCards) {
          const createdCard = await tx.driverCardRequest.create({
            data: {
              tenantId,
              orderId: order.id,
              customerId: order.customerId!,
              createdById: session.user.id,
              status: c.status ?? 'DRAFT',
              driverFullName: c.driverFullName ?? null,
              driverPhone: c.driverPhone ?? null,
              applicationDate: c.applicationDate ? new Date(c.applicationDate) : null,
              receivedByDriverDate: c.receivedByDriverDate
                ? new Date(c.receivedByDriverDate)
                : null,
              expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
              cardNumber: c.cardNumber ?? null,
              pinPackCodes: c.pinPackCodes ?? null,
              businessCreatedAt: c.businessCreatedAt ? new Date(c.businessCreatedAt) : null,
              businessUpdatedAt: c.businessUpdatedAt ? new Date(c.businessUpdatedAt) : null,
            } as any,
            select: { id: true },
          })

          await tx.task.create({
            data: {
              tenantId,
              title: `Карта водителя: ${c.driverFullName || 'без ФИО'}`,
              description: `driverCardRequestId:${createdCard.id}\nЗаказ: ${order.number}`,
              status: 'PENDING',
              creatorId: session.user.id,
              assigneeId: assignee?.id ?? null,
              orderId: order.id,
              customerId: order.customerId,
            },
          })
        }
      }

      return order
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
