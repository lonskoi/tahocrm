import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateOrderCrmSchema } from '@/lib/validation/schemas'
import { hasAnyRole, hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'CARD_SPECIALIST'])

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
    const order = await prisma.order.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        contact: true,
        vehicle: true,
        tachograph: true,
        invoices: { orderBy: { createdAt: 'desc' }, include: { items: true } },
        documents: { orderBy: { createdAt: 'desc' } },
        driverCardRequests: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!order) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(order)
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

    const validation = await validateRequest(request, updateOrderCrmSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.order.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const updateData: any = {}
    if (data.number !== undefined) updateData.number = data.number ?? ''
    if (data.documentDate !== undefined)
      updateData.documentDate = data.documentDate ? new Date(data.documentDate) : new Date()
    if (data.type !== undefined) updateData.type = data.type ?? 'OTHER'
    if (data.status) updateData.status = data.status
    if (data.customerId !== undefined) updateData.customerId = data.customerId
    if (data.contactId !== undefined) updateData.contactId = data.contactId
    if (data.vehicleId !== undefined) updateData.vehicleId = data.vehicleId
    if (data.tachographId !== undefined) updateData.tachographId = data.tachographId
    if (data.description !== undefined) updateData.description = data.description
    if (data.comment !== undefined) updateData.comment = data.comment
    if (typeof data.totalAmount === 'number') updateData.totalAmount = data.totalAmount
    if (data.isPaid !== undefined) updateData.isPaid = data.isPaid
    if (data.isShipped !== undefined) updateData.isShipped = data.isShipped
    if (data.isDocumentsSigned !== undefined) updateData.isDocumentsSigned = data.isDocumentsSigned

    const updated = await prisma.$transaction(async tx => {
      const order = await tx.order.update({
        where: { id },
        data: updateData,
      })

      const driverCards = (data as any).driverCards as any[] | undefined
      if (driverCards) {
        if (!order.customerId) {
          throw new ApiError(
            400,
            'Чтобы сохранить заказ с картами водителей, сначала выберите или создайте клиента.',
            'VALIDATION_ERROR'
          )
        }

        const keepIds = driverCards.map(c => c.id).filter(Boolean) as string[]

        // delete removed rows
        await tx.driverCardRequest.deleteMany({
          where: {
            tenantId,
            orderId: id,
            ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
          },
        })

        // upsert existing/new
        const createdIds: string[] = []
        for (const c of driverCards) {
          const common = {
            tenantId,
            orderId: id,
            customerId: order.customerId!,
            status: c.status ?? 'DRAFT',
            driverFullName: c.driverFullName ?? null,
            driverPhone: c.driverPhone ?? null,
            applicationDate: c.applicationDate ? new Date(c.applicationDate) : null,
            receivedByDriverDate: c.receivedByDriverDate ? new Date(c.receivedByDriverDate) : null,
            expiryDate: c.expiryDate ? new Date(c.expiryDate) : null,
            cardNumber: c.cardNumber ?? null,
            pinPackCodes: c.pinPackCodes ?? null,
          }

          if (c.id) {
            await tx.driverCardRequest.update({
              where: { id: c.id },
              data: common as any,
            })
          } else {
            const created = await tx.driverCardRequest.create({
              data: { ...common, createdById: session.user.id } as any,
              select: { id: true },
            })
            createdIds.push(created.id)
          }
        }

        if (createdIds.length > 0) {
          const assignee = await tx.user.findFirst({
            where: { tenantId, role: 'CARD_SPECIALIST', isActive: true },
            select: { id: true },
          })

          for (const createdId of createdIds) {
            await tx.task.create({
              data: {
                tenantId,
                title: `Карта водителя: новая заявка`,
                description: `driverCardRequestId:${createdId}\nЗаказ: ${order.number}`,
                status: 'PENDING',
                creatorId: session.user.id,
                assigneeId: assignee?.id ?? null,
                orderId: order.id,
                customerId: order.customerId,
              },
            })
          }
        }
      }

      return order
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
    const existing = await prisma.order.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    await prisma.order.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
