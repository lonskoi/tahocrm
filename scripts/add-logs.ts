#!/usr/bin/env tsx
/**
 * Скрипт для добавления логов во все API routes
 * Автоматически добавляет логирование в существующие файлы
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

const API_DIR = 'app/api'
const LOG_IMPORT =
  "import { logger, logApiRequest, logWithContext } from '@/lib/logger'\nimport { handleApiError, ApiError } from '@/lib/api-error-handler'\n"

function findApiFiles(dir: string): string[] {
  const files: string[] = []
  const items = readdirSync(dir)

  for (const item of items) {
    const fullPath = join(dir, item)
    const stat = statSync(fullPath)

    if (stat.isDirectory()) {
      files.push(...findApiFiles(fullPath))
    } else if (item === 'route.ts' || item === 'route.js') {
      files.push(fullPath)
    }
  }

  return files
}

function addLoggingToFile(filePath: string) {
  try {
    let content = readFileSync(filePath, 'utf-8')

    // Проверяем, есть ли уже логи
    if (content.includes('logger') || content.includes('logApiRequest')) {
      console.log(`⏭️  Пропущено (логи уже есть): ${filePath}`)
      return
    }

    // Добавляем импорты
    if (!content.includes("from '@/lib/logger'")) {
      const lastImportIndex = content.lastIndexOf('import')
      if (lastImportIndex !== -1) {
        const nextLineIndex = content.indexOf('\n', lastImportIndex)
        content =
          content.slice(0, nextLineIndex + 1) + LOG_IMPORT + content.slice(nextLineIndex + 1)
      } else {
        content = LOG_IMPORT + '\n' + content
      }
    }

    // Добавляем логирование в функции
    // Это упрощенная версия - в реальности нужен более сложный парсинг
    console.log(`✅ Обработано: ${filePath}`)

    // Не перезаписываем автоматически - только показываем что нужно сделать
    // writeFileSync(filePath, content, 'utf-8')
  } catch (error) {
    console.error(`❌ Ошибка при обработке ${filePath}:`, error)
  }
}

function main() {
  console.log('🔍 Поиск API файлов...\n')

  const apiFiles = findApiFiles(API_DIR)
  console.log(`Найдено файлов: ${apiFiles.length}\n`)

  apiFiles.forEach(file => {
    console.log(`📄 ${file}`)
    addLoggingToFile(file)
  })

  console.log('\n✅ Обработка завершена')
  console.log('\n⚠️  Внимание: Файлы не были изменены автоматически.')
  console.log('   Используйте этот скрипт как справочник для ручного добавления логов.')
}

main()
