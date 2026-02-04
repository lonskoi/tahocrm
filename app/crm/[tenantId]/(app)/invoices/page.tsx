'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'

type Invoice = {
  id: string
  number: string
  status: string
  totalAmount: string
  customer: { id: string; name: string } | null
  issuerOrganization: { id: string; name: string } | null
  createdAt: string
}

export default function InvoicesPage() {
  const [items, setItems] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [number, setNumber] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/invoices')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить счета')
      setItems(data as Invoice[])
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
    return items.filter(i => {
      return (
        i.number.toLowerCase().includes(needle) ||
        (i.customer?.name ?? '').toLowerCase().includes(needle) ||
        (i.issuerOrganization?.name ?? '').toLowerCase().includes(needle) ||
        i.status.toLowerCase().includes(needle)
      )
    })
  }, [items, q])

  function openCreate() {
    setNumber('')
    setIsModalOpen(true)
  }

  async function create() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось создать счет')
      setIsModalOpen(false)
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
          <h1 className="text-3xl font-bold text-gray-900">Счета</h1>
          <p className="text-gray-600">
            Позиции/НДС — в базе, генерация документов будет следующим этапом
          </p>
        </div>
        <Button variant="gradient" onClick={openCreate} disabled={loading}>
          Создать счет
        </Button>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Номер, клиент, статус"
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
              <th className="px-4 py-3 text-left">Организация</th>
              <th className="px-4 py-3 text-left">Статус</th>
              <th className="px-4 py-3 text-right">Сумма</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(i => (
              <tr key={i.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link className="hover:underline" href={`./invoices/${i.id}`}>
                    {i.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{i.customer?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{i.issuerOrganization?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{i.status}</td>
                <td className="px-4 py-3 text-right text-gray-700">{i.totalAmount}</td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {loading ? 'Загрузка...' : 'Счетов пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Создать счет"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Номер счета"
            value={number}
            onChange={e => setNumber(e.target.value)}
            placeholder="Например: СЧ-0001"
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={create} isLoading={loading}>
              Создать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
