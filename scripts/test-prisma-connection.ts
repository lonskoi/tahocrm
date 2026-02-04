#!/usr/bin/env tsx
/**
 * Тест подключения к Prisma
 */

import 'dotenv/config'
import { Pool } from 'pg'

async function test() {
  const url = 'postgresql://user:password@localhost:5432/tahocrm_master'
  console.log('Testing connection to:', url)

  const pool: any = new Pool({ connectionString: url })
  try {
    const result = await pool.query('SELECT 1 as test')
    console.log('✅ Connection successful:', result.rows[0])

    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
      LIMIT 10
    `)
    console.log(
      'Tables:',
      tables.rows.map((r: any) => r.table_name)
    )

    const tenantCheck = await pool.query('SELECT COUNT(*) as count FROM "Tenant"')
    console.log('Tenants count:', tenantCheck.rows[0].count)
  } catch (error) {
    console.error('❌ Connection error:', error)
  } finally {
    await pool.end()
  }
}

test().catch(console.error)
