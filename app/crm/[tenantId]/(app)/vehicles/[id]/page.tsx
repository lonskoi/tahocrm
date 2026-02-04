'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { AuditHistory } from '@/components/audit/audit-history'
import { ContextNav } from '@/components/nav/context-nav'
import { OpenRelatedLink } from '@/components/nav/open-related-link'

type VehicleDetails = {
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
  notes: string | null
  customer: { id: string; name: string } | null
  tachographs: Array<{
    id: string
    type: 'TACHOGRAPH' | 'GLONASS' | 'OTHER'
    brand: string | null
    model: string | null
    serialNumber: string | null
    comment: string | null
    w: string | null
    k: string | null
    l: string | null
    workDate: string | null
    tireSize: string | null
    customer?: { id: string; name: string } | null
    skzi?: { id: string; serialNumber: string | null; expiryDate: string | null } | null
  }>
  orders: Array<{ id: string; number: string; status: string }>
  documents: Array<{ id: string; type: string; fileName: string; fileUrl: string }>
  currentW: string | null
  currentK: string | null
  currentL: string | null
  lastCalibrationDate: string | null
}

export default function VehicleDetailsPage() {
  const params = useParams<{ tenantId: string; id: string }>()
  const router = useRouter()
  const id = params?.id
  const tenantId = params?.tenantId

  const [data, setData] = useState<VehicleDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  const [govNumber, setGovNumber] = useState('')
  const [vin, setVin] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [year, setYear] = useState('')
  const [color, setColor] = useState('')
  const [ptsNumber, setPtsNumber] = useState('')
  const [category, setCategory] = useState<'N1' | 'N2' | 'N3' | 'M1' | 'M2' | 'M3' | ''>('')
  const [ecoClass, setEcoClass] = useState('')
  const [ownerInn, setOwnerInn] = useState('')
  const [ownerName, setOwnerName] = useState('')
  const [ownerAddress, setOwnerAddress] = useState('')
  const [mileage, setMileage] = useState('')
  const [tireSize, setTireSize] = useState('')
  const [notes, setNotes] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])

  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<VehicleDetails['tachographs'][0] | null>(
    null
  )
  const [equipmentType, setEquipmentType] = useState<'TACHOGRAPH' | 'GLONASS' | 'OTHER'>(
    'TACHOGRAPH'
  )
  const [equipmentBrand, setEquipmentBrand] = useState('')
  const [equipmentModel, setEquipmentModel] = useState('')
  const [equipmentSerialNumber, setEquipmentSerialNumber] = useState('')
  const [equipmentComment, setEquipmentComment] = useState('')
  const [equipmentCustomerId, setEquipmentCustomerId] = useState('')
  const [equipmentSkziId, setEquipmentSkziId] = useState('')
  const [equipmentSkziSerialNumber, setEquipmentSkziSerialNumber] = useState('')
  const [equipmentW, setEquipmentW] = useState('')
  const [equipmentK, setEquipmentK] = useState('')
  const [equipmentL, setEquipmentL] = useState('')
  const [equipmentWorkDate, setEquipmentWorkDate] = useState('')
  const [equipmentTireSize, setEquipmentTireSize] = useState('')
  const [skziBlocks, setSkziBlocks] = useState<
    Array<{ id: string; serialNumber: string | null; expiryDate: string | null }>
  >([])

  // Временное сохранение данных формы редактирования ТС
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
    notes,
    customerId,
  }
  const vehicleDraft = useFormDraft(
    { key: `vehicle-edit-${id || 'new'}`, enabled: isEditModalOpen },
    vehicleFormData,
    [isEditModalOpen]
  )

  // Временное сохранение данных формы тахографа
  const equipmentFormData = {
    type: equipmentType,
    brand: equipmentBrand,
    model: equipmentModel,
    serialNumber: equipmentSerialNumber,
    comment: equipmentComment,
    customerId: equipmentCustomerId,
    skziId: equipmentSkziId,
    skziSerialNumber: equipmentSkziSerialNumber,
    w: equipmentW,
    k: equipmentK,
    l: equipmentL,
    workDate: equipmentWorkDate,
    tireSize: equipmentTireSize,
  }
  const equipmentDraft = useFormDraft(
    {
      key: `equipment-${id || 'new'}-${editingEquipment?.id || 'new'}`,
      enabled: isEquipmentModalOpen,
    },
    equipmentFormData,
    [isEquipmentModalOpen, editingEquipment?.id]
  )

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/vehicles/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить ТС')
      setData(json as VehicleDetails)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function loadCustomers() {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const json = await res.json()
        setCustomers(
          (json as Array<{ id: string; name: string }>).map(c => ({ id: c.id, name: c.name }))
        )
      }
    } catch {
      // Ignore
    }
  }

  async function loadSkziBlocks() {
    try {
      const res = await fetch('/api/skzi')
      if (res.ok) {
        const json = await res.json()
        setSkziBlocks(
          json as Array<{ id: string; serialNumber: string | null; expiryDate: string | null }>
        )
      }
    } catch {
      // Ignore
    }
  }

  function openEditModal() {
    if (!data) return
    // Восстанавливаем данные из черновика или используем данные из БД
    const draft = vehicleDraft.loadDraft()
    if (draft) {
      setGovNumber(draft.govNumber ?? data.govNumber)
      setVin(draft.vin ?? data.vin ?? '')
      setBrand(draft.brand ?? data.brand ?? '')
      setModel(draft.model ?? data.model ?? '')
      setYear(draft.year?.toString() ?? data.year?.toString() ?? '')
      setColor(draft.color ?? data.color ?? '')
      setPtsNumber(draft.ptsNumber ?? data.ptsNumber ?? '')
      setCategory((draft.category as typeof category) ?? data.category ?? '')
      setEcoClass(draft.ecoClass ?? data.ecoClass ?? '')
      setOwnerInn(draft.ownerInn ?? data.ownerInn ?? '')
      setOwnerName(draft.ownerName ?? data.ownerName ?? '')
      setOwnerAddress(draft.ownerAddress ?? data.ownerAddress ?? '')
      setMileage(draft.mileage?.toString() ?? data.mileage?.toString() ?? '')
      setTireSize(draft.tireSize ?? data.tireSize ?? '')
      setNotes(draft.notes ?? data.notes ?? '')
      setCustomerId(draft.customerId ?? data.customer?.id ?? '')
    } else {
      setGovNumber(data.govNumber)
      setVin(data.vin ?? '')
      setBrand(data.brand ?? '')
      setModel(data.model ?? '')
      setYear(data.year?.toString() ?? '')
      setColor(data.color ?? '')
      setPtsNumber(data.ptsNumber ?? '')
      setCategory(data.category ?? '')
      setEcoClass(data.ecoClass ?? '')
      setOwnerInn(data.ownerInn ?? '')
      setOwnerName(data.ownerName ?? '')
      setOwnerAddress(data.ownerAddress ?? '')
      setMileage(data.mileage?.toString() ?? '')
      setTireSize(data.tireSize ?? '')
      setNotes(data.notes ?? '')
      setCustomerId(data.customer?.id ?? '')
    }
    loadCustomers()
    setIsEditModalOpen(true)
  }

  async function saveVehicle() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/vehicles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
          notes: notes || null,
          customerId: customerId || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить ТС')
      vehicleDraft.clearDraft()
      setIsEditModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteVehicle() {
    if (!id) return
    if (!confirm('Удалить ТС?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/vehicles/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось удалить ТС')
      router.push('../vehicles')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  function openEquipmentModal(equipment?: VehicleDetails['tachographs'][0] | null) {
    if (!data) return
    // Восстанавливаем данные из черновика или используем данные из БД/пустые значения
    const draft = equipmentDraft.loadDraft()

    if (equipment) {
      setEditingEquipment(equipment)
      if (draft) {
        setEquipmentType((draft.type as typeof equipmentType) ?? equipment.type)
        setEquipmentBrand(draft.brand ?? equipment.brand ?? '')
        setEquipmentModel(draft.model ?? equipment.model ?? '')
        setEquipmentSerialNumber(draft.serialNumber ?? equipment.serialNumber ?? '')
        setEquipmentComment(draft.comment ?? equipment.comment ?? '')
        setEquipmentCustomerId(draft.customerId ?? equipment.customer?.id ?? '')
        setEquipmentSkziId(draft.skziId ?? equipment.skzi?.id ?? '')
        setEquipmentSkziSerialNumber(draft.skziSerialNumber ?? equipment.skzi?.serialNumber ?? '')
        setEquipmentW(draft.w ?? (equipment as any).w ?? '')
        setEquipmentK(draft.k ?? (equipment as any).k ?? '')
        setEquipmentL(draft.l ?? (equipment as any).l ?? '')
        setEquipmentWorkDate(
          draft.workDate ??
            ((equipment as any).workDate
              ? (new Date((equipment as any).workDate).toISOString().split('T')[0] ?? '')
              : '')
        )
        setEquipmentTireSize(draft.tireSize ?? (equipment as any).tireSize ?? '')
      } else {
        setEquipmentType(equipment.type)
        setEquipmentBrand(equipment.brand ?? '')
        setEquipmentModel(equipment.model ?? '')
        setEquipmentSerialNumber(equipment.serialNumber ?? '')
        setEquipmentComment(equipment.comment ?? '')
        setEquipmentCustomerId(equipment.customer?.id ?? '')
        setEquipmentSkziId(equipment.skzi?.id ?? '')
        setEquipmentSkziSerialNumber(equipment.skzi?.serialNumber ?? '')
        setEquipmentW((equipment as any).w ?? '')
        setEquipmentK((equipment as any).k ?? '')
        setEquipmentL((equipment as any).l ?? '')
        setEquipmentWorkDate(
          (equipment as any).workDate
            ? (new Date((equipment as any).workDate).toISOString().split('T')[0] ?? '')
            : ''
        )
        setEquipmentTireSize((equipment as any).tireSize ?? '')
      }
    } else {
      setEditingEquipment(null)
      if (draft) {
        setEquipmentType((draft.type as typeof equipmentType) ?? 'TACHOGRAPH')
        setEquipmentBrand(draft.brand ?? '')
        setEquipmentModel(draft.model ?? '')
        setEquipmentSerialNumber(draft.serialNumber ?? '')
        setEquipmentComment(draft.comment ?? '')
        setEquipmentCustomerId(draft.customerId ?? data.customer?.id ?? '')
        setEquipmentSkziId(draft.skziId ?? '')
        setEquipmentSkziSerialNumber(draft.skziSerialNumber ?? '')
        setEquipmentW(draft.w ?? '')
        setEquipmentK(draft.k ?? '')
        setEquipmentL(draft.l ?? '')
        setEquipmentWorkDate(draft.workDate ?? '')
        setEquipmentTireSize(draft.tireSize ?? '')
      } else {
        setEquipmentType('TACHOGRAPH')
        setEquipmentBrand('')
        setEquipmentModel('')
        setEquipmentSerialNumber('')
        setEquipmentComment('')
        setEquipmentCustomerId(data.customer?.id ?? '')
        setEquipmentSkziId('')
        setEquipmentSkziSerialNumber('')
        setEquipmentW('')
        setEquipmentK('')
        setEquipmentL('')
        setEquipmentWorkDate('')
        setEquipmentTireSize('')
      }
    }
    loadCustomers()
    loadSkziBlocks()
    setIsEquipmentModalOpen(true)
  }

  async function saveEquipment() {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      // Определяем, отправлять ли skziSerialNumber или skziId
      let skziIdToSend: string | null | undefined = undefined
      let skziSerialNumberToSend: string | null | undefined = undefined

      if (equipmentSkziSerialNumber && equipmentSkziSerialNumber.trim() !== '') {
        // Проверяем, есть ли такой номер в списке существующих блоков
        const existingSkzi = skziBlocks.find(
          s =>
            s.serialNumber &&
            s.serialNumber.toLowerCase() === equipmentSkziSerialNumber.trim().toLowerCase()
        )
        if (existingSkzi) {
          // Используем существующий блок
          skziIdToSend = existingSkzi.id
        } else {
          // Новый номер - отправляем для создания
          skziSerialNumberToSend = equipmentSkziSerialNumber.trim()
        }
      } else if (equipmentSkziId) {
        // Выбран существующий блок по ID
        skziIdToSend = equipmentSkziId
      } else {
        // Явное удаление привязки
        skziSerialNumberToSend = null
      }

      const body: any = {
        type: equipmentType,
        brand: equipmentBrand || null,
        model: equipmentModel || null,
        serialNumber: equipmentSerialNumber || null,
        comment: equipmentComment || null,
        vehicleId: id,
        customerId: equipmentCustomerId || null,
        w: equipmentW || null,
        k: equipmentK || null,
        l: equipmentL || null,
        workDate: equipmentWorkDate || null,
        tireSize: equipmentTireSize || null,
      }

      if (skziIdToSend !== undefined) {
        body.skziId = skziIdToSend
      }
      if (skziSerialNumberToSend !== undefined) {
        body.skziSerialNumber = skziSerialNumberToSend
      }

      const res = await fetch(
        editingEquipment ? `/api/tachographs/${editingEquipment.id}` : '/api/tachographs',
        {
          method: editingEquipment ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      )
      const json = await res.json()
      if (!res.ok)
        throw new Error(
          json?.error || `Не удалось ${editingEquipment ? 'сохранить' : 'создать'} оборудование`
        )
      equipmentDraft.clearDraft()
      setIsEquipmentModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteEquipment(equipmentId: string) {
    if (!confirm('Удалить оборудование?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tachographs/${equipmentId}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось удалить оборудование')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

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

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm text-gray-500">
            <Link href="../vehicles" className="hover:underline">
              Транспорт
            </Link>{' '}
            / {data.govNumber}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{data.govNumber}</h1>
          <p className="text-gray-600">
            VIN: {data.vin ?? '—'} · {(data.brand ?? '') + ' ' + (data.model ?? '')}
          </p>
        </div>
        <div className="flex gap-2">
          <ContextNav
            backHref={`/crm/${tenantId}/vehicles`}
            upHref={
              customerId || data.customer?.id
                ? `/crm/${tenantId}/customers/${customerId || data.customer?.id}`
                : `/crm/${tenantId}/vehicles`
            }
          />
          <Button variant="outline" onClick={() => load()} disabled={loading}>
            Обновить
          </Button>
          <Button variant="outline" onClick={openEditModal} disabled={loading}>
            Редактировать
          </Button>
          <Button variant="destructive" onClick={deleteVehicle} disabled={loading}>
            Удалить
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900 mb-3">Основные данные</div>
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="text-gray-500">Госномер:</span> {data.govNumber}
            </div>
            <div>
              <span className="text-gray-500">VIN:</span> {data.vin ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Марка/модель:</span>{' '}
              {(data.brand ?? '') + ' ' + (data.model ?? '')}
            </div>
            <div>
              <span className="text-gray-500">Год выпуска:</span> {data.year ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Цвет:</span> {data.color ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Номер ПТС:</span> {data.ptsNumber ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Категория:</span> {data.category ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Экокласс:</span> {data.ecoClass ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Пробег:</span>{' '}
              {data.mileage ? `${data.mileage.toLocaleString()} км` : '—'}
            </div>
            <div>
              <span className="text-gray-500">Резина:</span> {data.tireSize ?? '—'}
            </div>
            {data.notes ? (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="text-gray-500 mb-1">Комментарий:</div>
                <div className="text-gray-700 whitespace-pre-wrap">{data.notes}</div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900 mb-3">Собственник</div>
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <span className="text-gray-500">Клиент:</span>{' '}
              {data.customer ? (
                <Link
                  href={`../customers/${data.customer.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {data.customer.name}
                </Link>
              ) : (
                '—'
              )}
            </div>
            <div>
              <span className="text-gray-500">Собственник:</span> {data.ownerName ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">ИНН:</span> {data.ownerInn ?? '—'}
            </div>
            <div>
              <span className="text-gray-500">Адрес:</span> {data.ownerAddress ?? '—'}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="flex justify-between items-center mb-3">
            <div className="font-semibold text-gray-900">Оборудование</div>
            <Button
              variant="gradient"
              size="sm"
              onClick={() => openEquipmentModal()}
              disabled={loading}
            >
              Добавить
            </Button>
          </div>
          <div className="space-y-3 text-sm">
            {data.tachographs.map(t => {
              const typeLabel =
                t.type === 'TACHOGRAPH' ? 'Тахограф' : t.type === 'GLONASS' ? 'Глонасс' : 'Другое'
              return (
                <div
                  key={t.id}
                  className="border-t border-gray-100 pt-3 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/crm/${tenantId}/equipment/${t.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                        >
                          {typeLabel}
                        </Link>
                        {t.brand ? <span className="text-gray-600">· {t.brand}</span> : null}
                        {t.model ? <span className="text-gray-600">· {t.model}</span> : null}
                      </div>
                      {t.serialNumber ? (
                        <div className="text-gray-700 mt-1">
                          Серийный номер:{' '}
                          <Link
                            href={`/crm/${tenantId}/equipment/${t.id}`}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {t.serialNumber}
                          </Link>
                        </div>
                      ) : null}
                      {t.skzi ? (
                        <div className="text-xs text-gray-600 mt-1">
                          СКЗИ: {t.skzi.serialNumber ?? '—'}
                          {t.skzi.expiryDate ? (
                            <span className="ml-2">
                              (до {new Date(t.skzi.expiryDate).toLocaleDateString('ru-RU')})
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      {t.w || t.k || t.l ? (
                        <div className="text-xs text-gray-600 mt-1">
                          Коэффициенты: W={t.w ?? '—'}, K={t.k ?? '—'}, L={t.l ?? '—'}
                        </div>
                      ) : null}
                      {t.workDate ? (
                        <div className="text-xs text-gray-600 mt-1">
                          Дата выполнения работ: {new Date(t.workDate).toLocaleDateString('ru-RU')}
                        </div>
                      ) : null}
                      {t.tireSize ? (
                        <div className="text-xs text-gray-600 mt-1">
                          Размерность резины: {t.tireSize}
                        </div>
                      ) : null}
                      {t.customer ? (
                        <div className="text-xs text-gray-500 mt-1">
                          Клиент:{' '}
                          <Link href={`../customers/${t.customer.id}`} className="hover:underline">
                            {t.customer.name}
                          </Link>
                        </div>
                      ) : null}
                      {t.comment ? (
                        <div className="text-gray-600 mt-2 text-xs whitespace-pre-wrap">
                          {t.comment}
                        </div>
                      ) : null}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEquipmentModal(t)}
                        disabled={loading}
                      >
                        Изм.
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteEquipment(t.id)}
                        disabled={loading}
                      >
                        Удалить
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
            {data.tachographs.length === 0 ? (
              <div className="text-gray-500">Оборудования пока нет</div>
            ) : null}
          </div>
        </div>

        {data.currentW || data.currentK || data.currentL ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="font-semibold text-gray-900 mb-3">
              Параметры калибровки (актуальные)
            </div>
            <div className="text-sm text-gray-700 space-y-1">
              <div>
                <span className="text-gray-500">W:</span> {data.currentW ?? '—'}
              </div>
              <div>
                <span className="text-gray-500">K:</span> {data.currentK ?? '—'}
              </div>
              <div>
                <span className="text-gray-500">L:</span> {data.currentL ?? '—'}
              </div>
              {data.lastCalibrationDate ? (
                <div className="text-xs text-gray-500 mt-2">
                  Дата: {new Date(data.lastCalibrationDate).toLocaleDateString('ru-RU')}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900 mb-3">Сделки</div>
          <div className="space-y-2 text-sm">
            {data.orders.map(o => (
              <div key={o.id} className="flex items-center justify-between">
                <Link className="hover:underline" href={`../orders/${o.id}`}>
                  {o.number}
                </Link>
                <span className="text-xs text-gray-500">{o.status}</span>
              </div>
            ))}
            {data.orders.length === 0 ? <div className="text-gray-500">Нет сделок</div> : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5">
          <div className="font-semibold text-gray-900 mb-3">Документы</div>
          <div className="space-y-2 text-sm">
            {data.documents.map(d => (
              <div key={d.id} className="flex items-center justify-between">
                <span className="text-gray-700">{d.type}</span>
                <a
                  className="text-blue-600 hover:underline"
                  href={d.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  {d.fileName}
                </a>
              </div>
            ))}
            {data.documents.length === 0 ? (
              <div className="text-gray-500">Нет документов</div>
            ) : null}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Редактировать ТС"
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
                onChange={e => setCategory(e.target.value as typeof category)}
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
            <div className="mt-2">
              <OpenRelatedLink
                label="Открыть клиента"
                href={customerId ? `/crm/${tenantId}/customers/${customerId}` : ''}
                disabled={!customerId}
              />
            </div>
          </div>
          <Textarea
            label="Комментарий"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={saveVehicle} isLoading={loading}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isEquipmentModalOpen}
        onClose={() => setIsEquipmentModalOpen(false)}
        title={editingEquipment ? 'Редактировать оборудование' : 'Добавить оборудование'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип оборудования</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={equipmentType}
              onChange={e => setEquipmentType(e.target.value as typeof equipmentType)}
            >
              <option value="TACHOGRAPH">Тахограф</option>
              <option value="GLONASS">Глонасс</option>
              <option value="OTHER">Другое</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input
              label="Марка оборудования"
              value={equipmentBrand}
              onChange={e => setEquipmentBrand(e.target.value)}
            />
            <Input
              label="Модель оборудования"
              value={equipmentModel}
              onChange={e => setEquipmentModel(e.target.value)}
            />
          </div>
          <Input
            label="Серийный номер"
            value={equipmentSerialNumber}
            onChange={e => setEquipmentSerialNumber(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Номер блока СКЗИ</label>
            <div className="space-y-2">
              <Input
                label=""
                value={equipmentSkziSerialNumber}
                onChange={e => {
                  setEquipmentSkziSerialNumber(e.target.value)
                  // Если введенный номер совпадает с существующим - устанавливаем его ID
                  const matching = skziBlocks.find(
                    s =>
                      s.serialNumber &&
                      s.serialNumber.toLowerCase() === e.target.value.trim().toLowerCase()
                  )
                  if (matching) {
                    setEquipmentSkziId(matching.id)
                  } else {
                    setEquipmentSkziId('')
                  }
                }}
                placeholder="Введите номер или выберите из списка"
                list="skzi-list"
              />
              <datalist id="skzi-list">
                {skziBlocks.map(skzi => (
                  <option key={skzi.id} value={skzi.serialNumber ?? ''}>
                    {skzi.expiryDate
                      ? `(до ${new Date(skzi.expiryDate).toLocaleDateString('ru-RU')})`
                      : ''}
                  </option>
                ))}
              </datalist>
              {equipmentSkziSerialNumber &&
                (() => {
                  const matching = skziBlocks.find(
                    s =>
                      s.serialNumber &&
                      s.serialNumber.toLowerCase() ===
                        equipmentSkziSerialNumber.trim().toLowerCase()
                  )
                  if (matching?.expiryDate) {
                    return (
                      <div className="text-xs text-gray-500">
                        Дата окончания блока СКЗИ:{' '}
                        {new Date(matching.expiryDate).toLocaleDateString('ru-RU')}
                      </div>
                    )
                  } else if (equipmentSkziSerialNumber.trim() !== '') {
                    return (
                      <div className="text-xs text-blue-600">
                        Будет создан новый блок СКЗИ с номером: {equipmentSkziSerialNumber.trim()}
                      </div>
                    )
                  }
                  return null
                })()}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              label="Коэффициент W"
              value={equipmentW}
              onChange={e => setEquipmentW(e.target.value)}
            />
            <Input
              label="Коэффициент K"
              value={equipmentK}
              onChange={e => setEquipmentK(e.target.value)}
            />
            <Input
              label="Коэффициент L"
              value={equipmentL}
              onChange={e => setEquipmentL(e.target.value)}
            />
          </div>
          <Input
            label="Дата выполнения работ"
            type="date"
            value={equipmentWorkDate}
            onChange={e => setEquipmentWorkDate(e.target.value)}
          />
          <Input
            label="Размерность резины"
            value={equipmentTireSize}
            onChange={e => setEquipmentTireSize(e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Клиент (опционально)
            </label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={equipmentCustomerId}
              onChange={e => setEquipmentCustomerId(e.target.value)}
            >
              <option value="">— Не привязано</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Textarea
            label="Комментарий"
            value={equipmentComment}
            onChange={e => setEquipmentComment(e.target.value)}
            rows={4}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsEquipmentModalOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button variant="gradient" onClick={saveEquipment} isLoading={loading}>
              {editingEquipment ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 mt-6">
        <div className="font-semibold text-gray-900 mb-4">История изменений</div>
        <AuditHistory tenantId={tenantId} entityType="vehicle" entityId={id} />
      </div>
    </div>
  )
}
