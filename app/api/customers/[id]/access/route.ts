import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateCustomerAccessSchema } from '@/lib/validation/schemas'

const ACCESS_ROLES = new Set(['TENANT_ADMIN', 'DIRECTOR'])

async function canEditCustomerAccess(
  prisma: ReturnType<typeof prismaTenant>,
  tenantId: string,
  customerId: string,
  user: { id: string; role: string }
) {
  if (ACCESS_ROLES.has(user.role)) return true
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId },
    select: {
      createdById: true,
      responsibles: { where: { userId: user.id }, select: { userId: true } },
    },
  })
  if (!customer) throw new ApiError(404, 'Not found', 'NOT_FOUND')
  return customer.createdById === user.id || customer.responsibles.length > 0
}

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const allowed = await canEditCustomerAccess(prisma, tenantId, customerId, {
      id: session.user.id,
      role: session.user.role,
    })
    if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const validation = await validateRequest(request, updateCustomerAccessSchema)
    if (validation.error) return validation.error
    const { responsibleUserIds } = validation.data
    const ids = responsibleUserIds ?? []

    // Ensure customer exists (and belongs to tenant)
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // Keep responsibles in sync with provided list
    await prisma.customerResponsible.deleteMany({
      where: { customerId, userId: { notIn: ids } },
    })
    if (ids.length > 0) {
      await prisma.customerResponsible.createMany({
        data: ids.map(userId => ({ customerId, userId })),
        skipDuplicates: true,
      })
    }

    const updated = await prisma.customer.findFirst({
      where: { id: customerId, tenantId },
      select: {
        id: true,
        createdById: true,
        createdBy: { select: { id: true, name: true, role: true } },
        responsibles: { include: { user: { select: { id: true, name: true, role: true } } } },
      },
    })
    if (!updated) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    return NextResponse.json(updated)
  } catch (error) {
    return handleApiError(error, { method: 'PUT', path, userId, tenantId: tenantIdForLog })
  }
}
