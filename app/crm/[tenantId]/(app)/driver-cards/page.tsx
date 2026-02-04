'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'

type DriverCardRow = {
  id: string
  status: string
  driverFullName: string | null
  driverPhone: string | null
  applicationDate: string | null
  receivedByDriverDate: string | null
  expiryDate: string | null
  cardNumber: string | null
  pinPackCodes: any | null
  createdAt: string
  customer: { id: string; name: string }
  order: { id: string; number: string; isPaid: boolean; createdAt: string }
}

function formatDate(iso?: string | null) {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ru-RU')
  } catch {
    return '—'
  }
}

export default function DriverCardsRegistryPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params?.tenantId
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState<DriverCardRow[]>([])
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})

  const reveal = (id: string) => setRevealed(prev => ({ ...prev, [id]: !prev[id] }))

  const pinTextById = useMemo(() => {
    const m = new Map<string, string>()
    for (const r of rows) {
      const v = r.pinPackCodes
      if (!v) {
        m.set(r.id, '')
        continue
      }
      if (typeof v === 'string') m.set(r.id, v)
      else m.set(r.id, JSON.stringify(v))
    }
    return m
  }, [rows])

  useEffect(() => {
    setLoading(true)
    setError('')
    fetch('/api/driver-cards')
      .then(async res => {
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить реестр карт')
        setRows(json as DriverCardRow[])
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Карты водителей</h1>
          <p className="text-gray-600">Реестр заявок на карты из заказов покупателей</p>
        </div>
        <Button variant="outline" onClick={() => window.location.reload()} disabled={loading}>
          Обновить
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">Заявки</div>
        {loading ? (
          <div className="p-5 text-gray-600">Загрузка...</div>
        ) : rows.length === 0 ? (
          <div className="p-5 text-gray-600">Пока нет заявок</div>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">ФИО</th>
                <th className="px-4 py-3 text-left">Телефон</th>
                <th className="px-4 py-3 text-left">Статус</th>
                <th className="px-4 py-3 text-left">Оформление</th>
                <th className="px-4 py-3 text-left">Получение</th>
                <th className="px-4 py-3 text-left">Окончание</th>
                <th className="px-4 py-3 text-left">Номер карты</th>
                <th className="px-4 py-3 text-left">Пин‑пак</th>
                <th className="px-4 py-3 text-left">Клиент</th>
                <th className="px-4 py-3 text-left">Заказ</th>
                <th className="px-4 py-3 text-left">Оплата</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 text-gray-900">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/crm/${tenantId}/driver-cards/${r.id}`}
                    >
                      {r.driverFullName || '—'}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{r.driverPhone || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{r.status}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(r.applicationDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(r.receivedByDriverDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDate(r.expiryDate)}</td>
                  <td className="px-4 py-3 text-gray-700">{r.cardNumber || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {pinTextById.get(r.id) ? (
                      <button
                        className="text-blue-600 hover:underline"
                        onClick={() => reveal(r.id)}
                      >
                        {revealed[r.id] ? pinTextById.get(r.id) : '••••'}
                      </button>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/crm/${tenantId}/customers/${r.customer.id}`}
                    >
                      {r.customer.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <Link
                      className="text-blue-600 hover:underline"
                      href={`/crm/${tenantId}/customer-orders/${r.order.id}`}
                    >
                      {r.order.number || r.order.id}
                    </Link>
                    <div className="text-xs text-gray-400">
                      создан: {formatDate(r.order.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={r.order.isPaid ? 'text-green-700' : 'text-orange-700'}>
                      {r.order.isPaid ? 'Оплачен' : 'Не оплачен'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
