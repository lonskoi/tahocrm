'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { AuditHistory } from '@/components/audit/audit-history'
import { ContextNav } from '@/components/nav/context-nav'
import { formatDateTime, isoToLocalInput, localInputToIso } from '@/lib/datetime'

type CustomerType = 'COMPANY' | 'SOLE_PROPRIETOR' | 'INDIVIDUAL'

type CustomerContact = {
  id: string
  name: string
  position: string | null
  phone: string | null
  email: string | null
  comment: string | null
  createdAt: string
}

type CustomerBankAccount = {
  id: string
  bik: string | null
  bankName: string | null
  bankAddress: string | null
  corrAccount: string | null
  accountNumber: string | null
  comment: string | null
  createdAt: string
}

type CustomerDetails = {
  id: string
  type: CustomerType
  name: string
  fullName: string | null
  inn: string | null
  kpp: string | null
  ogrn: string | null
  okpo: string | null
  address: string | null // фактический адрес
  addressComment: string | null
  legalAddress: string | null
  phone: string | null
  email: string | null
  comment: string | null
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
  contacts: CustomerContact[]
  bankAccounts: CustomerBankAccount[]
  createdBy: { id: string; name: string; role: string } | null
  responsibles: Array<{ userId: string; user: { id: string; name: string; role: string } }>
  vehicles: Array<{
    id: string
    govNumber: string
    vin: string | null
    brand: string | null
    model: string | null
    year: number | null
    category: 'N1' | 'N2' | 'N3' | 'M1' | 'M2' | 'M3' | null
    mileage: number | null
    tachographs: Array<{
      id: string
      serialNumber: string | null
      model: string | null
      skzi?: { id: string; serialNumber: string | null } | null
    }>
  }>
  orders: Array<{ id: string; number: string; status: string; type: string }>
  invoices: Array<{ id: string; number: string; status: string; totalAmount: string }>
  documents: Array<{ id: string; type: string; fileName: string; fileUrl: string }>
}

type CustomerEvent =
  | { kind: 'ORDER'; id: string; title: string; status: string; createdAt: string }
  | { kind: 'INVOICE'; id: string; title: string; status: string; createdAt: string }
  | { kind: 'DOCUMENT'; id: string; title: string; createdAt: string; fileUrl?: string }

type CustomerTask = {
  id: string
  title: string
  status: string
  createdAt: string
  creator?: { id: string; name: string }
  assignee?: { id: string; name: string } | null
}

