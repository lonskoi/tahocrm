import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createDocumentSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { hasAnyRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>([
  'TENANT_ADMIN',
  'DIRECTOR',
  'MANAGER',
  'MASTER',
  'CARD_SPECIALIST',
])

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

    const customerId = request.nextUrl.searchParams.get('customerId')
    const orderId = request.nextUrl.searchParams.get('orderId')
    const invoiceId = request.nextUrl.searchParams.get('invoiceId')
    const vehicleId = request.nextUrl.searchParams.get('vehicleId')
    const tachographId = request.nextUrl.searchParams.get('tachographId')

    const prisma = prismaTenant(tenantId)
    const docs = await prisma.document.findMany({
      where: {
        tenantId,
        ...(customerId ? { customerId } : {}),
        ...(orderId ? { orderId } : {}),
        ...(invoiceId ? { invoiceId } : {}),
        ...(vehicleId ? { vehicleId } : {}),
        ...(tachographId ? { tachographId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(docs)
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

    const validation = await validateRequest(request, createDocumentSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const created = await prisma.document.create({
      data: {
        tenantId,
        type: data.type ?? 'OTHER',
        title: data.title ?? null,
        fileUrl: data.fileUrl ?? '',
        fileName: data.fileName ?? '',
        mimeType: data.mimeType ?? null,
        customerId: data.customerId ?? null,
        orderId: data.orderId ?? null,
        invoiceId: data.invoiceId ?? null,
        vehicleId: data.vehicleId ?? null,
        tachographId: data.tachographId ?? null,
        businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null,
        businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null,
        createdById: session.user.id,
      },
    })

    // Логируем создание
    await logChange({
      entityType: 'document',
      entityId: created.id,
      action: 'CREATE',
      newData: {
        type: created.type,
        title: created.title,
        fileUrl: created.fileUrl,
        fileName: created.fileName,
        mimeType: created.mimeType,
        customerId: created.customerId,
        orderId: created.orderId,
        invoiceId: created.invoiceId,
        vehicleId: created.vehicleId,
        tachographId: created.tachographId,
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
