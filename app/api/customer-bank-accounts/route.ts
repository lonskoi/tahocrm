import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { createCustomerBankAccountSchema } from '@/lib/validation/schemas'

const WRITE_ROLES = new Set(['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'])

async function canEditCustomer(
  prisma: ReturnType<typeof prismaTenant>,
  tenantId: string,
  customerId: string,
  user: { id: string; role: string }
) {
  if (WRITE_ROLES.has(user.role)) return true
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
    const prisma = prismaTenant(tenantId)
    const items = await prisma.customerBankAccount.findMany({
      where: { tenantId, ...(customerId ? { customerId } : {}) },
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

    const access = await checkTenantAccess(tenantId)
    if (!access.allowed)
      throw new ApiError(403, access.reason || 'Access denied', 'TENANT_ACCESS_DENIED')

    const validation = await validateRequest(request, createCustomerBankAccountSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const allowed = await canEditCustomer(prisma, tenantId, data.customerId, {
      id: session.user.id,
      role: session.user.role,
    })
    if (!allowed) throw new ApiError(403, 'Forbidden', 'FORBIDDEN')

    const created = await prisma.customerBankAccount.create({
      data: {
        tenantId,
        customerId: data.customerId,
        bik: data.bik ?? null,
        bankName: data.bankName ?? null,
        bankAddress: data.bankAddress ?? null,
        corrAccount: data.corrAccount ?? null,
        accountNumber: data.accountNumber ?? null,
        comment: data.comment ?? null,
      },
    })

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    return handleApiError(error, { method: 'POST', path, userId, tenantId: tenantIdForLog })
  }
}
