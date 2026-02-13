'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { formatDateTime, pickBusinessDate } from '@/lib/datetime'

type CustomerOrder = {
  id: string
  number: string
  type: string
  customer: { id: string; name: string } | null
  totalAmount: string
  isPaid: boolean
  isShipped: boolean
  isDocumentsSigned: boolean
  invoices: Array<{
    id: string
    totalAmount: string
    isPaid: boolean
    isShipped: boolean
    isDocumentsSigned: boolean
  }>
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
}

export default function CustomerOrdersPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params?.tenantId
  const [items, setItems] = useState<CustomerOrder[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/orders')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить заказы')
      // Фильтруем только заказы покупателей
      const customerOrders = (data as CustomerOrder[]).filter(
        (o: any) => o.type === 'CUSTOMER_ORDER'
      )
      setItems(customerOrders)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter(o => {
      return (
        o.number.toLowerCase().includes(needle) ||
        (o.customer?.name ?? '').toLowerCase().includes(needle)
      )
    })
  }, [items, q])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Заказы покупателей</h1>
          <p className="text-gray-600">Управление заказами покупателей</p>
        </div>
        <Link href={`/crm/${tenantId}/customer-orders/new`}>
          <Button variant="gradient">Добавить заказ</Button>
        </Link>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Номер заказа, клиент"
        />
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Номер</th>
              <th className="px-4 py-3 text-left">Клиент</th>
              <th className="px-4 py-3 text-right">Сумма</th>
              <th className="px-4 py-3 text-center">Оплата</th>
              <th className="px-4 py-3 text-center">Отгрузка</th>
              <th className="px-4 py-3 text-center">Подпись</th>
              <th className="px-4 py-3 text-left">Дата/время</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(order => {
              const invoice = order.invoices?.[0]
              const isPaid = invoice?.isPaid ?? order.isPaid
              const isShipped = invoice?.isShipped ?? order.isShipped
              const isDocumentsSigned = invoice?.isDocumentsSigned ?? order.isDocumentsSigned
              const totalAmount = invoice?.totalAmount ?? order.totalAmount

              return (
                <tr
                  key={order.id}
                  className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={() => {
                    window.location.href = `/crm/${tenantId}/customer-orders/${order.id}`
                  }}
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{order.number}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {order.customer ? (
                      <Link
                        href={`/crm/${tenantId}/customers/${order.customer.id}`}
                        className="text-blue-600 hover:underline"
                        onClick={e => e.stopPropagation()}
                      >
                        {order.customer.name}
                      </Link>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">
                    {parseFloat(totalAmount).toLocaleString('ru-RU', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    ₽
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isPaid ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Да
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Нет
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isShipped ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Да
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Нет
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {isDocumentsSigned ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Да
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        Нет
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>
                      Создано:{' '}
                      {formatDateTime(pickBusinessDate(order.businessCreatedAt, order.createdAt))}
                    </div>
                    <div>
                      Обновлено:{' '}
                      {formatDateTime(pickBusinessDate(order.businessUpdatedAt, order.updatedAt))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <Link href={`/crm/${tenantId}/customer-orders/${order.id}`}>
                        <Button variant="outline" size="sm">
                          Открыть
                        </Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={8}>
                  {loading ? 'Загрузка...' : 'Заказы пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
