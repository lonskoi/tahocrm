import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Multi-tenancy helper
export function requireTenant(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new Error('Tenant ID is required')
  }
  return tenantId
}

/**
 * Normalize gov number-like input:
 * - removes spaces and dashes
 * - uppercases
 * - converts latin lookalike letters to cyrillic (A->А, B->В, etc.)
 *
 * This helps when users type госномер in mixed keyboard layouts.
 */
export function normalizeGovNumberLike(input: string): string {
  const compact = String(input ?? '')
    .trim()
    .replace(/[\s-]+/g, '')
    .toUpperCase()

  const map: Record<string, string> = {
    A: 'А',
    B: 'В',
    E: 'Е',
    K: 'К',
    M: 'М',
    H: 'Н',
    O: 'О',
    P: 'Р',
    C: 'С',
    T: 'Т',
    Y: 'У',
    X: 'Х',
  }

  return compact.replace(/[ABEKMHOPCTYX]/g, ch => map[ch] ?? ch)
}

// Smart search parser
export function parseSearchQuery(query: string): {
  type: 'inn' | 'govNumber' | 'vin' | 'serial' | 'name' | 'general'
  value: string
} {
  const trimmed = query.trim()
  const compact = trimmed.replace(/[\s-]+/g, '')

  // ИНН (10 или 12 цифр)
  if (/^\d{10}$|^\d{12}$/.test(compact)) {
    return { type: 'inn', value: compact }
  }

  // Госномер (формат: А123ВВ, А123ВВ77 и т.д.), допускаем ввод латиницей/с пробелами
  const govCandidate = normalizeGovNumberLike(compact)
  if (/^[АВЕКМНОРСТУХ]\d{3}[АВЕКМНОРСТУХ]{2}\d{0,3}$/i.test(govCandidate)) {
    return { type: 'govNumber', value: govCandidate }
  }

  // VIN (17 символов, буквы и цифры)
  if (/^[A-HJ-NPR-Z0-9]{17}$/i.test(compact)) {
    return { type: 'vin', value: compact.toUpperCase() }
  }

  // Серийный номер (обычно содержит буквы и цифры)
  if (/^[A-Z0-9]{6,}$/i.test(compact)) {
    return { type: 'serial', value: compact.toUpperCase() }
  }

  // Фамилия (начинается с заглавной буквы, содержит кириллицу)
  if (/^[А-ЯЁ][а-яё]+$/i.test(trimmed)) {
    return { type: 'name', value: trimmed }
  }

  return { type: 'general', value: trimmed }
}
// Comment parser for universal "+" button
export function parseComment(comment: string): {
  action: 'create_order' | null
  vehicleInfo?: {
    govNumber?: string
    type?: string
  }
} {
  const lower = comment.toLowerCase()

  // Поиск госномера
  const govNumberMatch = comment.match(
    /[АВЕКМНОРСТУХABEKMHOPCTYX]\d{3}[АВЕКМНОРСТУХABEKMHOPCTYX]{2}\d{0,3}/i
  )
  const govNumber = govNumberMatch ? normalizeGovNumberLike(govNumberMatch[0]) : undefined

  // Поиск типа услуги
  let type: string | undefined
  if (lower.includes('замена скзи') || lower.includes('скзи')) {
    type = 'SKZI_REPLACEMENT'
  } else if (lower.includes('калибровка')) {
    type = 'CALIBRATION'
  } else if (lower.includes('батарейк') || lower.includes('батарея')) {
    type = 'BATTERY_REPLACEMENT'
  } else if (lower.includes('карт')) {
    type = 'CARD_ISSUE'
  }

  if (govNumber || type) {
    const vehicleInfo: { govNumber?: string; type?: string } = {}
    if (govNumber) vehicleInfo.govNumber = govNumber
    if (type) vehicleInfo.type = type

    return {
      action: 'create_order',
      vehicleInfo,
    }
  }

  return { action: null }
}
