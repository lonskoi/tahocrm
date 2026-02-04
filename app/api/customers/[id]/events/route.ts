import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'

type CustomerEvent =
  | { kind: 'ORDER'; id: string; title: string; status: string; createdAt: string }
  | { kind: 'INVOICE'; id: string; title: string; status: string; createdAt: string }
  | {
      kind: 'DOCUMENT'
      id: string
      title: string
      status?: string
      createdAt: string
      fileUrl?: string
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

    const { id: customerId } = await context.params
    const prisma = prismaTenant(tenantId)

    const [orders, invoices, documents] = await Promise.all([
      prisma.order.findMany({
        where: { tenantId, customerId },
        select: { id: true, number: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.invoice.findMany({
        where: { tenantId, customerId },
        select: { id: true, number: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.document.findMany({
        where: { tenantId, customerId },
        select: { id: true, type: true, fileName: true, fileUrl: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const events: CustomerEvent[] = [
      ...orders.map(o => ({
        kind: 'ORDER' as const,
        id: o.id,
        title: o.number,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
      ...invoices.map(i => ({
        kind: 'INVOICE' as const,
        id: i.id,
        title: i.number,
        status: i.status,
        createdAt: i.createdAt.toISOString(),
      })),
      ...documents.map(d => ({
        kind: 'DOCUMENT' as const,
        id: d.id,
        title: d.fileName || d.type,
        createdAt: d.createdAt.toISOString(),
        fileUrl: d.fileUrl,
      })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))

    return NextResponse.json(events)
  } catch (error) {
    return handleApiError(error, { method: 'GET', path, userId, tenantId: tenantIdForLog })
  }
}
