'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type AuditLog = {
  id: string
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'LOGIN' | 'LOGOUT'
  entityType: string | null
  entityId: string | null
  changes: Record<string, { old: any; new: any }> | null
  createdAt: string
  user: {
    id: string
    name: string
    role: string
  } | null
}

interface AuditHistoryProps {
  tenantId: string
  basePath?: string
  entityType: 'vehicle' | 'customer' | 'tachograph' | 'document'
  entityId: string
}

const actionLabels: Record<AuditLog['action'], string> = {
  CREATE: 'Создан',
  UPDATE: 'Изменен',
  DELETE: 'Удален',
  VIEW: 'Просмотрен',
  LOGIN: 'Вход',
  LOGOUT: 'Выход',
}

const entityTypeLabels: Record<string, string> = {
  vehicle: 'ТС',
  customer: 'Клиент',
  tachograph: 'Оборудование',
  document: 'Документ',
  contact: 'Контакт',
  'bank-account': 'Банковский счет',
  order: 'Заказ',
  invoice: 'Счет',
}

const fieldLabels: Record<string, string> = {
  type: 'Тип',
  name: 'Наименование',
  fullName: 'Полное наименование',
  inn: 'ИНН',
  kpp: 'КПП',
  ogrn: 'ОГРН',
  okpo: 'ОКПО',
  firstName: 'Имя',
  lastName: 'Фамилия',
  middleName: 'Отчество',
  passport: 'Паспорт',
  address: 'Адрес',
  addressComment: 'Комментарий к адресу',
  legalAddress: 'Юридический адрес',
  phone: 'Телефон',
  email: 'Email',
  comment: 'Комментарий',
  customerId: 'Клиент',
  govNumber: 'Гос. номер',
  vin: 'VIN',
  color: 'Цвет',
  brand: 'Марка',
  model: 'Модель',
  year: 'Год',
  ptsNumber: 'Номер ПТС',
  category: 'Категория',
  ecoClass: 'Экологический класс',
  ownerInn: 'ИНН собственника',
  ownerName: 'Собственник',
  ownerAddress: 'Адрес собственника',
  mileage: 'Пробег',
  tireSize: 'Размерность резины',
  notes: 'Примечания',
  vehicleId: 'ТС',
  serialNumber: 'Серийный номер',
  skziId: 'Блок СКЗИ',
  batteryReplaced: 'Батарея заменена',
  w: 'Коэффициент W',
  k: 'Коэффициент K',
  l: 'Коэффициент L',
  workDate: 'Дата выполнения работ',
  title: 'Название',
  fileUrl: 'URL файла',
  fileName: 'Имя файла',
  mimeType: 'Тип файла',
  orderId: 'Заказ',
  invoiceId: 'Счет',
  tachographId: 'Оборудование',
  issueDate: 'Дата счета',
  updNumber: 'Номер УПД',
  updDate: 'Дата УПД',
  documentDate: 'Дата документа',
  number: 'Номер',
}

function formatValue(value: any): string {
  if (value === null || value === undefined) return '—'
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
  if (value instanceof Date || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/))) {
    try {
      const date = typeof value === 'string' ? new Date(value) : value
      return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return String(value)
    }
  }
  return String(value)
}

function isCuidLike(v: unknown): v is string {
  if (typeof v !== 'string') return false
  // Prisma cuid() values typically start with 'c' and are fairly long.
  return /^c[a-z0-9]{20,}$/i.test(v)
}

function getChangedValue(
  changes: Record<string, { old: any; new: any }> | null | undefined,
  field: string
): string | null {
  const c = changes?.[field]
  if (!c) return null
  const v = c.new ?? c.old
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s ? s : null
}

function entityHref(basePath: string, type: string, id: string): string {
  if (type === 'vehicle') return `${basePath}/vehicles/${id}`
  if (type === 'customer') return `${basePath}/customers/${id}`
  if (type === 'tachograph') return `${basePath}/equipment/${id}`
  if (type === 'order') return `${basePath}/customer-orders/${id}`
  if (type === 'invoice') return `${basePath}/invoices/${id}`
  if (type === 'document') return `${basePath}/documents`
  if (type === 'skzi') return `${basePath}/equipment`
  return basePath
}

function entityDisplayTitle(
  type: string,
  id: string,
  changes: Record<string, { old: any; new: any }> | null
): string {
  const byTypeField =
    type === 'vehicle'
      ? 'govNumber'
      : type === 'tachograph'
        ? 'serialNumber'
        : type === 'customer'
          ? 'name'
          : type === 'order' || type === 'invoice'
            ? 'number'
            : type === 'document'
              ? 'fileName'
              : null

  const fromChanges = byTypeField ? getChangedValue(changes, byTypeField) : null
  if (fromChanges) return fromChanges
  const short = id.length > 8 ? id.slice(-8) : id
  return `#${short}`
}

