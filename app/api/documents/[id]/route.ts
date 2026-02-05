import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { validateRequest } from '@/lib/validation/middleware'
import { updateDocumentSchema } from '@/lib/validation/schemas'
import { logChange } from '@/lib/audit'
import { hasAnyRole, hasRole } from '@/lib/authz'
import type { UserRole } from '@prisma/client'

const WRITE_ROLES = new Set<UserRole>([
  'TENANT_ADMIN',
  'DIRECTOR',
  'MANAGER',
  'MASTER',
  'CARD_SPECIALIST',
])

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
    const validation = await validateRequest(request, updateDocumentSchema)
    if (validation.error) return validation.error
    const data = validation.data

    const prisma = prismaTenant(tenantId)
    const existing = await prisma.document.findFirst({
      where: { id, tenantId },
      select: { id: true },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    // Получаем старые данные для логирования
    const oldData = await prisma.document.findFirst({
      where: { id, tenantId },
      select: {
        type: true,
        title: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        customerId: true,
        orderId: true,
        invoiceId: true,
        vehicleId: true,
        tachographId: true,
      },
    })

    const updated = await prisma.document.update({
      where: { id },
      data: {
        ...(data.type ? { type: data.type } : {}),
        ...(data.title !== undefined ? { title: data.title } : {}),
        ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl ?? '' } : {}),
        ...(data.fileName !== undefined ? { fileName: data.fileName ?? '' } : {}),
        ...(data.mimeType !== undefined ? { mimeType: data.mimeType } : {}),
        ...(data.customerId !== undefined ? { customerId: data.customerId } : {}),
        ...(data.orderId !== undefined ? { orderId: data.orderId } : {}),
        ...(data.invoiceId !== undefined ? { invoiceId: data.invoiceId } : {}),
        ...(data.vehicleId !== undefined ? { vehicleId: data.vehicleId } : {}),
        ...(data.tachographId !== undefined ? { tachographId: data.tachographId } : {}),
      },
    })

    // Логируем изменение
    await logChange({
      entityType: 'document',
      entityId: id,
      action: 'UPDATE',
      oldData: oldData ?? null,
      newData: {
        type: updated.type,
        title: updated.title,
        fileUrl: updated.fileUrl,
        fileName: updated.fileName,
        mimeType: updated.mimeType,
        customerId: updated.customerId,
        orderId: updated.orderId,
        invoiceId: updated.invoiceId,
        vehicleId: updated.vehicleId,
        tachographId: updated.tachographId,
      },
      userId: session.user.id,
      tenantId,
      request,
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
    const existing = await prisma.document.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        type: true,
        title: true,
        fileUrl: true,
        fileName: true,
        mimeType: true,
        customerId: true,
        orderId: true,
        invoiceId: true,
        vehicleId: true,
        tachographId: true,
      },
    })
    if (!existing) throw new ApiError(404, 'Not found', 'NOT_FOUND')

    await prisma.document.delete({ where: { id } })

    // Логируем удаление
    await logChange({
      entityType: 'document',
      entityId: id,
      action: 'DELETE',
      oldData: existing,
      userId: session.user.id,
      tenantId,
      request,
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleApiError(error, { method: 'DELETE', path, userId, tenantId: tenantIdForLog })
  }
}
