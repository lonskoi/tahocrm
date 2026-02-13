'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDateTime, localInputToIso, pickBusinessDate } from '@/lib/datetime'

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
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
  customer: { id: string; name: string }
  order: { id: string; number: string; isPaid: boolean; createdAt: string }
}

type Customer = {
  id: string
  type: 'COMPANY' | 'SOLE_PROPRIETOR' | 'INDIVIDUAL'
  name: string
  inn: string | null
  phone: string | null
  email: string | null
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

  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [newCustomerType, setNewCustomerType] = useState<Customer['type']>('COMPANY')
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerInn, setNewCustomerInn] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerEmail, setNewCustomerEmail] = useState('')

  const [formDriverFullName, setFormDriverFullName] = useState('')
  const [formDriverPhone, setFormDriverPhone] = useState('')
  const [formStatus, setFormStatus] = useState<
    'DRAFT' | 'IN_WORK' | 'READY' | 'ISSUED' | 'CANCELLED'
  >('DRAFT')
  const [formApplicationDateLocal, setFormApplicationDateLocal] = useState('')
  const [formReceivedByDriverDateLocal, setFormReceivedByDriverDateLocal] = useState('')
  const [formExpiryDateLocal, setFormExpiryDateLocal] = useState('')
  const [formCardNumber, setFormCardNumber] = useState('')
  const [formPin1, setFormPin1] = useState('')
  const [formPin2, setFormPin2] = useState('')
  const [businessCreatedAtLocal, setBusinessCreatedAtLocal] = useState('')
  const [businessUpdatedAtLocal, setBusinessUpdatedAtLocal] = useState('')

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

  const filteredCustomers = useMemo(() => {
    const needle = customerSearch.trim().toLowerCase()
    if (!needle) return customers
    return customers.filter(c => {
      return (
        c.name.toLowerCase().includes(needle) ||
        (c.inn ?? '').toLowerCase().includes(needle) ||
        (c.phone ?? '').toLowerCase().includes(needle) ||
        (c.email ?? '').toLowerCase().includes(needle)
      )
    })
  }, [customers, customerSearch])

  function toIsoOrNull(local: string): string | null {
    const v = local.trim()
    if (!v) return null
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) return null
    return d.toISOString()
  }

  async function loadRows() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/driver-cards')
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить реестр карт')
      setRows(json as DriverCardRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function loadCustomers() {
    try {
      const res = await fetch('/api/customers')
      if (!res.ok) return
      const data = (await res.json()) as Customer[]
      setCustomers(data)
    } catch {
      // ignore
    }
  }

  function openCreate() {
    setIsCreateOpen(true)
    setCustomerSearch('')
    setCustomerId('')
    setNewCustomerType('COMPANY')
    setNewCustomerName('')
    setNewCustomerInn('')
    setNewCustomerPhone('')
    setNewCustomerEmail('')
    setFormDriverFullName('')
    setFormDriverPhone('')
    setFormStatus('DRAFT')
    setFormApplicationDateLocal('')
    setFormReceivedByDriverDateLocal('')
    setFormExpiryDateLocal('')
    setFormCardNumber('')
    setFormPin1('')
    setFormPin2('')
    setBusinessCreatedAtLocal('')
    setBusinessUpdatedAtLocal('')
    void loadCustomers()
  }

  async function quickCreateCustomer() {
    const name = newCustomerName.trim()
    if (!name) {
      setError('Введите наименование/ФИО клиента')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: newCustomerType,
          name,
          inn: newCustomerInn.trim() || null,
          phone: newCustomerPhone.trim() || null,
          email: newCustomerEmail.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось создать клиента')
      await loadCustomers()
      setCustomerId(json.id)
      setCustomerSearch(name)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function createRequest() {
    if (!tenantId) {
      setError('tenantId missing')
      return
    }
    if (!customerId) {
      setError('Выберите или создайте клиента')
      return
    }
    setLoading(true)
    setError('')
    try {
      const pinPackCodes =
        formPin1.trim() || formPin2.trim()
          ? { pin1: formPin1.trim() || null, pin2: formPin2.trim() || null }
          : null

      const payload = {
        type: 'CARD_ISSUE',
        status: 'DRAFT',
        customerId,
        description: 'Заявка на карту водителя (создано вручную)',
        driverCards: [
          {
            status: formStatus,
            driverFullName: formDriverFullName.trim() || null,
            driverPhone: formDriverPhone.trim() || null,
            applicationDate: toIsoOrNull(formApplicationDateLocal),
            receivedByDriverDate: toIsoOrNull(formReceivedByDriverDateLocal),
            expiryDate: toIsoOrNull(formExpiryDateLocal),
            cardNumber: formCardNumber.trim() || null,
            pinPackCodes,
            businessCreatedAt: localInputToIso(businessCreatedAtLocal),
            businessUpdatedAt: localInputToIso(businessUpdatedAtLocal),
          },
        ],
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось создать заявку')

      setIsCreateOpen(false)
      await loadRows()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRows()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Карты водителей</h1>
          <p className="text-gray-600">Реестр заявок на карты из заказов покупателей</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gradient" onClick={openCreate} disabled={loading}>
            Добавить заявку
          </Button>
          <Button variant="outline" onClick={loadRows} disabled={loading}>
            Обновить
          </Button>
        </div>
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
                <th className="px-4 py-3 text-left">Дата/время</th>
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
                  <td className="px-4 py-3 text-xs text-gray-600">
                    <div>
                      Создано: {formatDateTime(pickBusinessDate(r.businessCreatedAt, r.createdAt))}
                    </div>
                    <div>
                      Обновлено:{' '}
                      {formatDateTime(pickBusinessDate(r.businessUpdatedAt, r.updatedAt))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Новая заявка на карту водителя"
        size="lg"
      >
        <div className="space-y-5">
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Клиент</div>

            <Input
              label="Поиск клиента"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Название/ФИО, ИНН, телефон, email"
            />

            <div className="mt-3 max-h-48 overflow-auto rounded-xl border border-gray-200 bg-white">
              {filteredCustomers.length === 0 ? (
                <div className="p-3 text-sm text-gray-600">Клиенты не найдены</div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {filteredCustomers.slice(0, 50).map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className={[
                        'w-full text-left px-3 py-2 hover:bg-gray-50',
                        customerId === c.id ? 'bg-blue-50' : '',
                      ].join(' ')}
                      onClick={() => setCustomerId(c.id)}
                    >
                      <div className="text-sm font-medium text-gray-900">{c.name}</div>
                      <div className="text-xs text-gray-500">
                        {c.type === 'COMPANY'
                          ? 'Юрлицо'
                          : c.type === 'SOLE_PROPRIETOR'
                            ? 'ИП'
                            : 'Физлицо'}
                        {c.inn ? ` · ИНН: ${c.inn}` : ''}
                        {c.phone ? ` · ${c.phone}` : ''}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 border-t border-gray-200 pt-4">
              <div className="text-sm font-semibold text-gray-900 mb-3">
                Добавить нового клиента
              </div>

              <label className="block text-sm font-medium text-gray-700 mb-1">Тип</label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                value={newCustomerType}
                onChange={e => setNewCustomerType(e.target.value as Customer['type'])}
              >
                <option value="COMPANY">Юрлицо</option>
                <option value="SOLE_PROPRIETOR">ИП</option>
                <option value="INDIVIDUAL">Физлицо</option>
              </select>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Наименование / ФИО"
                  value={newCustomerName}
                  onChange={e => setNewCustomerName(e.target.value)}
                />
                <Input
                  label="ИНН (если есть)"
                  value={newCustomerInn}
                  onChange={e => setNewCustomerInn(e.target.value)}
                />
                <Input
                  label="Телефон (если есть)"
                  value={newCustomerPhone}
                  onChange={e => setNewCustomerPhone(e.target.value)}
                />
                <Input
                  label="Email (если есть)"
                  value={newCustomerEmail}
                  onChange={e => setNewCustomerEmail(e.target.value)}
                />
              </div>

              <div className="mt-3">
                <Button variant="outline" onClick={quickCreateCustomer} disabled={loading}>
                  Создать и выбрать
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Данные заявки</div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="ФИО водителя"
                value={formDriverFullName}
                onChange={e => setFormDriverFullName(e.target.value)}
              />
              <Input
                label="Телефон водителя"
                value={formDriverPhone}
                onChange={e => setFormDriverPhone(e.target.value)}
              />
            </div>

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                value={formStatus}
                onChange={e => setFormStatus(e.target.value as any)}
              >
                <option value="DRAFT">Черновик</option>
                <option value="IN_WORK">В работе</option>
                <option value="READY">Готово</option>
                <option value="ISSUED">Выдано</option>
                <option value="CANCELLED">Отменено</option>
              </select>
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Дата оформления"
                type="datetime-local"
                value={formApplicationDateLocal}
                onChange={e => setFormApplicationDateLocal(e.target.value)}
              />
              <Input
                label="Дата получения"
                type="datetime-local"
                value={formReceivedByDriverDateLocal}
                onChange={e => setFormReceivedByDriverDateLocal(e.target.value)}
              />
              <Input
                label="Дата окончания"
                type="datetime-local"
                value={formExpiryDateLocal}
                onChange={e => setFormExpiryDateLocal(e.target.value)}
              />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                label="Дата/время создания (бизнес)"
                type="datetime-local"
                value={businessCreatedAtLocal}
                onChange={e => setBusinessCreatedAtLocal(e.target.value)}
              />
              <Input
                label="Дата/время изменения (бизнес)"
                type="datetime-local"
                value={businessUpdatedAtLocal}
                onChange={e => setBusinessUpdatedAtLocal(e.target.value)}
              />
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                label="Номер карты"
                value={formCardNumber}
                onChange={e => setFormCardNumber(e.target.value)}
              />
              <Input
                label="Пин‑пак 1"
                value={formPin1}
                onChange={e => setFormPin1(e.target.value)}
              />
              <Input
                label="Пин‑пак 2"
                value={formPin2}
                onChange={e => setFormPin2(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsCreateOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={createRequest} isLoading={loading}>
              Создать заявку
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
