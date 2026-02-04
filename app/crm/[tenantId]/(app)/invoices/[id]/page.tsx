'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContextNav } from '@/components/nav/context-nav'
import { OpenRelatedLink } from '@/components/nav/open-related-link'

type InvoiceDetails = {
  id: string
  number: string
  issueDate?: string
  updNumber?: string | null
  updDate?: string | null
  createdAt?: string
  status: string
  amount: string
  taxAmount: string
  totalAmount: string
  customer: { id: string; name: string } | null
  order: { id: string; number: string } | null
  issuerOrganization: { id: string; name: string } | null
  items: Array<{
    id: string
    name: string
    quantity: string
    price: string
    vatRate: string
    vatAmount: string
    totalAmount: string
  }>
}

export default function InvoiceDetailsPage() {
  const params = useParams<{ tenantId: string; id: string }>()
  const id = params?.id
  const tenantId = params?.tenantId

  const [data, setData] = useState<InvoiceDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [number, setNumber] = useState('')
  const [issueDateLocal, setIssueDateLocal] = useState('')
  const [updNumber, setUpdNumber] = useState('')
  const [updDateLocal, setUpdDateLocal] = useState('')

  const downloadUpd = (format: 'xlsx' | 'pdf') => {
    if (!id) return
    window.location.href = `/api/documents/generate/upd?invoiceId=${encodeURIComponent(id)}&format=${format}`
  }

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/invoices/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить счет')
      const invoice = json as InvoiceDetails
      setData(invoice)

      const pad = (n: number) => String(n).padStart(2, '0')
      const toLocal = (iso?: string | null) => {
        if (!iso) return ''
        const d = new Date(iso)
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      }

      setNumber(invoice.number ?? '')
      setIssueDateLocal(toLocal(invoice.issueDate))
      setUpdNumber(invoice.updNumber ?? '')
      setUpdDateLocal(toLocal(invoice.updDate))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (error) {
    return (
      <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    )
  }
  if (!data) {
    return <div className="text-gray-600">{loading ? 'Загрузка...' : 'Нет данных'}</div>
  }

  async function saveMeta() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const body = {
        number,
        issueDate: issueDateLocal ? new Date(issueDateLocal).toISOString() : '',
        updNumber,
        updDate: updDateLocal ? new Date(updDateLocal).toISOString() : '',
      }
      const res = await fetch(`/api/invoices/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить реквизиты')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="../invoices" className="hover:underline">
              Счета
            </Link>{' '}
            / {data.number}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{data.number}</h1>
          <p className="text-gray-600">
            Статус: {data.status} · Клиент: {data.customer?.name ?? '—'} · Организация:{' '}
            {data.issuerOrganization?.name ?? '—'}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <ContextNav
            backHref={`/crm/${tenantId}/invoices`}
            upHref={
              data.order?.id
                ? `/crm/${tenantId}/customer-orders/${data.order.id}`
                : data.customer?.id
                  ? `/crm/${tenantId}/customers/${data.customer.id}`
                  : `/crm/${tenantId}/invoices`
            }
          />
          <OpenRelatedLink
            label="Открыть заказ"
            href={data.order?.id ? `/crm/${tenantId}/customer-orders/${data.order.id}` : ''}
            disabled={!data.order?.id}
          />
          <OpenRelatedLink
            label="Открыть клиента"
            href={data.customer?.id ? `/crm/${tenantId}/customers/${data.customer.id}` : ''}
            disabled={!data.customer?.id}
          />
          <Button variant="outline" onClick={() => downloadUpd('xlsx')} disabled={loading || !id}>
            УПД (XLSX)
          </Button>
          <Button variant="outline" onClick={() => downloadUpd('pdf')} disabled={loading || !id}>
            УПД (PDF)
          </Button>
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Обновить
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="font-semibold text-gray-900 mb-3">Реквизиты</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-700 mb-1">Номер счета</div>
            <Input value={number} onChange={e => setNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-gray-700 mb-1">Дата счета</div>
            <Input
              type="datetime-local"
              value={issueDateLocal}
              onChange={e => setIssueDateLocal(e.target.value)}
            />
          </div>
          <div>
            <div className="text-gray-700 mb-1">Время создания</div>
            <Input
              value={data.createdAt ? new Date(data.createdAt).toLocaleString('ru-RU') : '—'}
              readOnly
            />
          </div>
          <div>
            <div className="text-gray-700 mb-1">Номер УПД</div>
            <Input value={updNumber} onChange={e => setUpdNumber(e.target.value)} />
          </div>
          <div>
            <div className="text-gray-700 mb-1">Дата УПД</div>
            <Input
              type="datetime-local"
              value={updDateLocal}
              onChange={e => setUpdDateLocal(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={saveMeta} disabled={loading}>
              Сохранить реквизиты
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="font-semibold text-gray-900 mb-3">Итоги</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>Без НДС: {data.amount}</div>
          <div>НДС: {data.taxAmount}</div>
          <div className="font-semibold">Итого: {data.totalAmount}</div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">
          Позиции
        </div>
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Наименование</th>
              <th className="px-4 py-3 text-right">Кол-во</th>
              <th className="px-4 py-3 text-right">Цена (с НДС)</th>
              <th className="px-4 py-3 text-right">НДС</th>
              <th className="px-4 py-3 text-right">Итого</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map(it => (
              <tr key={it.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-900">{it.name}</td>
                <td className="px-4 py-3 text-right text-gray-700">{it.quantity}</td>
                <td className="px-4 py-3 text-right text-gray-700">{it.price}</td>
                <td className="px-4 py-3 text-right text-gray-700">
                  {it.vatRate} ({it.vatAmount})
                </td>
                <td className="px-4 py-3 text-right text-gray-900">{it.totalAmount}</td>
              </tr>
            ))}
            {data.items.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  Нет позиций
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
