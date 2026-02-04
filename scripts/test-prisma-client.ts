#!/usr/bin/env tsx
/**
 * Тест Prisma Client
 */

import 'dotenv/config'
import { prismaMaster } from '../lib/prisma'

async function test() {
  console.log('Testing Prisma Client...')

  try {
    // Проверяем, что prismaMaster инициализирован
    console.log('prismaMaster type:', typeof prismaMaster)
    console.log('prismaMaster.tenant type:', typeof prismaMaster.tenant)

    // Пробуем простой запрос
    const count = await prismaMaster.tenant.count()
    console.log('✅ Tenant count:', count)

    if (count > 0) {
      const tenants = await prismaMaster.tenant.findMany({ take: 1 })
      console.log('✅ First tenant:', tenants[0]?.id, tenants[0]?.name)
    }
  } catch (error) {
    console.error('❌ Prisma Client error:', error)
    if (error instanceof Error) {
      console.error('Error message:', error.message)
      console.error('Error stack:', error.stack)
    }
  } finally {
    await prismaMaster.$disconnect()
  }
}

test().catch(console.error)
