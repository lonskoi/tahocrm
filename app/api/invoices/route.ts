import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createInvoiceSchema } from '@/lib/validation/schemas'
import type { VatRate } from '@prisma/client'
import { nextDocumentNumber } from '@/lib/documents/numbering'
import { hasAnyRole } from '@/lib/authz'
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
    const invoices = await prisma.invoice.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, inn: true, type: true } },
        order: { select: { id: true, number: true, status: true, type: true } },
        issuerOrganization: { select: { id: true, name: true } },
        items: true,
      },
    })
    return NextResponse.json(invoices)
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

    const validation = await validateRequest(request, createInvoiceSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)

    const itemsInput = data.items ?? []
    const computed = itemsInput.map(i => {
      const qty = typeof i.quantity === 'number' ? i.quantity : 1
      const price = typeof i.price === 'number' ? i.price : 0
      const rate = (i.vatRate ?? 'VAT_20') as VatRate
      // Цена считается "с НДС": НДС выделяем из суммы, а не добавляем сверху
      const gross = price * qty
      const r = vatRateToNumber(rate)
      const vat = r > 0 ? (gross * r) / (1 + r) : 0
      const total = gross
      return {
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

    // amount = без НДС (net), taxAmount = НДС, totalAmount = с НДС (gross)
    const totalAmount = computed.reduce((s, i) => s + i.totalAmount, 0)
    const taxAmount = computed.reduce((s, i) => s + i.vatAmount, 0)
    const amount = totalAmount - taxAmount

    const created = await prisma.$transaction(async tx => {
      const issueDate = data.issueDate ? new Date(data.issueDate) : new Date()
      const number =
        data.number ?? (await nextDocumentNumber(tx as any, tenantId, 'INVOICE', issueDate))
      const updNumber =
        data.updNumber ?? (await nextDocumentNumber(tx as any, tenantId, 'UPD', issueDate))
      const updDate = data.updDate ? new Date(data.updDate) : issueDate

      const invoice = await tx.invoice.create({
        data: {
          tenantId,
          number,
          orderId: data.orderId ?? null,
          customerId: data.customerId ?? null,
          issuerOrganizationId: data.issuerOrganizationId ?? null,
          status: data.status ?? 'DRAFT',
          amount,
          taxAmount,
          totalAmount,
          issueDate,
          updNumber,
          updDate,
          dueDate: data.dueDate ? new Date(data.dueDate) : null,
          paidDate: data.paidDate ? new Date(data.paidDate) : null,
          isPaid: data.isPaid ?? false,
          isShipped: data.isShipped ?? false,
          isDocumentsSigned: data.isDocumentsSigned ?? false,
          businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null,
          businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null,
        } as any,
      })

      if (computed.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: computed.map(i => ({
            tenantId,
            invoiceId: invoice.id,
            productId: i.productId,
            serviceId: i.serviceId,
            name: i.name,
            quantity: i.quantity,
            unit: i.unit,
            price: i.price,
            vatRate: i.vatRate,
            vatAmount: i.vatAmount,
            totalAmount: i.totalAmount,
          })),
        })
      }

      return invoice
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
