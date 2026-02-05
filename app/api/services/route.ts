import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant, prismaMaster } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createCatalogItemSchema } from '@/lib/validation/schemas'
import type { VatRate } from '@prisma/client'
import { hasRole } from '@/lib/authz'

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
    const items = await prisma.service.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(items)
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
    if (!hasRole(session.user, 'TENANT_ADMIN')) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, createCatalogItemSchema)
    if (validation.error) return validation.error
    const data = validation.data

    // Получаем defaultVatRate из tenant
    const tenant = await prismaMaster.tenant.findUnique({
      where: { id: tenantId },
      select: { defaultVatRate: true },
    })
    const defaultVatRate = (tenant?.defaultVatRate ?? 'VAT_22') as VatRate

    const prisma = prismaTenant(tenantId)
    const created = await prisma.service.create({
      data: {
        tenantId,
        name: data.name ?? '',
        sku: data.sku ?? null,
        unit: data.unit ?? null,
        price: typeof data.price === 'number' ? data.price : 0,
        vatRate: (data.vatRate ?? defaultVatRate) as VatRate,
        isActive: data.isActive ?? true,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
