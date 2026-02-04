#!/usr/bin/env tsx
/**
 * Скрипт для проверки состояния баз данных
 */

import 'dotenv/config'
import { prismaMaster, prismaTenant } from '../lib/prisma'

async function main() {
  console.log('🔍 Checking databases...\n')

  // Проверка master БД
  try {
    console.log('📊 Checking master DB (tahocrm_master)...')
    const tenantCount = await prismaMaster.tenant.count()
    console.log(`✅ Master DB accessible. Tenants count: ${tenantCount}`)

    if (tenantCount > 0) {
      const tenants = await prismaMaster.tenant.findMany({
        select: { id: true, name: true, isActive: true, subscriptionStatus: true },
        take: 5,
      })
      console.log('Tenants:')
      tenants.forEach(t => {
        console.log(
          `  - ${t.id}: ${t.name} (active: ${t.isActive}, status: ${t.subscriptionStatus})`
        )
      })
    } else {
      console.log('⚠️  No tenants found in master DB')
    }
  } catch (error) {
    console.error('❌ Master DB error:', error instanceof Error ? error.message : String(error))
  }

  // Проверка tenant БД
  const tenantId = process.env.DEV_DEFAULT_TENANT_ID || 'tenant-1'
  try {
    console.log(`\n📊 Checking tenant DB (tahocrm_tenant_${tenantId})...`)
    const prisma = prismaTenant(tenantId)
    const userCount = await prisma.user.count()
    const vehicleCount = await prisma.vehicle.count()
    const customerCount = await prisma.customer.count()
    console.log(
      `✅ Tenant DB accessible. Users: ${userCount}, Vehicles: ${vehicleCount}, Customers: ${customerCount}`
    )
  } catch (error) {
    console.error(`❌ Tenant DB error:`, error instanceof Error ? error.message : String(error))
  }

  await prismaMaster.$disconnect()
  console.log('\n✅ Database check completed')
}

main().catch(console.error)
