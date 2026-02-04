#!/usr/bin/env tsx
/**
 * Отладка URL для Prisma
 */

import 'dotenv/config'

function getMasterDatabaseUrl(): string {
  // Приоритет: DATABASE_URL_MASTER > DATABASE_URL > DATABASE_URL_ADMIN (с указанием БД) > дефолт
  if (process.env.DATABASE_URL_MASTER) {
    return process.env.DATABASE_URL_MASTER
  }

  if (process.env.DATABASE_URL) {
    // Проверяем, указывает ли DATABASE_URL уже на master БД
    try {
      const url = new URL(process.env.DATABASE_URL)
      if (url.pathname.includes('tahocrm_master')) {
        return process.env.DATABASE_URL
      }
      // Если нет, создаем URL с указанием master БД
      const u = new URL(process.env.DATABASE_URL)
      u.pathname = `/tahocrm_master`
      return u.toString()
    } catch {
      // Если невалидный URL, используем как есть
      return process.env.DATABASE_URL
    }
  }

  if (process.env.DATABASE_URL_ADMIN) {
    const u = new URL(process.env.DATABASE_URL_ADMIN)
    u.pathname = `/tahocrm_master`
    return u.toString()
  }

  // Дефолт для Docker Compose (из docker-compose.yml)
  return 'postgresql://user:password@localhost:5432/tahocrm_master'
}

console.log('DATABASE_URL_MASTER:', process.env.DATABASE_URL_MASTER || '(not set)')
console.log('DATABASE_URL:', process.env.DATABASE_URL || '(not set)')
console.log('DATABASE_URL_ADMIN:', process.env.DATABASE_URL_ADMIN || '(not set)')
console.log('\nCalculated master URL:', getMasterDatabaseUrl())
