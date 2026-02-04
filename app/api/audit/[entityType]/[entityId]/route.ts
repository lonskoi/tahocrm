import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { checkTenantAccess } from '@/lib/tenant-check'
import { handleApiError, ApiError } from '@/lib/api-error-handler'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ entityType: string; entityId: string }> }
) {
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

    const { entityType, entityId } = await context.params

    // Валидация entityType
    const validEntityTypes = [
      'vehicle',
      'customer',
      'tachograph',
      'document',
      'contact',
      'bank-account',
      'order',
      'invoice',
    ]
    if (!validEntityTypes.includes(entityType)) {
      throw new ApiError(
        400,
        `Invalid entity type. Must be one of: ${validEntityTypes.join(', ')}`,
        'INVALID_ENTITY_TYPE'
      )
    }

    const prisma = prismaTenant(tenantId)

    // Для ТС также получаем историю связанных тахографов
    if (entityType === 'vehicle') {
      // Находим все тахографы, связанные с этим ТС
      const tachographs = await prisma.tachograph.findMany({
        where: {
          tenantId,
          vehicleId: entityId,
        },
        select: {
          id: true,
        },
      })

      const tachographIds = tachographs.map(t => t.id)

      // Получаем историю для ТС и всех связанных тахографов
      const [vehicleLogs, tachographLogs] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            tenantId,
            entityType: 'vehicle',
            entityId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        tachographIds.length > 0
          ? prisma.auditLog.findMany({
              where: {
                tenantId,
                entityType: 'tachograph',
                entityId: { in: tachographIds },
              },
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            })
          : [],
      ])

      // Объединяем и сортируем по дате
      const allLogs = [...vehicleLogs, ...tachographLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return NextResponse.json(allLogs)
    }

    // Для клиента также получаем историю связанных ТС и тахографов
    if (entityType === 'customer') {
      // Находим все ТС клиента
      const vehicles = await prisma.vehicle.findMany({
        where: {
          tenantId,
          customerId: entityId,
        },
        select: {
          id: true,
        },
      })

      // Находим все тахографы клиента (прямая привязка)
      const tachographs = await prisma.tachograph.findMany({
        where: {
          tenantId,
          customerId: entityId,
        },
        select: {
          id: true,
        },
      })

      const vehicleIds = vehicles.map(v => v.id)
      const tachographIds = tachographs.map(t => t.id)

      // Также находим тахографы, связанные через ТС клиента
      const tachographsViaVehicles =
        vehicleIds.length > 0
          ? await prisma.tachograph.findMany({
              where: {
                tenantId,
                vehicleId: { in: vehicleIds },
              },
              select: {
                id: true,
              },
            })
          : []

      const allTachographIds = [
        ...new Set([...tachographIds, ...tachographsViaVehicles.map(t => t.id)]),
      ]

      // Получаем историю для клиента, всех связанных ТС и тахографов
      const [customerLogs, vehicleLogs, tachographLogs] = await Promise.all([
        prisma.auditLog.findMany({
          where: {
            tenantId,
            entityType: 'customer',
            entityId,
          },
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        }),
        vehicleIds.length > 0
          ? prisma.auditLog.findMany({
              where: {
                tenantId,
                entityType: 'vehicle',
                entityId: { in: vehicleIds },
              },
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            })
          : [],
        allTachographIds.length > 0
          ? prisma.auditLog.findMany({
              where: {
                tenantId,
                entityType: 'tachograph',
                entityId: { in: allTachographIds },
              },
              orderBy: { createdAt: 'desc' },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                  },
                },
              },
            })
          : [],
      ])

      // Объединяем и сортируем по дате
      const allLogs = [...customerLogs, ...vehicleLogs, ...tachographLogs].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )

      return NextResponse.json(allLogs)
    }

    // Для остальных типов сущностей - стандартная логика
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        entityType,
        entityId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    })

    return NextResponse.json(logs)
  } catch (error) {
    return handleApiError(error, { method: 'GET', path, userId, tenantId: tenantIdForLog })
  }
}
