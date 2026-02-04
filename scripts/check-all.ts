#!/usr/bin/env tsx
/**
 * Скрипт для проверки всего приложения
 * Запускает все проверки: типы, линтер, тесты, сборку, coverage
 */

import { execSync } from 'child_process'
import { logger } from '../lib/logger'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'

const COVERAGE_THRESHOLD = 25 // Минимальное покрытие в процентах

const checks = [
  {
    name: 'TypeScript Type Check',
    command: 'npx tsc --noEmit',
    description: 'Проверка типов TypeScript',
  },
  {
    name: 'ESLint',
    command: 'npm run lint',
    description: 'Проверка кода линтером',
  },
  {
    name: 'Jest Tests',
    command: 'npm run test',
    description: 'Запуск unit и integration тестов',
  },
  {
    name: 'Test Coverage',
    command: 'npm run test:coverage',
    description: 'Проверка покрытия тестами',
  },
  {
    name: 'Next.js Build',
    command: 'npm run build',
    description: 'Проверка сборки приложения',
  },
]

/**
 * Проверка отсутствия any типов (базовая проверка)
 */
function checkForAnyTypes(): { success: boolean; message: string } {
  try {
    const result = execSync(
      'grep -r "\\bany\\b" --include="*.ts" --include="*.tsx" app lib components --exclude-dir=node_modules --exclude-dir=.next || true',
      {
        encoding: 'utf-8',
        cwd: process.cwd(),
      }
    )

    // Фильтруем разрешенные случаи (комментарии, SafeAny, и т.д.)
    const lines = result.split('\n').filter(line => {
      const trimmed = line.trim()
      if (!trimmed) return false
      // Игнорируем комментарии и специальные типы
      if (
        trimmed.includes('//') ||
        trimmed.includes('SafeAny') ||
        trimmed.includes('eslint-disable')
      ) {
        return false
      }
      return true
    })

    if (lines.length > 0) {
      return {
        success: false,
        message: `Найдено ${lines.length} использований 'any'. Используйте конкретные типы или SafeAny с комментарием.`,
      }
    }

    return { success: true, message: 'Проверка any типов пройдена' }
  } catch {
    // Если grep не найден (Windows), пропускаем проверку
    return { success: true, message: 'Проверка any типов пропущена (grep недоступен)' }
  }
}

/**
 * Проверка покрытия тестами
 */
function checkCoverage(): { success: boolean; message: string } {
  try {
    const coveragePath = join(process.cwd(), 'coverage', 'coverage-summary.json')
    if (!existsSync(coveragePath)) {
      return { success: false, message: 'Файл coverage не найден. Запустите npm run test:coverage' }
    }

    const coverage = JSON.parse(readFileSync(coveragePath, 'utf-8'))
    const total = coverage.total

    const statements = total.statements.pct
    const branches = total.branches.pct
    const functions = total.functions.pct
    const lines = total.lines.pct

    const minCoverage = Math.min(statements, branches, functions, lines)

    if (minCoverage < COVERAGE_THRESHOLD) {
      return {
        success: false,
        message: `Покрытие тестами ниже ${COVERAGE_THRESHOLD}%: Statements: ${statements.toFixed(1)}%, Branches: ${branches.toFixed(1)}%, Functions: ${functions.toFixed(1)}%, Lines: ${lines.toFixed(1)}%`,
      }
    }

    return {
      success: true,
      message: `Покрытие тестами: Statements: ${statements.toFixed(1)}%, Branches: ${branches.toFixed(1)}%, Functions: ${functions.toFixed(1)}%, Lines: ${lines.toFixed(1)}%`,
    }
  } catch (error) {
    return {
      success: false,
      message: `Ошибка при проверке покрытия: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

async function runCheck(check: (typeof checks)[0], index: number) {
  console.log(`\n[${index + 1}/${checks.length}] ${check.name}`)
  console.log(`📋 ${check.description}`)
  console.log(`🔧 Команда: ${check.command}\n`)

  try {
    execSync(check.command, {
      stdio: 'inherit',
      cwd: process.cwd(),
    })
    console.log(`✅ ${check.name} - Успешно\n`)
    return { success: true, name: check.name }
  } catch (error) {
    console.error(`❌ ${check.name} - Ошибка\n`)
    logger.error(`Check failed: ${check.name}`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return { success: false, name: check.name }
  }
}

async function main() {
  console.log('🚀 Запуск проверки всего приложения...\n')
  console.log('='.repeat(50))

  const results = []

  // Основные проверки
  for (const [i, check] of checks.entries()) {
    const result = await runCheck(check, i)
    results.push(result)
  }

  // Дополнительные проверки
  console.log(`\n[${checks.length + 1}/${checks.length + 3}] Additional Checks`)
  console.log(`📋 Дополнительные проверки\n`)

  // Проверка any типов
  const anyCheck = checkForAnyTypes()
  results.push({
    success: anyCheck.success,
    name: 'Any Types Check',
  })
  console.log(anyCheck.success ? `✅ ${anyCheck.message}\n` : `❌ ${anyCheck.message}\n`)

  // Проверка покрытия
  const coverageCheck = checkCoverage()
  results.push({
    success: coverageCheck.success,
    name: 'Coverage Check',
  })
  console.log(
    coverageCheck.success ? `✅ ${coverageCheck.message}\n` : `❌ ${coverageCheck.message}\n`
  )

  // Проверка валидации (базовая - наличие схем)
  const validationCheck = {
    success: true,
    name: 'Validation Schemas',
    message: 'Проверка наличия схем валидации',
  }
  try {
    const schemasPath = join(process.cwd(), 'lib', 'validation', 'schemas.ts')
    if (!existsSync(schemasPath)) {
      validationCheck.success = false
      validationCheck.message = 'Файл lib/validation/schemas.ts не найден'
    } else {
      console.log(`✅ ${validationCheck.message}\n`)
    }
  } catch {
    validationCheck.success = false
    validationCheck.message = 'Ошибка при проверке схем валидации'
    console.log(`❌ ${validationCheck.message}\n`)
  }
  results.push(validationCheck)

  console.log('\n' + '='.repeat(50))
  console.log('\n📊 Результаты проверки:\n')

  const successful = results.filter(r => r.success)
  const failed = results.filter(r => !r.success)

  results.forEach(result => {
    const icon = result.success ? '✅' : '❌'
    console.log(`${icon} ${result.name}`)
  })

  console.log(`\n✅ Успешно: ${successful.length}/${results.length}`)
  if (failed.length > 0) {
    console.log(`❌ Ошибок: ${failed.length}/${results.length}`)
    console.log('\nНеудачные проверки:')
    failed.forEach(result => {
      console.log(`  - ${result.name}`)
    })
    process.exit(1)
  } else {
    console.log('\n🎉 Все проверки пройдены успешно!')
    process.exit(0)
  }
}

main().catch(error => {
  console.error('Критическая ошибка при запуске проверок:', error)
  process.exit(1)
})
