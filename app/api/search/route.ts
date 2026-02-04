import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prismaTenant } from '@/lib/prisma'
import { normalizeGovNumberLike, parseSearchQuery } from '@/lib/utils'
import { validateQuery } from '@/lib/validation/middleware'
import { searchQuerySchema } from '@/lib/validation/schemas'
import { handleApiError, ApiError } from '@/lib/api-error-handler'
import { logger } from '@/lib/logger'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  const path = request.nextUrl.pathname
  let userId: string | undefined
  let tenantIdForLog: string | undefined

  try {
    logger.info('GET /api/search - Starting request', {
      path,
      timestamp: new Date().toISOString(),
    })

    const session = await auth()
    if (!session?.user) {
      logger.warn('GET /api/search - Unauthorized', {
        path,
        timestamp: new Date().toISOString(),
      })
      throw new ApiError(401, 'Unauthorized', 'UNAUTHORIZED')
    }
    userId = session.user.id
    tenantIdForLog = session.user.tenantId || undefined

    // Валидация query параметров
    const validation = validateQuery(request, searchQuerySchema)
    if (validation.error) {
      return validation.error
    }
    const query = validation.data.q

    const tenantId = session.user.tenantId
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 })
    }

    const queryCompact = String(query ?? '')
      .trim()
      .replace(/[\s-]+/g, '')
    const queryUpper = queryCompact.toUpperCase()
    const queryGovNormalized = normalizeGovNumberLike(queryCompact)

    const parsed = parseSearchQuery(query)
    const prisma = prismaTenant(tenantId)
    const tenantWhere = { tenantId }
    interface SearchResults {
      vehicles: unknown[]
      orders: unknown[]
      tachographs: unknown[]
      skzi: unknown[]
      cards: unknown[]
      customers: unknown[]
    }
    const results: SearchResults = {
      vehicles: [],
      orders: [],
      tachographs: [],
      skzi: [],
      cards: [],
      customers: [],
    }

    // Поиск по типу запроса
    switch (parsed.type) {
      case 'inn':
        // Поиск по ИНН
        const vehiclesByInn = await prisma.vehicle.findMany({
          where: {
            ...tenantWhere,
            ownerInn: { contains: parsed.value },
          },
          take: 10,
        })
        results.vehicles = vehiclesByInn
        break

      case 'govNumber':
        // Поиск по госномеру
        const vehiclesByGov = await prisma.vehicle.findMany({
          where: {
            ...tenantWhere,
            OR: [
              { govNumber: { contains: queryGovNormalized, mode: 'insensitive' } },
              { govNumber: { contains: queryUpper, mode: 'insensitive' } },
            ],
          },
          take: 10,
        })
        results.vehicles = vehiclesByGov
        break

      case 'vin':
        // Поиск по VIN
        const vehiclesByVin = await prisma.vehicle.findMany({
          where: {
            ...tenantWhere,
            vin: { contains: parsed.value, mode: 'insensitive' },
          },
          take: 10,
        })
        results.vehicles = vehiclesByVin
        break

      case 'serial':
        // Поиск по серийному номеру (тахограф или СКЗИ)
        const [tachographs, skzi] = await Promise.all([
          prisma.tachograph.findMany({
            where: {
              ...tenantWhere,
              serialNumber: { contains: parsed.value, mode: 'insensitive' },
            },
            take: 10,
          }),
          prisma.sKZI.findMany({
            where: {
              ...tenantWhere,
              serialNumber: { contains: parsed.value, mode: 'insensitive' },
            },
            take: 10,
          }),
        ])
        results.tachographs = tachographs
        results.skzi = skzi
        break

      case 'name':
        // Поиск по фамилии (реестр карт водителей)
        const cards = await prisma.driverCardRequest.findMany({
          where: {
            ...tenantWhere,
            driverFullName: { contains: parsed.value, mode: 'insensitive' },
          },
          take: 10,
        })
        results.cards = cards
        break

      default:
        // Общий поиск
        const [allVehicles, allOrders, allTachographs, allSkzi, allCards, allCustomers] =
          await Promise.all([
            prisma.vehicle.findMany({
              where: {
                ...tenantWhere,
                OR: [
                  { govNumber: { contains: queryGovNormalized, mode: 'insensitive' } },
                  { govNumber: { contains: queryUpper, mode: 'insensitive' } },
                  { vin: { contains: queryUpper, mode: 'insensitive' } },
                  { ownerName: { contains: parsed.value, mode: 'insensitive' } },
                ],
              },
              take: 5,
            }),
            prisma.order.findMany({
              where: {
                ...tenantWhere,
                OR: [
                  { number: { contains: parsed.value, mode: 'insensitive' } },
                  { description: { contains: parsed.value, mode: 'insensitive' } },
                ],
              },
              take: 5,
            }),
            prisma.tachograph.findMany({
              where: {
                ...tenantWhere,
                serialNumber: { contains: parsed.value, mode: 'insensitive' },
              },
              take: 5,
            }),
            prisma.sKZI.findMany({
              where: {
                ...tenantWhere,
                serialNumber: { contains: parsed.value, mode: 'insensitive' },
              },
              take: 5,
            }),
            prisma.driverCardRequest.findMany({
              where: {
                ...tenantWhere,
                driverFullName: { contains: parsed.value, mode: 'insensitive' },
              },
              take: 5,
            }),
            prisma.customer.findMany({
              where: {
                ...tenantWhere,
                OR: [
                  { name: { contains: parsed.value, mode: 'insensitive' } },
                  { inn: { contains: parsed.value, mode: 'insensitive' } },
                  { phone: { contains: parsed.value, mode: 'insensitive' } },
                ],
              },
              take: 5,
            }),
          ])
        results.vehicles = allVehicles
        results.orders = allOrders
        results.tachographs = allTachographs
        results.skzi = allSkzi
        results.cards = allCards
        results.customers = allCustomers
    }

    const duration = Date.now() - startTime
    logger.info('GET /api/search - Success', {
      userId,
      tenantId: tenantIdForLog,
      query,
      resultCount:
        results.vehicles.length +
        results.orders.length +
        results.tachographs.length +
        results.skzi.length +
        results.cards.length +
        results.customers.length,
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json(results)
  } catch (error) {
    const duration = Date.now() - startTime
    logger.error('GET /api/search - Error', {
      error: error instanceof Error ? error.message : String(error),
      duration: `${duration}ms`,
      path,
      timestamp: new Date().toISOString(),
    })
    return handleApiError(error, {
      method: 'GET',
      path,
      userId,
      tenantId: tenantIdForLog,
    })
  }
}
