import { NextRequest } from 'next/server'
import { prismaTenant } from '@/lib/prisma'
import type { AuditAction } from '@prisma/client'

type EntityType =
  | 'vehicle'
  | 'customer'
  | 'tachograph'
  | 'document'
  | 'contact'
  | 'bank-account'
  | 'order'
  | 'invoice'

interface LogChangeParams {
  entityType: EntityType
  entityId: string
  action: AuditAction
  oldData?: Record<string, any> | null
  newData?: Record<string, any> | null
  userId: string | null
  tenantId: string
  request?: NextRequest
}

/**
 * Вычисляет разницу между двумя объектами
 * Возвращает объект с измененными полями: {field: {old: value, new: value}}
 */
export function diffObjects(
  oldData: Record<string, any> | null | undefined,
  newData: Record<string, any> | null | undefined
): Record<string, { old: any; new: any }> {
  const changes: Record<string, { old: any; new: any }> = {}

  if (!oldData && !newData) return changes
  if (!oldData) {
    // CREATE: все поля новые
    if (newData) {
      for (const key in newData) {
        if (newData[key] !== undefined && newData[key] !== null && newData[key] !== '') {
          changes[key] = { old: null, new: newData[key] }
        }
      }
    }
    return changes
  }
  if (!newData) {
    // DELETE: все поля старые
    for (const key in oldData) {
      if (oldData[key] !== undefined && oldData[key] !== null && oldData[key] !== '') {
        changes[key] = { old: oldData[key], new: null }
      }
    }
    return changes
  }

  // UPDATE: находим измененные поля
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)])

  for (const key of allKeys) {
    const oldValue = oldData[key]
    const newValue = newData[key]

    // Сравниваем значения (с учетом null, undefined, пустых строк)
    const oldNormalized =
      oldValue === null || oldValue === undefined || oldValue === '' ? null : oldValue
    const newNormalized =
      newValue === null || newValue === undefined || newValue === '' ? null : newValue

    // Сравниваем даты как строки ISO
    if (oldValue instanceof Date && newValue instanceof Date) {
      if (oldValue.toISOString() !== newValue.toISOString()) {
        changes[key] = { old: oldValue.toISOString(), new: newValue.toISOString() }
      }
    } else if (oldValue instanceof Date) {
      changes[key] = { old: oldValue.toISOString(), new: newNormalized }
    } else if (newValue instanceof Date) {
      changes[key] = { old: oldNormalized, new: newValue.toISOString() }
    } else if (JSON.stringify(oldNormalized) !== JSON.stringify(newNormalized)) {
      changes[key] = { old: oldNormalized, new: newNormalized }
    }
  }

  return changes
}

/**
 * Логирует изменение в AuditLog
 */
export async function logChange(params: LogChangeParams): Promise<void> {
  try {
    const { entityType, entityId, action, oldData, newData, userId, tenantId, request } = params

    // Вычисляем изменения
    let changes: Record<string, { old: any; new: any }> = {}

    if (action === 'CREATE') {
      // Для CREATE логируем все поля из newData
      changes = diffObjects(null, newData)
    } else if (action === 'UPDATE') {
      // Для UPDATE логируем только измененные поля
      changes = diffObjects(oldData, newData)
    } else if (action === 'DELETE') {
      // Для DELETE логируем все поля из oldData
      changes = diffObjects(oldData, null)
    }

    // Пропускаем логирование, если нет изменений (для UPDATE)
    if (action === 'UPDATE' && Object.keys(changes).length === 0) {
      return
    }

    // Получаем IP и User-Agent из request
    let ipAddress: string | null = null
    let userAgent: string | null = null

    if (request) {
      // IP адрес
      const forwarded = request.headers.get('x-forwarded-for')
      const realIp = request.headers.get('x-real-ip')
      ipAddress =
        forwarded?.split(',')[0]?.trim() || realIp || request.headers.get('x-client-ip') || null

      // User-Agent
      userAgent = request.headers.get('user-agent') || null
    }

    // Используем prismaTenant для записи в tenant базу
    const prisma = prismaTenant(tenantId)

    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: userId || null,
        action,
        entityType,
        entityId,
        changes: Object.keys(changes).length > 0 ? (changes as any) : null,
        ipAddress,
        userAgent,
      },
    })
  } catch (error) {
    // Не прерываем выполнение при ошибке логирования
    console.error('Failed to log audit change:', error)
  }
}
