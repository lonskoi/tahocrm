#!/usr/bin/env tsx
/**
 * Verified запуск:
 * - перезапуск docker compose (Postgres)
 * - ожидание готовности БД
 * - prisma generate + migrate
 * - запуск next dev
 * - health/smoke checks API
 */

import { spawn } from 'child_process'
import { existsSync, rmSync } from 'fs'
import { dirname, join } from 'path'
import { Client } from 'pg'

type CmdResult = { code: number; stdout: string; stderr: string }

function resolveDockerCmd(): string {
  // 1) PATH
  if (process.platform === 'win32') {
    // 2) Типичный путь Docker Desktop на Windows
    const candidates = [
      'C:\\\\Program Files\\\\Docker\\\\Docker\\\\resources\\\\bin\\\\docker.exe',
      'C:\\\\Program Files\\\\Docker\\\\Docker\\\\resources\\\\bin\\\\docker',
    ]
    for (const c of candidates) {
      if (existsSync(c)) return c
    }
    return 'docker'
  }
  return 'docker'
}

function run(
  cmd: string,
  args: string[],
  opts?: { cwd?: string; env?: NodeJS.ProcessEnv; shell?: boolean }
): Promise<CmdResult> {
  return new Promise(resolve => {
    const child = spawn(cmd, args, {
      // На Windows запуск exe по полному пути (с пробелами) ломается при shell:true
      shell: opts?.shell ?? true,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: opts?.cwd ?? process.cwd(),
      env: opts?.env ?? process.env,
    })

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', d => (stdout += String(d)))
    child.stderr.on('data', d => (stderr += String(d)))
    child.on('close', code => resolve({ code: code ?? 1, stdout, stderr }))
  })
}

async function sleep(ms: number) {
  await new Promise(r => setTimeout(r, ms))
}

function withDb(connectionString: string, dbName: string): string {
  const u = new URL(connectionString)
  u.pathname = `/${dbName}`
  return u.toString()
}

async function ensureDatabaseExists(adminUrl: string, dbName: string) {
  // CREATE DATABASE нельзя внутри транзакции — используем одиночный Client
  const client = new Client({ connectionString: adminUrl })
  await client.connect()
  try {
    await client.query(`CREATE DATABASE "${dbName}"`)
  } catch (e: unknown) {
    // 42P04: duplicate_database
    const err = e as { code?: string }
    if (err?.code !== '42P04') throw e
  } finally {
    await client.end().catch(() => {})
  }
}

async function prismaDbPush(targetDatabaseUrl: string) {
  const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: targetDatabaseUrl }
  const push = await run('npx', ['prisma', 'db', 'push'], { shell: true, env })
  if (push.code !== 0) throw new Error(`Prisma db push failed:\n${push.stderr || push.stdout}`)
}

async function ensureTenantExists(masterUrl: string, tenantId: string) {
  // Сохраняем текущие значения
  const originalMasterUrl = process.env.DATABASE_URL_MASTER
  const originalDbUrl = process.env.DATABASE_URL

  // Устанавливаем DATABASE_URL для prismaMaster перед импортом
  process.env.DATABASE_URL_MASTER = masterUrl
  process.env.DATABASE_URL = masterUrl

  // Импортируем prismaMaster динамически после генерации Prisma Client
  // Используем динамический импорт, чтобы Prisma Client был сгенерирован
  const { prismaMaster } = await import('../lib/prisma')

  try {
    const existing = await prismaMaster.tenant.findUnique({
      where: { id: tenantId },
    })

    if (existing) {
      console.log(`✅ Tenant ${tenantId} already exists in master DB`)
      return
    }

    // Создаем tenant с базовыми настройками
    await prismaMaster.tenant.create({
      data: {
        id: tenantId,
        name: `Мастерская ${tenantId}`,
        isActive: true,
        isBlocked: false,
        subscriptionStatus: 'TRIAL',
        subscriptionPlan: 'BASIC',
        subscriptionStartDate: new Date(),
        trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 дней
        maxUsers: 10,
        maxVehicles: 100,
        maxOrdersPerMonth: 500,
        defaultVatRate: 'VAT_22',
      },
    })

    console.log(`✅ Created tenant ${tenantId} in master DB`)
  } catch (error) {
    const err = error as { code?: string; message?: string }
    if (err?.code === 'P2002') {
      // Unique constraint violation - tenant already exists
      console.log(`⚠️  Tenant ${tenantId} already exists (race condition)`)
    } else {
      console.error(`❌ Failed to create tenant ${tenantId}:`, err?.message || String(error))
      // Не бросаем ошибку, чтобы не прерывать запуск
      console.error(`   Continuing anyway...`)
    }
  } finally {
    await prismaMaster.$disconnect().catch(() => {})
    // Восстанавливаем оригинальные значения
    if (originalMasterUrl !== undefined) {
      process.env.DATABASE_URL_MASTER = originalMasterUrl
    } else {
      delete process.env.DATABASE_URL_MASTER
    }
    if (originalDbUrl !== undefined) {
      process.env.DATABASE_URL = originalDbUrl
    } else {
      delete process.env.DATABASE_URL
    }
  }
}

async function waitForPostgresHealthy(timeoutMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const docker = resolveDockerCmd()
    const res = await run(
      docker,
      ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'user', '-d', 'tahocrm'],
      { shell: false }
    )
    if (res.code === 0) return
    await sleep(2000)
  }
  throw new Error('Postgres is not healthy (timeout)')
}

async function waitForHttpOk(url: string, timeoutMs = 120_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' })
      if (res.ok) return
    } catch {
      // ignore
    }
    await sleep(1000)
  }
  throw new Error(`HTTP healthcheck failed (timeout): ${url}`)
}

