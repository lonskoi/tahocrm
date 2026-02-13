import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateContactSchema } from '@/lib/validation/schemas'
import { hasAnyRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'])

async function canEditCustomer(
  prisma: ReturnType<typeof prismaTenant>,
  tenantId: string,
  customerId: string,
  user: { id: string; role: UserRole; roles?: UserRole[] | null }
) {
  if (hasAnyRole(user, WRITE_ROLES)) return true
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      createdById: true,
      responsibles: { where: { userId: user.id }, select: { userId: true } },
    },
  })
  if (!customer) throw new ApiError(404, 'Customer not found', 'NOT_FOUND')
  return customer.createdById === user.id || customer.responsibles.length > 0
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

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params

    const validation = await validateRequest(request, updateContactSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.contact.findFirst({
      where: { id, tenantId },
      select: { id: true, customerId: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const allowed = await canEditCustomer(prisma, tenantId, existing.customerId, {
      id: session.user.id,
      role: session.user.role,
      roles: session.user.roles ?? [],
    })
    if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const updated = await prisma.contact.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name ?? '' } : {}),
        ...(data.position !== undefined ? { position: data.position } : {}),
        ...(data.phone !== undefined ? { phone: data.phone } : {}),
        ...(data.email !== undefined ? { email: data.email } : {}),
        ...(data.comment !== undefined ? { comment: data.comment } : {}),
        ...(data.businessCreatedAt !== undefined
          ? { businessCreatedAt: data.businessCreatedAt ? new Date(data.businessCreatedAt) : null }
          : {}),
        ...(data.businessUpdatedAt !== undefined
          ? { businessUpdatedAt: data.businessUpdatedAt ? new Date(data.businessUpdatedAt) : null }
          : {}),
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

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    const prisma = prismaTenant(tenantId)
    const existing = await prisma.contact.findFirst({
      where: { id, tenantId },
      select: { id: true, customerId: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const allowed = await canEditCustomer(prisma, tenantId, existing.customerId, {
      id: session.user.id,
      role: session.user.role,
      roles: session.user.roles ?? [],
    })
    if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    await prisma.contact.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