function renderValueAsLinkOrText(args: {
  basePath: string
  logType: string
  logId: string | null
  field: string
  value: any
}): React.ReactNode {
  const { basePath, logType, logId, field, value } = args

  // Link id fields
  if (field.endsWith('Id') && isCuidLike(value)) {
    const id = value
    const href =
      field === 'customerId'
        ? `${basePath}/customers/${id}`
        : field === 'vehicleId'
          ? `${basePath}/vehicles/${id}`
          : field === 'tachographId'
            ? `${basePath}/equipment/${id}`
            : field === 'orderId'
              ? `${basePath}/customer-orders/${id}`
              : field === 'invoiceId'
                ? `${basePath}/invoices/${id}`
                : field === 'skziId'
                  ? `${basePath}/equipment?q=${encodeURIComponent(id)}`
                  : null

    if (href) {
      return (
        <Link href={href} className="text-blue-600 hover:underline">
          {formatValue(value)}
        </Link>
      )
    }
  }

  // Link readable identifiers to the entity page of this log
  if (
    logId &&
    (field === 'govNumber' || field === 'serialNumber' || field === 'name' || field === 'number')
  ) {
    const href = entityHref(basePath, logType, logId)
    return (
      <Link href={href} className="text-blue-600 hover:underline">
        {formatValue(value)}
      </Link>
    )
  }

  return formatValue(value)
}

export function AuditHistory({
  tenantId,
  basePath: basePathProp,
  entityType,
  entityId,
}: AuditHistoryProps) {
  const basePath = basePathProp ?? `/crm/${tenantId}`
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch(`/api/audit/${entityType}/${entityId}`)
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить историю')
        setLogs(data as AuditLog[])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [entityType, entityId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">Загрузка истории...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    )
  }

  if (logs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        История изменений отсутствует
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {logs.map(log => {
        const changes = log.changes || {}
        const hasChanges = Object.keys(changes).length > 0
        const logType = String(log.entityType || entityType)
        const logId = log.entityId
        const logLabel = entityTypeLabels[logType] || logType
        const logHref = logId ? entityHref(basePath, logType, logId) : null
        const logTitle = logId ? entityDisplayTitle(logType, logId, log.changes) : '—'

        return (
          <div key={log.id} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-gray-900">{actionLabels[log.action]}</span>
                  {logHref ? (
                    <Link
                      href={logHref}
                      className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:underline"
                      title="Открыть"
                    >
                      {logLabel}: {logTitle}
                    </Link>
                  ) : (
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {logLabel}: {logTitle}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {new Date(log.createdAt).toLocaleString('ru-RU', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                {log.user && (
                  <div className="text-sm text-gray-600">
                    {log.user.name} ({log.user.role})
                  </div>
                )}
              </div>
            </div>

            {hasChanges && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-700 mb-2">Изменения:</div>
                <div className="space-y-2">
                  {Object.entries(changes).map(([field, change]) => {
                    const fieldLabel = fieldLabels[field] || field
                    return (
                      <div key={field} className="text-sm">
                        <div className="font-medium text-gray-700">{fieldLabel}:</div>
                        <div className="ml-4 space-y-1">
                          {log.action === 'CREATE' ? (
                            <div className="text-green-700">
                              <span className="font-medium">Добавлено:</span>{' '}
                              {renderValueAsLinkOrText({
                                basePath,
                                logType,
                                logId,
                                field,
                                value: change.new,
                              })}
                            </div>
                          ) : log.action === 'DELETE' ? (
                            <div className="text-red-700">
                              <span className="font-medium">Удалено:</span>{' '}
                              {renderValueAsLinkOrText({
                                basePath,
                                logType,
                                logId,
                                field,
                                value: change.old,
                              })}
                            </div>
                          ) : (
                            <>
                              {change.old !== null &&
                                change.old !== undefined &&
                                change.old !== '' && (
                                  <div className="text-red-700">
                                    <span className="font-medium">Было:</span>{' '}
                                    {renderValueAsLinkOrText({
                                      basePath,
                                      logType,
                                      logId,
                                      field,
                                      value: change.old,
                                    })}
                                  </div>
                                )}
                              {change.new !== null &&
                                change.new !== undefined &&
                                change.new !== '' && (
                                  <div className="text-green-700">
                                    <span className="font-medium">Стало:</span>{' '}
                                    {renderValueAsLinkOrText({
                                      basePath,
                                      logType,
                                      logId,
                                      field,
                                      value: change.new,
                                    })}
                                  </div>
                                )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {!hasChanges && log.action === 'UPDATE' && (
              <div className="mt-2 text-sm text-gray-500 italic">Изменения не обнаружены</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