async function smokeCheck(url: string) {
  const res = await fetch(url, { method: 'GET' })
  if (res.status >= 500) {
    const text = await res.text().catch(() => '')
    throw new Error(`Smoke check failed ${res.status} for ${url}: ${text}`)
  }
  return res.status
}

async function main() {
  // Multi-DB tenancy defaults (docker-compose.yml)
  const base = process.env.DATABASE_URL_ADMIN
    ? process.env.DATABASE_URL_ADMIN
    : 'postgresql://user:password@localhost:5432/postgres'

  const adminUrl = process.env.DATABASE_URL_ADMIN ?? base
  const masterUrl = process.env.DATABASE_URL_MASTER ?? withDb(adminUrl, 'tahocrm_master')
  const demoTenantId = process.env.DEV_DEFAULT_TENANT_ID ?? 'tenant-1'
  const demoTenantDb = `tahocrm_tenant_${demoTenantId}`
  const demoTenantUrl = withDb(adminUrl, demoTenantDb)

  process.env.DATABASE_URL_ADMIN = adminUrl
  process.env.DATABASE_URL_MASTER = masterUrl
  process.env.DEV_DEFAULT_TENANT_ID = demoTenantId
  // Prisma CLI reads DATABASE_URL; we'll switch it per target when pushing schema.
  process.env.DATABASE_URL = masterUrl

  console.log('🔄 Restarting Docker Postgres (docker compose)...')
  const docker = resolveDockerCmd()
  const dockerBin = process.platform === 'win32' ? dirname(docker) : undefined
  const dockerEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...(dockerBin ? { PATH: `${dockerBin};${process.env.PATH ?? ''}` } : {}),
  }
  // down/up, чтобы гарантированно перезапустить
  const version = await run(docker, ['--version'], { shell: false, env: dockerEnv })
  if (version.code !== 0) {
    throw new Error(
      `Docker CLI not found. Install Docker Desktop and ensure 'docker' is in PATH.\n${version.stderr || version.stdout}`
    )
  }

  await run(docker, ['compose', 'down'], { shell: false, env: dockerEnv })
  const up = await run(docker, ['compose', 'up', '-d', '--force-recreate'], {
    shell: false,
    env: dockerEnv,
  })
  if (up.code !== 0) {
    throw new Error(`docker compose up failed:\n${up.stderr || up.stdout}`)
  }

  console.log('⏳ Waiting for Postgres health...')
  await waitForPostgresHealthy()
  console.log('✅ Postgres is healthy')

  console.log('🗄️ Ensuring databases exist (master + demo tenant)...')
  await ensureDatabaseExists(adminUrl, 'tahocrm_master')
  await ensureDatabaseExists(adminUrl, demoTenantDb)

  console.log('🧱 Prisma db push (master)...')
  await prismaDbPush(masterUrl)

  console.log('🧱 Prisma db push (demo tenant)...')
  await prismaDbPush(demoTenantUrl)

  console.log('🧬 Prisma generate...')
  const gen = await run('npm', ['run', 'db:generate'], { shell: true })
  if (gen.code !== 0) throw new Error(`Prisma generate failed:\n${gen.stderr || gen.stdout}`)

  const clearNext = String(process.env.CLEAR_NEXT_CACHE ?? '').trim() === '1'
  if (clearNext) {
    console.log('🧹 Clearing Next.js cache (CLEAR_NEXT_CACHE=1)...')
    const nextDir = join(process.cwd(), '.next')
    if (existsSync(nextDir)) {
      try {
        rmSync(nextDir, { recursive: true, force: true })
        console.log('✅ Next.js cache cleared')
      } catch (error) {
        console.warn(
          '⚠️  Failed to clear Next.js cache:',
          error instanceof Error ? error.message : String(error)
        )
        console.warn('   Continuing anyway...')
      }
    } else {
      console.log('ℹ️  .next directory does not exist, skipping cache clear')
    }
  } else {
    console.log('ℹ️  Skipping .next cache clear (set CLEAR_NEXT_CACHE=1 to enable)')
  }

  console.log('👤 Ensuring tenant exists in master DB...')
  await ensureTenantExists(masterUrl, demoTenantId)

  console.log('▶️ Starting Next.js dev server...')
  const dev = spawn('npm', ['run', 'dev'], {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  })

  const cleanup = () => {
    try {
      dev.kill()
    } catch {
      // ignore
    }
  }
  process.on('SIGINT', () => {
    cleanup()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    cleanup()
    process.exit(143)
  })

  try {
    console.log('⏳ Waiting for app health endpoint...')
    await waitForHttpOk('http://localhost:3000/api/health')
    console.log('✅ /api/health is OK')

    console.log('🧪 Smoke-checking API endpoints...')
    const searchStatus = await smokeCheck('http://localhost:3000/api/search?q=test')
    const tasksStatus = await smokeCheck('http://localhost:3000/api/tasks')
    console.log(`✅ /api/search status: ${searchStatus}`)
    console.log(`✅ /api/tasks status: ${tasksStatus} (401 is expected without session)`)

    console.log('🎉 Verified startup successful. App is running.')
  } catch (e) {
    console.error('❌ Verified startup failed:', e instanceof Error ? e.message : String(e))
    cleanup()
    process.exit(1)
  }

  // Держим процесс живым, пока жив dev-сервер
  const code = await new Promise<number>(resolve => dev.on('close', c => resolve(c ?? 1)))
  process.exit(code)
}

main().catch(e => {
  console.error('❌ start:verified failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
