'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Customer = {
  id: string
  type: 'COMPANY' | 'SOLE_PROPRIETOR' | 'INDIVIDUAL'
  name: string
  inn: string | null
  phone: string | null
  email: string | null
  createdAt: string
  _count?: { vehicles: number; orders: number; invoices: number }
}

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customers')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить клиентов')
      setItems(data as Customer[])
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
    return items.filter(c => {
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.inn ?? '').toLowerCase().includes(needle) ||
        (c.phone ?? '').toLowerCase().includes(needle) ||
        (c.email ?? '').toLowerCase().includes(needle)
      )
    })
  }, [items, q])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Клиенты</h1>
          <p className="text-gray-600">Юрлица/ИП и физлица</p>
        </div>
        <Link href="./customers/new">
          <Button variant="gradient" disabled={loading}>
            Добавить клиента
          </Button>
        </Link>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Имя, ИНН, телефон, email"
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
              <th className="px-4 py-3 text-left">Клиент</th>
              <th className="px-4 py-3 text-left">ИНН</th>
              <th className="px-4 py-3 text-left">Контакты</th>
              <th className="px-4 py-3 text-left">Связи</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900">
                    <Link className="hover:underline" href={`./customers/${c.id}`}>
                      {c.name}
                    </Link>
                  </div>
                  <div className="text-xs text-gray-500">
                    {c.type === 'COMPANY'
                      ? 'Юрлицо'
                      : c.type === 'SOLE_PROPRIETOR'
                        ? 'ИП'
                        : 'Физлицо'}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-700">{c.inn ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{c.phone ?? '—'}</div>
                  <div className="text-xs text-gray-500">{c.email ?? ''}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <div className="text-xs">
                    ТС: {c._count?.vehicles ?? 0} · Сделки: {c._count?.orders ?? 0} · Счета:{' '}
                    {c._count?.invoices ?? 0}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? 'Загрузка...' : 'Клиентов пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
