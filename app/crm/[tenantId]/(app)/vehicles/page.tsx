'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { formatDateTime, isoToLocalInput, localInputToIso, pickBusinessDate } from '@/lib/datetime'

type VehicleCategory = 'N1' | 'N2' | 'N3' | 'M1' | 'M2' | 'M3'

type Vehicle = {
  id: string
  govNumber: string
  vin: string | null
  brand: string | null
  model: string | null
  year: number | null
  color: string | null
  ptsNumber: string | null
  category: VehicleCategory | null
  ecoClass: string | null
  ownerInn: string | null
  ownerName: string | null
  ownerAddress: string | null
  mileage: number | null
  tireSize: string | null
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
  customer?: { id: string; name: string } | null
  tachographs?: Array<{ id: string; serialNumber: string | null; model: string | null }>
}

export default function VehiclesPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params?.tenantId
  const [items, setItems] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null)
  const [govNumber, setGovNumber] = useState('')
  const [vin, setVin] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [color, setColor] = useState('')
  const [ptsNumber, setPtsNumber] = useState('')
  const [category, setCategory] = useState<VehicleCategory | ''>('')
  const [ecoClass, setEcoClass] = useState('')
  const [ownerInn, setOwnerInn] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [mileage, setMileage] = useState('')
  const [tireSize, setTireSize] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [businessCreatedAtLocal, setBusinessCreatedAtLocal] = useState('')
  const [businessUpdatedAtLocal, setBusinessUpdatedAtLocal] = useState('')
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])

  // Временное сохранение данных формы создания ТС
  const vehicleFormData = {
    govNumber,
    vin,
    brand,
    model,
    year,
    color,
    ptsNumber,
    category,
    ecoClass,
    ownerInn,
    ownerName,
    ownerAddress,
    mileage,
    tireSize,
    customerId,
    businessCreatedAtLocal,
    businessUpdatedAtLocal,
  }
  const vehicleDraft = useFormDraft({ key: 'vehicle-new', enabled: isModalOpen }, vehicleFormData, [
    isModalOpen,
  ])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/vehicles')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить ТС')
      setItems(data as Vehicle[])
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
    return items.filter(v => {
      return (
        v.govNumber.toLowerCase().includes(needle) ||
        (v.vin ?? '').toLowerCase().includes(needle) ||
        (v.brand ?? '').toLowerCase().includes(needle) ||
        (v.model ?? '').toLowerCase().includes(needle) ||
        (v.ownerInn ?? '').toLowerCase().includes(needle) ||
        (v.ownerName ?? '').toLowerCase().includes(needle) ||
        (v.customer?.name ?? '').toLowerCase().includes(needle) ||
        (v.tachographs ?? []).some(t => (t.serialNumber ?? '').toLowerCase().includes(needle))
      )
    })
  }, [items, q])

  async function loadCustomers() {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(
          (data as Array<{ id: string; name: string }>).map(c => ({ id: c.id, name: c.name }))
        )
      }
    } catch {
      // Ignore
    }
  }

  function openCreate(vehicle?: Vehicle) {
    // Восстанавливаем данные из черновика или используем данные из БД/пустые значения
    const draft = vehicleDraft.loadDraft()

    if (vehicle) {
      setEditingVehicle(vehicle)
      if (draft) {
        setGovNumber(draft.govNumber ?? vehicle.govNumber)
        setVin(draft.vin ?? vehicle.vin ?? '')
        setBrand(draft.brand ?? vehicle.brand ?? '')
        setModel(draft.model ?? vehicle.model ?? '')
        setYear(draft.year?.toString() ?? vehicle.year?.toString() ?? '')
        setColor(draft.color ?? vehicle.color ?? '')
        setPtsNumber(draft.ptsNumber ?? vehicle.ptsNumber ?? '')
        setCategory((draft.category as typeof category) ?? vehicle.category ?? '')
        setEcoClass(draft.ecoClass ?? vehicle.ecoClass ?? '')
        setOwnerInn(draft.ownerInn ?? vehicle.ownerInn ?? '')
        setOwnerName(draft.ownerName ?? vehicle.ownerName ?? '')
        setOwnerAddress(draft.ownerAddress ?? vehicle.ownerAddress ?? '')
        setMileage(draft.mileage?.toString() ?? vehicle.mileage?.toString() ?? '')
        setTireSize(draft.tireSize ?? vehicle.tireSize ?? '')
        setCustomerId(draft.customerId ?? vehicle.customer?.id ?? '')
        setBusinessCreatedAtLocal(
          draft.businessCreatedAtLocal ?? isoToLocalInput(vehicle.businessCreatedAt)
        )
        setBusinessUpdatedAtLocal(
          draft.businessUpdatedAtLocal ?? isoToLocalInput(vehicle.businessUpdatedAt)
        )
      } else {
        setGovNumber(vehicle.govNumber)
        setVin(vehicle.vin ?? '')
        setBrand(vehicle.brand ?? '')
        setModel(vehicle.model ?? '')
        setYear(vehicle.year?.toString() ?? '')
        setColor(vehicle.color ?? '')
        setPtsNumber(vehicle.ptsNumber ?? '')
        setCategory(vehicle.category ?? '')
        setEcoClass(vehicle.ecoClass ?? '')
        setOwnerInn(vehicle.ownerInn ?? '')
        setOwnerName(vehicle.ownerName ?? '')
        setOwnerAddress(vehicle.ownerAddress ?? '')
        setMileage(vehicle.mileage?.toString() ?? '')
        setTireSize(vehicle.tireSize ?? '')
        setCustomerId(vehicle.customer?.id ?? '')
        setBusinessCreatedAtLocal(isoToLocalInput(vehicle.businessCreatedAt))
        setBusinessUpdatedAtLocal(isoToLocalInput(vehicle.businessUpdatedAt))
      }
    } else {
      setEditingVehicle(null)
      if (draft) {
        setGovNumber(draft.govNumber ?? '')
        setVin(draft.vin ?? '')
        setBrand(draft.brand ?? '')
        setModel(draft.model ?? '')
        setYear(draft.year?.toString() ?? '')
        setColor(draft.color ?? '')
        setPtsNumber(draft.ptsNumber ?? '')
        setCategory((draft.category as typeof category) ?? '')
        setEcoClass(draft.ecoClass ?? '')
        setOwnerInn(draft.ownerInn ?? '')
        setOwnerName(draft.ownerName ?? '')
        setOwnerAddress(draft.ownerAddress ?? '')
        setMileage(draft.mileage?.toString() ?? '')
        setTireSize(draft.tireSize ?? '')
        setCustomerId(draft.customerId ?? '')
        setBusinessCreatedAtLocal(draft.businessCreatedAtLocal ?? '')
        setBusinessUpdatedAtLocal(draft.businessUpdatedAtLocal ?? '')
      } else {
        setGovNumber('')
        setVin('')
        setBrand('')
        setModel('')
        setYear('')
        setColor('')
        setPtsNumber('')
        setCategory('')
        setEcoClass('')
        setOwnerInn('')
        setOwnerName('')
        setOwnerAddress('')
        setMileage('')
        setTireSize('')
        setCustomerId('')
        setBusinessCreatedAtLocal('')
        setBusinessUpdatedAtLocal('')
      }
    }
    loadCustomers()
    setIsModalOpen(true)
  }

  async function saveVehicle() {
    setLoading(true)
    setError('')
    try {
      const body = {
        govNumber: govNumber || null,
        vin: vin || null,
        brand: brand || null,
        model: model || null,
        year: year ? parseInt(year, 10) : null,
        color: color || null,
        ptsNumber: ptsNumber || null,
        category: category || null,
        ecoClass: ecoClass || null,
        ownerInn: ownerInn || null,
        ownerName: ownerName || null,
        ownerAddress: ownerAddress || null,
        mileage: mileage ? parseInt(mileage, 10) : null,
        tireSize: tireSize || null,
        customerId: customerId || null,
        businessCreatedAt: localInputToIso(businessCreatedAtLocal),
        businessUpdatedAt: localInputToIso(businessUpdatedAtLocal),
      }

      const res = await fetch(
        editingVehicle ? `/api/vehicles/${editingVehicle.id}` : '/api/vehicles',
        {
          method: editingVehicle ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const data = await res.json()
      if (!res.ok)
        throw new Error(data?.error || `Не удалось ${editingVehicle ? 'сохранить' : 'создать'} ТС`)
      vehicleDraft.clearDraft()
      setIsModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteVehicle(vehicleId: string) {
    if (!confirm('Удалить ТС?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/vehicles/${vehicleId}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось удалить ТС')
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
          <h1 className="text-3xl font-bold text-gray-900">Транспорт</h1>
          <p className="text-gray-600">ТС, привязка к клиентам и оборудованию</p>
        </div>
        <Button variant="gradient" onClick={() => openCreate()} disabled={loading}>
          Добавить ТС
        </Button>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Госномер, VIN, марка/модель, ИНН/собственник, серийник"
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
              <th className="px-4 py-3 text-left">Госномер</th>
              <th className="px-4 py-3 text-left">VIN</th>
              <th className="px-4 py-3 text-left">Марка/модель</th>
              <th className="px-4 py-3 text-left">Клиент/собственник</th>
              <th className="px-4 py-3 text-left">Оборудование</th>
              <th className="px-4 py-3 text-left">Дата/время</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(v => (
              <tr key={v.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">
                  <Link className="hover:underline" href={`./vehicles/${v.id}`}>
                    {v.govNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-gray-700">{v.vin ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">
                  {(v.brand ?? '') + ' ' + (v.model ?? '')}
                </td>
                <td className="px-4 py-3 text-gray-700">
                  <div>{v.customer?.name ?? v.ownerName ?? '—'}</div>
                  <div className="text-xs text-gray-500">{v.ownerInn ?? ''}</div>
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {(v.tachographs ?? []).length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {(v.tachographs ?? []).map(t =>
                        t.serialNumber ? (
                          <Link
                            key={t.id}
                            href={`/crm/${tenantId}/equipment/${t.id}`}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {t.serialNumber}
                          </Link>
                        ) : null
                      )}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>
                    Создано: {formatDateTime(pickBusinessDate(v.businessCreatedAt, v.createdAt))}
                  </div>
                  <div>
                    Обновлено: {formatDateTime(pickBusinessDate(v.businessUpdatedAt, v.updatedAt))}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openCreate(v)}
                      disabled={loading}
                    >
                      Изм.
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteVehicle(v.id)}
                      disabled={loading}
                    >
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={7}>
                  {loading ? 'Загрузка...' : 'ТС пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingVehicle ? 'Редактировать ТС' : 'Добавить ТС'}
        size="lg"
      >
        <div className="space-y-4 max-h-[80vh] overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Госномер"
              value={govNumber}
              onChange={e => setGovNumber(e.target.value)}
            />
            <Input label="VIN" value={vin} onChange={e => setVin(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="Марка ТС" value={brand} onChange={e => setBrand(e.target.value)} />
            <Input label="Модель ТС" value={model} onChange={e => setModel(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Год выпуска"
              type="number"
              value={year}
              onChange={e => setYear(e.target.value)}
              placeholder="2020"
            />
            <Input label="Цвет" value={color} onChange={e => setColor(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Номер ПТС"
              value={ptsNumber}
              onChange={e => setPtsNumber(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Категория ТС</label>
              <select
                className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                value={category}
                onChange={e => setCategory(e.target.value as VehicleCategory | '')}
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
            value={ecoClass}
            onChange={e => setEcoClass(e.target.value)}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="ИНН собственника"
              value={ownerInn}
              onChange={e => setOwnerInn(e.target.value)}
            />
            <Input
              label="Собственник ТС"
              value={ownerName}
              onChange={e => setOwnerName(e.target.value)}
            />
          </div>
          <Textarea
            label="Адрес собственника ТС"
            value={ownerAddress}
            onChange={e => setOwnerAddress(e.target.value)}
            rows={2}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Актуальный пробег"
              type="number"
              value={mileage}
              onChange={e => setMileage(e.target.value)}
              placeholder="0"
            />
            <Input
              label="Размерность резины"
              value={tireSize}
              onChange={e => setTireSize(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Клиент (опционально)
            </label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
            >
              <option value="">— Не привязано</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={saveVehicle} isLoading={loading}>
              {editingVehicle ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
