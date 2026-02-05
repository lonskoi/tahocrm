import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { validateRequest } from '@/lib/validation/middleware'
import { updateUserSchema } from '@/lib/validation/schemas'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import bcrypt from 'bcryptjs'
import { hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

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

    const validation = await validateRequest(request, updateUserSchema)
    if (validation.error) return validation.error
    const { email, password, name, phone, role, roles, isActive } = validation.data

    if (role === 'SUPER_ADMIN') throw new ApiError(400, 'Invalid role', 'INVALID_ROLE')
    if (Array.isArray(roles) && roles.includes('SUPER_ADMIN'))
      throw new ApiError(400, 'Invalid role', 'INVALID_ROLE')

    const data: Record<string, unknown> = {}
    if (typeof email === 'string') data.email = email
    if (typeof name === 'string') data.name = name
    if (phone !== undefined) data.phone = phone
    if (typeof role === 'string') data.role = role
    if (typeof isActive === 'boolean') data.isActive = isActive
    if (typeof password === 'string') data.password = await bcrypt.hash(password, 10)

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.user.findFirst({
      where: { id, tenantId },
      select: { id: true, role: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    const primaryRole = (typeof role === 'string' ? role : existing.role) as UserRole
    if (roles !== undefined) {
      const extraRoles = Array.from(
        new Set((roles ?? []).filter(r => r !== 'SUPER_ADMIN' && r !== primaryRole))
      ) as UserRole[]
      data.roles = extraRoles
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        roles: true,
        tenantId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
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
    if (!hasRole(session.user, 'TENANT_ADMIN')) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const { id } = await context.params
    if (id === session.user.id)
      throw new ApiError(400, 'Cannot delete yourself', 'CANNOT_DELETE_SELF')

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.user.findFirst({ where: { id, tenantId }, select: { id: true } })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')
    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