export default function CustomerDetailsPage() {
  const params = useParams<{ tenantId: string; id: string }>()
  const id = params?.id
  const tenantId = params?.tenantId

  const [data, setData] = useState<CustomerDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [tab, setTab] = useState<
    'details' | 'contacts' | 'bank' | 'access' | 'vehicles' | 'events' | 'tasks' | 'history'
  >('details')

  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [editingContact, setEditingContact] = useState<CustomerContact | null>(null)
  const [contactName, setContactName] = useState('')
  const [contactPosition, setContactPosition] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactComment, setContactComment] = useState('')

  const [isBankModalOpen, setIsBankModalOpen] = useState(false)
  const [editingBank, setEditingBank] = useState<CustomerBankAccount | null>(null)
  const [bik, setBik] = useState('')
  const [bankName, setBankName] = useState('')
  const [bankAddress, setBankAddress] = useState('')
  const [corrAccount, setCorrAccount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [bankComment, setBankComment] = useState('')

  const [users, setUsers] = useState<Array<{ id: string; name: string; role: string }> | null>(null)
  const [accessSaving, setAccessSaving] = useState(false)
  const [responsibleUserIds, setResponsibleUserIds] = useState<string[]>([])

  const [events, setEvents] = useState<CustomerEvent[] | null>(null)
  const [tasks, setTasks] = useState<CustomerTask[] | null>(null)

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<{ id: string; govNumber: string } | null>(
    null
  )
  const [vehicleGovNumber, setVehicleGovNumber] = useState('')
  const [vehicleVin, setVehicleVin] = useState('')
  const [vehicleBrand, setVehicleBrand] = useState('')
  const [vehicleModel, setVehicleModel] = useState('')
  const [vehicleYear, setVehicleYear] = useState('')
  const [vehicleColor, setVehicleColor] = useState('')
  const [vehiclePtsNumber, setVehiclePtsNumber] = useState('')
  const [vehicleCategory, setVehicleCategory] = useState<
    'N1' | 'N2' | 'N3' | 'M1' | 'M2' | 'M3' | ''
  >('')
  const [vehicleEcoClass, setVehicleEcoClass] = useState('')
  const [vehicleOwnerInn, setVehicleOwnerInn] = useState('')
  const [vehicleOwnerName, setVehicleOwnerName] = useState('')
  const [vehicleOwnerAddress, setVehicleOwnerAddress] = useState('')
  const [vehicleMileage, setVehicleMileage] = useState('')
  const [vehicleTireSize, setVehicleTireSize] = useState('')

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/customers/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить клиента')
      setData(json as CustomerDetails)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!data) return
    setResponsibleUserIds(data.responsibles?.map(r => r.userId) ?? [])
  }, [data])

  // Временное сохранение данных формы контакта
  const contactFormData = {
    name: contactName,
    position: contactPosition,
    phone: contactPhone,
    email: contactEmail,
    comment: contactComment,
  }
  const contactDraft = useFormDraft(
    { key: `contact-${id || 'new'}-${editingContact?.id || 'new'}`, enabled: isContactModalOpen },
    contactFormData,
    [isContactModalOpen, editingContact?.id]
  )

  // Временное сохранение данных формы банковского счета
  const bankFormData = {
    bik,
    bankName,
    bankAddress,
    corrAccount,
    accountNumber,
    comment: bankComment,
  }
  const bankDraft = useFormDraft(
    { key: `bank-account-${id || 'new'}-${editingBank?.id || 'new'}`, enabled: isBankModalOpen },
    bankFormData,
    [isBankModalOpen, editingBank?.id]
  )

  const canShowAccessTab = useMemo(() => {
    // If user can't load /api/users (403), we still show the tab but display message.
    return true
  }, [])

  async function saveCustomer(patch: Partial<CustomerDetails>) {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить клиента')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function openContactModal(contact?: CustomerContact) {
    setEditingContact(contact ?? null)
    // Восстанавливаем данные из черновика или используем данные из БД/пустые значения
    const draft = contactDraft.loadDraft()
    if (draft) {
      setContactName(draft.name ?? contact?.name ?? '')
      setContactPosition(draft.position ?? contact?.position ?? '')
      setContactPhone(draft.phone ?? contact?.phone ?? '')
      setContactEmail(draft.email ?? contact?.email ?? '')
      setContactComment(draft.comment ?? contact?.comment ?? '')
    } else {
      setContactName(contact?.name ?? '')
      setContactPosition(contact?.position ?? '')
      setContactPhone(contact?.phone ?? '')
      setContactEmail(contact?.email ?? '')
      setContactComment(contact?.comment ?? '')
    }
    setIsContactModalOpen(true)
  }

  async function saveContact() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const body = {
        name: contactName,
        position: contactPosition || null,
        phone: contactPhone || null,
        email: contactEmail || null,
        comment: contactComment || null,
      }

      const res = await fetch(
        editingContact ? `/api/contacts/${editingContact.id}` : `/api/contacts`,
        {
          method: editingContact ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingContact ? body : { customerId: id, ...body }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить контакт')
      contactDraft.clearDraft()
      setIsContactModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteContact(contactId: string) {
    if (!confirm('Удалить контакт?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/contacts/${contactId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось удалить контакт')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function openBankModal(item?: CustomerBankAccount) {
    setEditingBank(item ?? null)
    // Восстанавливаем данные из черновика или используем данные из БД/пустые значения
    const draft = bankDraft.loadDraft()
    if (draft) {
      setBik(draft.bik ?? item?.bik ?? '')
      setBankName(draft.bankName ?? item?.bankName ?? '')
      setBankAddress(draft.bankAddress ?? item?.bankAddress ?? '')
      setCorrAccount(draft.corrAccount ?? item?.corrAccount ?? '')
      setAccountNumber(draft.accountNumber ?? item?.accountNumber ?? '')
      setBankComment(draft.comment ?? item?.comment ?? '')
    } else {
      setBik(item?.bik ?? '')
      setBankName(item?.bankName ?? '')
      setBankAddress(item?.bankAddress ?? '')
      setCorrAccount(item?.corrAccount ?? '')
      setAccountNumber(item?.accountNumber ?? '')
      setBankComment(item?.comment ?? '')
    }
    setIsBankModalOpen(true)
  }

  async function saveBankAccount() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const body = {
        bik: bik || null,
        bankName: bankName || null,
        bankAddress: bankAddress || null,
        corrAccount: corrAccount || null,
        accountNumber: accountNumber || null,
        comment: bankComment || null,
      }

      const res = await fetch(
        editingBank
          ? `/api/customer-bank-accounts/${editingBank.id}`
          : `/api/customer-bank-accounts`,
        {
          method: editingBank ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingBank ? body : { customerId: id, ...body }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить реквизиты')
      bankDraft.clearDraft()
      setIsBankModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteBankAccount(bankId: string) {
    if (!confirm('Удалить реквизиты счета?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/customer-bank-accounts/${bankId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось удалить реквизиты')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function loadUsersIfNeeded() {
    if (users) return
    try {
      const res = await fetch('/api/users')
      const json = await res.json()
      if (!res.ok) {
        setUsers([])
        return
      }
      setUsers(
        (json as Array<{ id: string; name: string; role: string }>).map(u => ({
          id: u.id,
          name: u.name,
          role: u.role,
        }))
      )
    } catch {
      setUsers([])
    }
  }

  async function saveAccess() {
    if (!id) return
    setAccessSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/customers/${id}/access`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ responsibleUserIds }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить доступ')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setAccessSaving(false)
    }
  }

  async function loadEvents() {
    if (!id) return
    try {
      const res = await fetch(`/api/customers/${id}/events`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить события')
      setEvents(json as CustomerEvent[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function loadTasks() {
    if (!id) return
    try {
      const res = await fetch(`/api/customers/${id}/tasks`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить задачи')
      setTasks(json as CustomerTask[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function openVehicleModal(vehicle?: CustomerDetails['vehicles'][0] | null) {
    if (!data) return
    if (vehicle) {
      setLoading(true)
      try {
        const res = await fetch(`/api/vehicles/${vehicle.id}`)
        const json = await res.json()
        if (res.ok) {
          const v = json as {
            id: string
            govNumber: string
            vin: string | null
            brand: string | null
            model: string | null
            year: number | null
            color: string | null
            ptsNumber: string | null
            category: 'N1' | 'N2' | 'N3' | 'M1' | 'M2' | 'M3' | null
            ecoClass: string | null
            ownerInn: string | null
            ownerName: string | null
            ownerAddress: string | null
            mileage: number | null
            tireSize: string | null
          }
          setEditingVehicle({ id: v.id, govNumber: v.govNumber })
          setVehicleGovNumber(v.govNumber)
          setVehicleVin(v.vin ?? '')
          setVehicleBrand(v.brand ?? '')
          setVehicleModel(v.model ?? '')
          setVehicleYear(v.year?.toString() ?? '')
          setVehicleColor(v.color ?? '')
          setVehiclePtsNumber(v.ptsNumber ?? '')
          setVehicleCategory(v.category ?? '')
          setVehicleEcoClass(v.ecoClass ?? '')
          setVehicleOwnerInn(v.ownerInn ?? '')
          setVehicleOwnerName(v.ownerName ?? '')
          setVehicleOwnerAddress(v.ownerAddress ?? '')
          setVehicleMileage(v.mileage?.toString() ?? '')
          setVehicleTireSize(v.tireSize ?? '')
        }
      } catch {
        // Ignore
      } finally {
        setLoading(false)
      }
    } else {
      setEditingVehicle(null)
      setVehicleGovNumber('')
      setVehicleVin('')
      setVehicleBrand('')
      setVehicleModel('')
      setVehicleYear('')
      setVehicleColor('')
      setVehiclePtsNumber('')
      setVehicleCategory('')
      setVehicleEcoClass('')
      setVehicleOwnerInn('')
      setVehicleOwnerName('')
      setVehicleOwnerAddress('')
      setVehicleMileage('')
      setVehicleTireSize('')
    }
    setIsVehicleModalOpen(true)
  }

  async function saveVehicle() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const body = {
        govNumber: vehicleGovNumber || null,
        vin: vehicleVin || null,
        brand: vehicleBrand || null,
        model: vehicleModel || null,
        year: vehicleYear ? parseInt(vehicleYear, 10) : null,
        color: vehicleColor || null,
        ptsNumber: vehiclePtsNumber || null,
        category: vehicleCategory || null,
        ecoClass: vehicleEcoClass || null,
        ownerInn: vehicleOwnerInn || null,
        ownerName: vehicleOwnerName || null,
        ownerAddress: vehicleOwnerAddress || null,
        mileage: vehicleMileage ? parseInt(vehicleMileage, 10) : null,
        tireSize: vehicleTireSize || null,
        customerId: id,
      }

      const res = await fetch(
        editingVehicle ? `/api/vehicles/${editingVehicle.id}` : `/api/vehicles`,
        {
          method: editingVehicle ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить ТС')
      setIsVehicleModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function unbindVehicle(vehicleId: string) {
    if (!confirm('Отвязать ТС от клиента?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: null }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось отвязать ТС')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tab === 'access') loadUsersIfNeeded()
    if (tab === 'events' && events === null) loadEvents()
    if (tab === 'tasks' && tasks === null) loadTasks()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

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

  const typeLabel =
    data.type === 'COMPANY' ? 'Юрлицо' : data.type === 'SOLE_PROPRIETOR' ? 'ИП' : 'Физлицо'

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="../customers" className="hover:underline">
              Клиенты
            </Link>{' '}
            / {data.name}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{data.name}</h1>
          <p className="text-gray-600">
            {typeLabel} · ИНН: {data.inn ?? '—'}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Создано: {formatDateTime(data.businessCreatedAt ?? data.createdAt)} · Обновлено:{' '}
            {formatDateTime(data.businessUpdatedAt ?? data.updatedAt)}
          </p>
        </div>
        <div className="flex gap-2">
          <ContextNav
            backHref={`/crm/${tenantId}/customers`}
            upHref={`/crm/${tenantId}/customers`}
          />
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Обновить
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          variant={tab === 'details' ? 'gradient' : 'outline'}
          onClick={() => setTab('details')}
        >
          Реквизиты
        </Button>
        <Button
          variant={tab === 'contacts' ? 'gradient' : 'outline'}
          onClick={() => setTab('contacts')}
        >
          Контактные лица ({data.contacts.length})
        </Button>
        <Button variant={tab === 'bank' ? 'gradient' : 'outline'} onClick={() => setTab('bank')}>
          Счета ({data.bankAccounts.length})
        </Button>
        <Button
          variant={tab === 'vehicles' ? 'gradient' : 'outline'}
          onClick={() => setTab('vehicles')}
        >
          Транспорт ({data.vehicles.length})
        </Button>
        <Button
          variant={tab === 'access' ? 'gradient' : 'outline'}
          onClick={() => {
            setTab('access')
          }}
        >
          Доступ
        </Button>
        <Button
          variant={tab === 'events' ? 'gradient' : 'outline'}
          onClick={() => setTab('events')}
        >
          События
        </Button>
        <Button variant={tab === 'tasks' ? 'gradient' : 'outline'} onClick={() => setTab('tasks')}>
          Задачи
        </Button>
        <Button
          variant={tab === 'history' ? 'gradient' : 'outline'}
          onClick={() => setTab('history')}
        >
          История изменений
        </Button>
      </div>

      {tab === 'details' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={data.type === 'COMPANY' ? 'gradient' : 'outline'}
              onClick={() => saveCustomer({ type: 'COMPANY' as CustomerType })}
            >
              Юрлицо
            </Button>
            <Button
              variant={data.type === 'SOLE_PROPRIETOR' ? 'gradient' : 'outline'}
              onClick={() => saveCustomer({ type: 'SOLE_PROPRIETOR' as CustomerType })}
            >
              ИП
            </Button>
            <Button
              variant={data.type === 'INDIVIDUAL' ? 'gradient' : 'outline'}
              onClick={() => saveCustomer({ type: 'INDIVIDUAL' as CustomerType })}
            >
              Физлицо
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input
              label="Наименование"
              value={data.name}
              onChange={e => setData({ ...data, name: e.target.value })}
            />
            <Input
              label="Телефон"
              value={data.phone ?? ''}
              onChange={e => setData({ ...data, phone: e.target.value })}
            />
            <Input
              label="Эл. почта"
              value={data.email ?? ''}
              onChange={e => setData({ ...data, email: e.target.value })}
            />
            <Input
              label="Фактический адрес"
              value={data.address ?? ''}
              onChange={e => setData({ ...data, address: e.target.value })}
            />
            <Textarea
              label="Комментарий к адресу"
              value={data.addressComment ?? ''}
              onChange={e => setData({ ...data, addressComment: e.target.value })}
              rows={3}
              className="lg:col-span-2"
            />
            <Textarea
              label="Комментарий к клиенту"
              value={data.comment ?? ''}
              onChange={e => setData({ ...data, comment: e.target.value })}
              rows={4}
              className="lg:col-span-2"
            />
            <Input
              label="Дата/время создания (бизнес)"
              type="datetime-local"
              value={isoToLocalInput(data.businessCreatedAt)}
              onChange={e =>
                setData({ ...data, businessCreatedAt: localInputToIso(e.target.value) })
              }
            />
            <Input
              label="Дата/время изменения (бизнес)"
              type="datetime-local"
              value={isoToLocalInput(data.businessUpdatedAt)}
              onChange={e =>
                setData({ ...data, businessUpdatedAt: localInputToIso(e.target.value) })
              }
            />
          </div>

          <div className="border-t border-gray-100 pt-6">
            <div className="font-semibold text-gray-900 mb-3">Реквизиты</div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="ИНН"
                value={data.inn ?? ''}
                onChange={e => setData({ ...data, inn: e.target.value })}
              />
              <Input
                label="КПП"
                value={data.kpp ?? ''}
                onChange={e => setData({ ...data, kpp: e.target.value })}
              />
              <Input
                label="ОГРН"
                value={data.ogrn ?? ''}
                onChange={e => setData({ ...data, ogrn: e.target.value })}
              />
              <Input
                label="ОКПО"
                value={data.okpo ?? ''}
                onChange={e => setData({ ...data, okpo: e.target.value })}
              />
              <Input
                label="Полное наименование"
                value={data.fullName ?? ''}
                onChange={e => setData({ ...data, fullName: e.target.value })}
                className="lg:col-span-2"
              />
              <Textarea
                label="Юридический адрес"
                value={data.legalAddress ?? ''}
                onChange={e => setData({ ...data, legalAddress: e.target.value })}
                rows={3}
                className="lg:col-span-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => load()} disabled={loading}>
              Отменить
            </Button>
            <Button
              variant="gradient"
              onClick={() =>
                saveCustomer({
                  name: data.name,
                  phone: data.phone,
                  email: data.email,
                  address: data.address,
                  addressComment: data.addressComment,
                  comment: data.comment,
                  inn: data.inn,
                  kpp: data.kpp,
                  ogrn: data.ogrn,
                  okpo: data.okpo,
                  fullName: data.fullName,
                  legalAddress: data.legalAddress,
                  businessCreatedAt: data.businessCreatedAt,
                  businessUpdatedAt: data.businessUpdatedAt,
                })
              }
              isLoading={loading}
            >
              Сохранить
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'contacts' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="font-semibold text-gray-900">Контактные лица</div>
            <Button variant="gradient" onClick={() => openContactModal()} disabled={loading}>
              Добавить
            </Button>
          </div>

          {data.contacts.length === 0 ? (
            <div className="text-sm text-gray-500">Контактов пока нет</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">ФИО</th>
                  <th className="px-3 py-2 text-left">Должность</th>
                  <th className="px-3 py-2 text-left">Телефон</th>
                  <th className="px-3 py-2 text-left">Email</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map(c => (
                  <tr key={c.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{c.name}</td>
                    <td className="px-3 py-2">{c.position ?? '—'}</td>
                    <td className="px-3 py-2">{c.phone ?? '—'}</td>
                    <td className="px-3 py-2">{c.email ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openContactModal(c)}
                          disabled={loading}
                        >
                          Изм.
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteContact(c.id)}
                          disabled={loading}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal
            isOpen={isContactModalOpen}
            onClose={() => setIsContactModalOpen(false)}
            title={editingContact ? 'Редактировать контакт' : 'Добавить контакт'}
            size="lg"
          >
            <div className="space-y-4">
              <Input
                label="ФИО"
                value={contactName}
                onChange={e => setContactName(e.target.value)}
              />
              <Input
                label="Должность"
                value={contactPosition}
                onChange={e => setContactPosition(e.target.value)}
              />
              <Input
                label="Телефон"
                value={contactPhone}
                onChange={e => setContactPhone(e.target.value)}
              />
              <Input
                label="Эл. почта"
                value={contactEmail}
                onChange={e => setContactEmail(e.target.value)}
              />
              <Textarea
                label="Комментарий"
                value={contactComment}
                onChange={e => setContactComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsContactModalOpen(false)}
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button
                  variant="gradient"
                  onClick={saveContact}
                  isLoading={loading}
                  disabled={!contactName.trim()}
                >
                  Сохранить
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}

      {tab === 'bank' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="font-semibold text-gray-900">Реквизиты расчетных счетов</div>
            <Button variant="gradient" onClick={() => openBankModal()} disabled={loading}>
              Добавить
            </Button>
          </div>

          {data.bankAccounts.length === 0 ? (
            <div className="text-sm text-gray-500">Счетов пока нет</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">БИК</th>
                  <th className="px-3 py-2 text-left">Банк</th>
                  <th className="px-3 py-2 text-left">К/с</th>
                  <th className="px-3 py-2 text-left">Р/с</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.bankAccounts.map(b => (
                  <tr key={b.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{b.bik ?? '—'}</td>
                    <td className="px-3 py-2">{b.bankName ?? '—'}</td>
                    <td className="px-3 py-2">{b.corrAccount ?? '—'}</td>
                    <td className="px-3 py-2">{b.accountNumber ?? '—'}</td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openBankModal(b)}
                          disabled={loading}
                        >
                          Изм.
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteBankAccount(b.id)}
                          disabled={loading}
                        >
                          Удалить
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal
            isOpen={isBankModalOpen}
            onClose={() => setIsBankModalOpen(false)}
            title={editingBank ? 'Редактировать реквизиты' : 'Добавить реквизиты'}
            size="lg"
          >
            <div className="space-y-4">
              <Input label="БИК" value={bik} onChange={e => setBik(e.target.value)} />
              <Input
                label="Наименование банка"
                value={bankName}
                onChange={e => setBankName(e.target.value)}
              />
              <Textarea
                label="Адрес банка"
                value={bankAddress}
                onChange={e => setBankAddress(e.target.value)}
                rows={3}
              />
              <Input
                label="Корр. счет"
                value={corrAccount}
                onChange={e => setCorrAccount(e.target.value)}
              />
              <Input
                label="Расчетный счет"
                value={accountNumber}
                onChange={e => setAccountNumber(e.target.value)}
              />
              <Textarea
                label="Комментарий"
                value={bankComment}
                onChange={e => setBankComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsBankModalOpen(false)}
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button variant="gradient" onClick={saveBankAccount} isLoading={loading}>
                  Сохранить
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}

      {tab === 'vehicles' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex justify-between items-center gap-4">
            <div className="font-semibold text-gray-900">Транспортные средства</div>
            <Button variant="gradient" onClick={() => openVehicleModal()} disabled={loading}>
              Добавить ТС
            </Button>
          </div>

          {data.vehicles.length === 0 ? (
            <div className="text-sm text-gray-500">ТС пока нет</div>
          ) : null}

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Госномер</th>
                  <th className="px-3 py-2 text-left">VIN</th>
                  <th className="px-3 py-2 text-left">Марка/модель</th>
                  <th className="px-3 py-2 text-left">Год</th>
                  <th className="px-3 py-2 text-left">Категория</th>
                  <th className="px-3 py-2 text-left">Пробег</th>
                  <th className="px-3 py-2 text-left">Оборудование</th>
                  <th className="px-3 py-2 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {data.vehicles.map(v => (
                  <tr key={v.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium text-gray-900">
                      <Link href={`../vehicles/${v.id}`} className="hover:underline">
                        {v.govNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-gray-700">{v.vin ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {(v.brand ?? '') + ' ' + (v.model ?? '')}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{v.year ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">{v.category ?? '—'}</td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.mileage ? `${v.mileage.toLocaleString()} км` : '—'}
                    </td>
                    <td className="px-3 py-2 text-gray-700">
                      {v.tachographs
                        .map(t => t.serialNumber)
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVehicleModal(v)}
                          disabled={loading}
                        >
                          Изм.
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unbindVehicle(v.id)}
                          disabled={loading}
                        >
                          Отвязать
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Modal
            isOpen={isVehicleModalOpen}
            onClose={() => setIsVehicleModalOpen(false)}
            title={editingVehicle ? 'Редактировать ТС' : 'Добавить ТС'}
            size="lg"
          >
            <div className="space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Госномер"
                  value={vehicleGovNumber}
                  onChange={e => setVehicleGovNumber(e.target.value)}
                />
                <Input
                  label="VIN"
                  value={vehicleVin}
                  onChange={e => setVehicleVin(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Марка ТС"
                  value={vehicleBrand}
                  onChange={e => setVehicleBrand(e.target.value)}
                />
                <Input
                  label="Модель ТС"
                  value={vehicleModel}
                  onChange={e => setVehicleModel(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Год выпуска"
                  type="number"
                  value={vehicleYear}
                  onChange={e => setVehicleYear(e.target.value)}
                  placeholder="2020"
                />
                <Input
                  label="Цвет"
                  value={vehicleColor}
                  onChange={e => setVehicleColor(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Номер ПТС"
                  value={vehiclePtsNumber}
                  onChange={e => setVehiclePtsNumber(e.target.value)}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Категория ТС
                  </label>
                  <select
                    className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    value={vehicleCategory}
                    onChange={e => setVehicleCategory(e.target.value as typeof vehicleCategory)}
                  >
                    <option value="">—</option>
                    <option value="N1">N1</option>
                    <option value="N2">N2</option>
                    <option value="N3">N3</option>
                    <option value="M1">M1</option>
                    <option value="M2">M2</option>
                    <option value="M3">M3</option>
                  </select>
                </div>
              </div>
              <Input
                label="Экологический класс"
                value={vehicleEcoClass}
                onChange={e => setVehicleEcoClass(e.target.value)}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="ИНН собственника"
                  value={vehicleOwnerInn}
                  onChange={e => setVehicleOwnerInn(e.target.value)}
                />
                <Input
                  label="Собственник ТС"
                  value={vehicleOwnerName}
                  onChange={e => setVehicleOwnerName(e.target.value)}
                />
              </div>
              <Textarea
                label="Адрес собственника ТС"
                value={vehicleOwnerAddress}
                onChange={e => setVehicleOwnerAddress(e.target.value)}
                rows={2}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input
                  label="Актуальный пробег"
                  type="number"
                  value={vehicleMileage}
                  onChange={e => setVehicleMileage(e.target.value)}
                  placeholder="0"
                />
                <Input
                  label="Размерность резины"
                  value={vehicleTireSize}
                  onChange={e => setVehicleTireSize(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setIsVehicleModalOpen(false)}
                  disabled={loading}
                >
                  Отмена
                </Button>
                <Button variant="gradient" onClick={saveVehicle} isLoading={loading}>
                  Сохранить
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      ) : null}

      {tab === 'access' && canShowAccessTab ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="font-semibold text-gray-900">Доступ</div>
          <div className="text-sm text-gray-700">
            <div>
              <span className="text-gray-500">Владелец:</span> {data.createdBy?.name ?? '—'}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="font-medium text-gray-900 mb-2">Ответственные</div>
            {users === null ? (
              <div className="text-sm text-gray-500">Загрузка списка сотрудников...</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-gray-500">
                Нет доступа к списку пользователей (нужна роль TENANT_ADMIN или DIRECTOR)
              </div>
            ) : (
              <div className="space-y-2">
                {users.map(u => {
                  const checked = responsibleUserIds.includes(u.id)
                  return (
                    <label key={u.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={e => {
                          if (e.target.checked) setResponsibleUserIds([...responsibleUserIds, u.id])
                          else setResponsibleUserIds(responsibleUserIds.filter(x => x !== u.id))
                        }}
                      />
                      <span className="font-medium">{u.name}</span>
                      <span className="text-xs text-gray-500">{u.role}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => load()} disabled={accessSaving}>
              Отменить
            </Button>
            <Button
              variant="gradient"
              onClick={saveAccess}
              isLoading={accessSaving}
              disabled={users !== null && users.length === 0}
            >
              Сохранить доступ
            </Button>
          </div>
        </div>
      ) : null}

      {tab === 'events' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-gray-900">События</div>
            <Button variant="outline" size="sm" onClick={loadEvents} disabled={loading}>
              Обновить
            </Button>
          </div>
          {events === null ? (
            <div className="text-sm text-gray-500">Загрузка...</div>
          ) : events.length === 0 ? (
            <div className="text-sm text-gray-500">Событий пока нет</div>
          ) : (
            <div className="space-y-2 text-sm">
              {events.map(e => (
                <div
                  key={`${e.kind}-${e.id}`}
                  className="flex items-center justify-between border-t border-gray-100 pt-2"
                >
                  <div>
                    <div className="font-medium text-gray-900">
                      {e.kind === 'ORDER' ? (
                        <Link className="hover:underline" href={`../orders/${e.id}`}>
                          Сделка {e.title}
                        </Link>
                      ) : e.kind === 'INVOICE' ? (
                        <Link className="hover:underline" href={`../invoices/${e.id}`}>
                          Счет {e.title}
                        </Link>
                      ) : (
                        <a
                          className="hover:underline"
                          href={e.kind === 'DOCUMENT' && 'fileUrl' in e ? e.fileUrl : '#'}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Документ {e.title}
                        </a>
                      )}
                    </div>
                    {'status' in e ? <div className="text-xs text-gray-500">{e.status}</div> : null}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(e.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-gray-900">Задачи клиента</div>
            <div className="flex gap-2">
              <Link href={`/crm/${tenantId}/tasks`}>
                <Button variant="outline" size="sm">
                  Все задачи
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={loadTasks} disabled={loading}>
                Обновить
              </Button>
            </div>
          </div>
          {tasks === null ? (
            <div className="text-sm text-gray-500">Загрузка...</div>
          ) : tasks.length === 0 ? (
            <div className="text-sm text-gray-500">Задач пока нет</div>
          ) : (
            <div className="space-y-2 text-sm">
              {tasks.map(t => (
                <div
                  key={t.id}
                  className="flex items-center justify-between border-t border-gray-100 pt-2"
                >
                  <div>
                    <div className="font-medium text-gray-900">{t.title}</div>
                    <div className="text-xs text-gray-500">{t.status}</div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(t.createdAt).toLocaleString('ru-RU')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {tab === 'history' ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900 mb-4">История изменений</div>
          <AuditHistory tenantId={tenantId} entityType="customer" entityId={id} />
        </div>
      ) : null}
    </div>
  )
}
