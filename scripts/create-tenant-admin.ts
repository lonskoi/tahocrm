import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { prismaMaster, prismaTenant } from '../lib/prisma'

async function main() {
  const tenantId = process.env.TENANT_ID || process.env.DEV_DEFAULT_TENANT_ID || 'tenant-1'
  const email = process.env.ADMIN_EMAIL || 'tenant-admin@test.com'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Админ мастерской'
  const tenantName = process.env.TENANT_NAME || `Мастерская ${tenantId}`

  const hashedPassword = await bcrypt.hash(password, 10)

  // Ensure tenant exists in master DB (registry)
  await prismaMaster.tenant
    .upsert({
      where: { id: tenantId },
      update: { name: tenantName },
      create: { id: tenantId, name: tenantName },
    })
    .catch(() => {})

  const prisma = prismaTenant(tenantId)

  // Ensure tenant exists inside tenant DB (FKs require it)
  await prisma.tenant.upsert({
    where: { id: tenantId },
    update: { name: tenantName },
    create: { id: tenantId, name: tenantName },
  })

  try {
    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'TENANT_ADMIN',
        tenantId,
        isActive: true,
      },
    })

    console.log('✅ TENANT_ADMIN создан успешно!')
    console.log('Tenant:', tenantId)
    console.log('Email:', admin.email)
    console.log('Пароль:', password)
    console.log('URL для входа:', `http://localhost:3000/crm/${tenantId}/login`)
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined

    if (code === 'P2002') {
      console.log('⚠️  Пользователь с таким email уже существует в tenant DB')
      console.log('Tenant:', tenantId)
      console.log('Email:', email)
    } else {
      console.error('❌ Ошибка при создании TENANT_ADMIN:', error)
      process.exitCode = 1
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
    await prismaMaster.$disconnect().catch(() => {})
  }
}

main().catch(e => {
  console.error('❌ create-tenant-admin failed:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
