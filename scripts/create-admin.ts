import 'dotenv/config'
import { prismaMaster } from '../lib/prisma'
import bcrypt from 'bcryptjs'

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@tahocrm.ru'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const name = process.env.ADMIN_NAME || 'Администратор'

  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const admin = await prismaMaster.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'SUPER_ADMIN',
        isActive: true,
      },
    })

    console.log('✅ Администратор создан успешно!')
    console.log('Email:', admin.email)
    console.log('Пароль:', password)
    console.log('⚠️  Не забудьте изменить пароль после первого входа!')
  } catch (error: unknown) {
    const code =
      typeof error === 'object' && error && 'code' in error
        ? (error as { code?: unknown }).code
        : undefined

    if (code === 'P2002') {
      console.log('⚠️  Пользователь с таким email уже существует')
    } else {
      console.error('❌ Ошибка при создании администратора:', error)
    }
  } finally {
    await prismaMaster.$disconnect()
  }
}

main()
