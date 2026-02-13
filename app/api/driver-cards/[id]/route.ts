import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateDriverCardRequestSchema } from '@/lib/validation/schemas'
import { hasAnyRole } from '@/lib/authz'
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
    if (!hasAnyRole(session.user, WRITE_ROLES)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const row = await prisma.driverCardRequest.findFirst({
      where: { id, tenantId },
      include: {
        customer: { select: { id: true, name: true, inn: true } },
        order: { select: { id: true, number: true, isPaid: true, createdAt: true } },
      },
    })
    if (!row) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(row)
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

    const { id } = await context.params
    const validation = await validateRequest(request, updateDriverCardRequestSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.driverCardRequest.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const updated = await prisma.driverCardRequest.update({
      where: { id },
      data: {
        ...(data.status !== undefined ? { status: data.status } : {}),
        ...(data.driverFullName !== undefined ? { driverFullName: data.driverFullName } : {}),
        ...(data.driverPhone !== undefined ? { driverPhone: data.driverPhone } : {}),
        ...(data.applicationDate !== undefined
          ? { applicationDate: data.applicationDate ? new Date(data.applicationDate) : null }
          : {}),
        ...(data.receivedByDriverDate !== undefined
          ? {
              receivedByDriverDate: data.receivedByDriverDate
                ? new Date(data.receivedByDriverDate)
                : null,
            }
          : {}),
        ...(data.expiryDate !== undefined
          ? { expiryDate: data.expiryDate ? new Date(data.expiryDate) : null }
          : {}),
        ...(data.cardNumber !== undefined ? { cardNumber: data.cardNumber } : {}),
        ...(data.pinPackCodes !== undefined ? { pinPackCodes: data.pinPackCodes } : {}),
        ...(data.businessCreatedAt !== undefined
          ? { businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null }
          : {}),
        ...(data.businessUpdatedAt !== undefined
          ? { businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null }
          : {}),
      } as any,
    })

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, { method: 'PATCH', path, userId, tenantId: tenantIdForLog })
  }
}
