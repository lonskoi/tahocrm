import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateIssuerOrganizationSchema } from '@/lib/validation/schemas'
import { hasRole } from '@/lib/authz'

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
    if (!hasRole(session.user, 'TENANT_ADMIN')) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const validation = await validateRequest(request, updateIssuerOrganizationSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.issuerOrganization.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const updated = await prisma.$transaction(async tx => {
      if (data.isDefault) {
        await tx.issuerOrganization.updateMany({ where: { tenantId }, data: { isDefault: false } })
      }
      return tx.issuerOrganization.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name ?? '' } : {}),
          ...(data.inn !== undefined ? { inn: data.inn } : {}),
          ...(data.kpp !== undefined ? { kpp: data.kpp } : {}),
          ...(data.ogrn !== undefined ? { ogrn: data.ogrn } : {}),
          ...(data.address !== undefined ? { address: data.address } : {}),
          ...(data.phone !== undefined ? { phone: data.phone } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.bankName !== undefined ? { bankName: data.bankName } : {}),
          ...(data.bankBic !== undefined ? { bankBic: data.bankBic } : {}),
          ...(data.bankAccount !== undefined ? { bankAccount: data.bankAccount } : {}),
          ...(data.bankCorr !== undefined ? { bankCorr: data.bankCorr } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
          ...(data.businessCreatedAt !== undefined
            ? {
                businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null,
              }
            : {}),
          ...(data.businessUpdatedAt !== undefined
            ? {
                businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null,
              }
            : {}),
        },
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
    const existing = await prisma.issuerOrganization.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    await prisma.issuerOrganization.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
