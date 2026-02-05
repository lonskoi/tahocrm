import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { z } from 'zod'
import { hasAnyRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'])

const updateSkziSchema = z.object({
  serialNumber: z.string().trim().max(100).optional().nullable(),
  activationDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform(v => (v === '' || v === null ? null : v ? new Date(v) : null)),
  expiryDate: z
    .string()
    .datetime()
    .optional()
    .nullable()
    .transform(v => (v === '' || v === null ? null : v ? new Date(v) : null)),
  isActive: z.boolean().optional(),
  mchd: z.string().trim().max(100).optional().nullable(),
})

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
    const skzi = await prisma.sKZI.findFirst({
      where: { id, tenantId },
      include: {
        tachographs: {
          select: { id: true, serialNumber: true, vehicleId: true, customerId: true },
        },
      },
    })
    if (!skzi) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    return NextResponse.json(skzi)
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

    const validation = await validateRequest(request, updateSkziSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.sKZI.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const updated = await prisma.sKZI.update({
      where: { id },
      data: {
        ...(data.serialNumber !== undefined ? { serialNumber: data.serialNumber } : {}),
        ...(data.activationDate !== undefined ? { activationDate: data.activationDate } : {}),
        ...(data.expiryDate !== undefined ? { expiryDate: data.expiryDate } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.mchd !== undefined ? { mchd: data.mchd } : {}),
      },
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
    if (!hasAnyRole(session.user, WRITE_ROLES)) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.sKZI.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // Деактивируем вместо удаления
    await prisma.sKZI.update({
      where: { id },
      data: { isActive: false },
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
