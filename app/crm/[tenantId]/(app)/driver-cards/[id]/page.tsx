'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ContextNav } from '@/components/nav/context-nav'

type DriverCardStatus = 'DRAFT' | 'IN_WORK' | 'READY' | 'ISSUED' | 'CANCELLED'

type DriverCardDetails = {
  id: string
  status: DriverCardStatus
  driverFullName: string | null
  driverPhone: string | null
  applicationDate: string | null
  receivedByDriverDate: string | null
  expiryDate: string | null
  cardNumber: string | null
  pinPackCodes: any | null
  createdAt: string
  updatedAt: string
  customer: { id: string; name: string; inn: string | null } | null
  order: { id: string; number: string; isPaid: boolean; createdAt: string } | null
}

function toLocalDateTimeValue(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function DriverCardDetailsPage() {
  const params = useParams<{ tenantId: string; id: string }>()
  const tenantId = params.tenantId
  const id = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<DriverCardDetails | null>(null)

  const [status, setStatus] = useState<DriverCardStatus>('DRAFT')
  const [driverFullName, setDriverFullName] = useState('')
  const [driverPhone, setDriverPhone] = useState('')
  const [applicationDateLocal, setApplicationDateLocal] = useState('')
  const [receivedByDriverDateLocal, setReceivedByDriverDateLocal] = useState('')
  const [expiryDateLocal, setExpiryDateLocal] = useState('')
  const [cardNumber, setCardNumber] = useState('')
  const [pin1, setPin1] = useState('')
  const [pin2, setPin2] = useState('')
  const [showPins, setShowPins] = useState(false)

  const canSave = useMemo(() => Boolean(data?.id) && !saving, [data?.id, saving])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/driver-cards/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить заявку')
      const row = json as DriverCardDetails
      setData(row)

      setStatus((row.status as DriverCardStatus) ?? 'DRAFT')
      setDriverFullName(row.driverFullName ?? '')
      setDriverPhone(row.driverPhone ?? '')
      setApplicationDateLocal(toLocalDateTimeValue(row.applicationDate))
      setReceivedByDriverDateLocal(toLocalDateTimeValue(row.receivedByDriverDate))
      setExpiryDateLocal(toLocalDateTimeValue(row.expiryDate))
      setCardNumber(row.cardNumber ?? '')
      setPin1(String(row.pinPackCodes?.pin1 ?? ''))
      setPin2(String(row.pinPackCodes?.pin2 ?? ''))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    if (!data) return
    setSaving(true)
    setError('')
    try {
      const body = {
        status,
        driverFullName: driverFullName || null,
        driverPhone: driverPhone || null,
        applicationDate: applicationDateLocal ? new Date(applicationDateLocal).toISOString() : null,
        receivedByDriverDate: receivedByDriverDateLocal
          ? new Date(receivedByDriverDateLocal).toISOString()
          : null,
        expiryDate: expiryDateLocal ? new Date(expiryDateLocal).toISOString() : null,
        cardNumber: cardNumber || null,
        pinPackCodes: { pin1: pin1 || null, pin2: pin2 || null },
      }

      const res = await fetch(`/api/driver-cards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  if (loading) return <div className="text-gray-600">Загрузка...</div>
  if (!data) return <div className="text-gray-600">Нет данных</div>

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href={`/crm/${tenantId}/driver-cards`} className="hover:underline">
              Карты водителей
            </Link>{' '}
            / {data.driverFullName || 'Заявка'}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {data.driverFullName || 'Заявка на карту'}
          </h1>
          <p className="text-gray-600">
            Заказ:{' '}
            {data.order ? (
              <Link
                href={`/crm/${tenantId}/customer-orders/${data.order.id}`}
                className="text-blue-600 hover:underline"
              >
                {data.order.number}
              </Link>
            ) : (
              '—'
            )}{' '}
            · Клиент:{' '}
            {data.customer ? (
              <Link
                href={`/crm/${tenantId}/customers/${data.customer.id}`}
                className="text-blue-600 hover:underline"
              >
                {data.customer.name}
              </Link>
            ) : (
              '—'
            )}{' '}
            · Оплата:{' '}
            <span className="font-medium">{data.order?.isPaid ? 'оплачен' : 'не оплачен'}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <ContextNav
            backHref={`/crm/${tenantId}/driver-cards`}
            upHref={
              data.order?.id
                ? `/crm/${tenantId}/customer-orders/${data.order.id}`
                : data.customer?.id
                  ? `/crm/${tenantId}/customers/${data.customer.id}`
                  : `/crm/${tenantId}/driver-cards`
            }
          />
          <Button variant="gradient" onClick={save} disabled={!canSave} isLoading={saving}>
            Сохранить
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={status}
              onChange={e => setStatus(e.target.value as DriverCardStatus)}
            >
              <option value="DRAFT">Черновик</option>
              <option value="IN_WORK">В работе</option>
              <option value="READY">Готово</option>
              <option value="ISSUED">Выдано</option>
              <option value="CANCELLED">Отменено</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Номер карты</label>
            <Input value={cardNumber} onChange={e => setCardNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ФИО</label>
            <Input value={driverFullName} onChange={e => setDriverFullName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Телефон</label>
            <Input value={driverPhone} onChange={e => setDriverPhone(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Дата оформления</label>
            <Input
              type="datetime-local"
              value={applicationDateLocal}
              onChange={e => setApplicationDateLocal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Дата получения водителем
            </label>
            <Input
              type="datetime-local"
              value={receivedByDriverDateLocal}
              onChange={e => setReceivedByDriverDateLocal(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Срок действия (окончание)
            </label>
            <Input
              type="datetime-local"
              value={expiryDateLocal}
              onChange={e => setExpiryDateLocal(e.target.value)}
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="font-semibold text-gray-900">Пин‑пак коды</div>
            <Button type="button" variant="outline" size="sm" onClick={() => setShowPins(v => !v)}>
              {showPins ? 'Скрыть' : 'Показать'}
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Пин‑пак 1"
              value={pin1}
              onChange={e => setPin1(e.target.value)}
              type={showPins ? 'text' : 'password'}
              autoComplete="new-password"
            />
            <Input
              label="Пин‑пак 2"
              value={pin2}
              onChange={e => setPin2(e.target.value)}
              type={showPins ? 'text' : 'password'}
              autoComplete="new-password"
            />
          </div>
        </div>

        <div className="text-sm text-gray-500">
          Создано: {new Date(data.createdAt).toLocaleString('ru-RU')} · Обновлено:{' '}
          {new Date(data.updatedAt).toLocaleString('ru-RU')}
        </div>
      </div>
    </div>
  )
}
