import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateInvoiceSchema } from '@/lib/validation/schemas'
import type { VatRate } from '@prisma/client'
import { hasAnyRole, hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'])

function vatRateToNumber(rate: VatRate): number {
  if (rate === 'VAT_5') return 0.05
  if (rate === 'VAT_7') return 0.07
  if (rate === 'VAT_10') return 0.1
  if (rate === 'VAT_20') return 0.2
  if (rate === 'VAT_22') return 0.22
  return 0
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
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        customer: true,
        order: true,
        issuerOrganization: true,
        items: true,
        documents: { orderBy: { createdAt: 'desc' } },
      },
    })
    if (!invoice) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(invoice)
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

    const validation = await validateRequest(request, updateInvoiceSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // If items are provided, fully replace line items and recompute totals
    const updated = await prisma.$transaction(async tx => {
      let amount: number | undefined
      let taxAmount: number | undefined
      let totalAmount: number | undefined

      if (data.items) {
        await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id, tenantId } })
        const computed = data.items.map(i => {
          const qty = typeof i.quantity === 'number' ? i.quantity : 1
          const price = typeof i.price === 'number' ? i.price : 0
          const rate = (i.vatRate ?? 'VAT_20') as VatRate
          // Цена считается "с НДС": НДС выделяем из суммы, а не добавляем сверху
          const gross = price * qty
          const r = vatRateToNumber(rate)
          const vat = r > 0 ? (gross * r) / (1 + r) : 0
          const total = gross
          return {
            tenantId,
            invoiceId: id,
            productId: i.productId ?? null,
            serviceId: i.serviceId ?? null,
            name: i.name ?? '',
            quantity: qty,
            unit: i.unit ?? null,
            price,
            vatRate: rate,
            vatAmount: vat,
            totalAmount: total,
          }
        })

        if (computed.length > 0) {
          await tx.invoiceLineItem.createMany({ data: computed })
        }

        totalAmount = computed.reduce((s, i) => s + i.totalAmount, 0)
        taxAmount = computed.reduce((s, i) => s + i.vatAmount, 0)
        amount = totalAmount - taxAmount
      }

      return tx.invoice.update({
        where: { id },
        data: {
          ...(data.number !== undefined ? { number: data.number ?? '' } : {}),
          ...(data.updNumber !== undefined ? { updNumber: data.updNumber } : {}),
          ...(data.orderId !== undefined ? { orderId: data.orderId } : {}),
          ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
          ...(data.issuerOrganizationId !== undefined
            ? { issuerOrganizationId: data.issuerOrganizationId }
            : {}),
          ...(data.status ? { status: data.status } : {}),
          ...(data.issueDate ? { issueDate: new Date(data.issueDate) } : {}),
          ...(data.updDate !== undefined
            ? { updDate: data.updDate ? new Date(data.updDate) : null }
            : {}),
          ...(data.dueDate !== undefined
            ? { dueDate: data.dueDate ? new Date(data.dueDate) : null }
            : {}),
          ...(data.paidDate !== undefined
            ? { paidDate: data.paidDate ? new Date(data.paidDate) : null }
            : {}),
          ...(typeof amount === 'number' ? { amount } : {}),
          ...(typeof taxAmount === 'number' ? { taxAmount } : {}),
          ...(typeof totalAmount === 'number' ? { totalAmount } : {}),
          ...(data.isPaid !== undefined ? { isPaid: data.isPaid } : {}),
          ...(data.isShipped !== undefined ? { isShipped: data.isShipped } : {}),
          ...(data.isDocumentsSigned !== undefined
            ? { isDocumentsSigned: data.isDocumentsSigned }
            : {}),
        } as any,
      })
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
    const existing = await prisma.invoice.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    await prisma.invoice.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
