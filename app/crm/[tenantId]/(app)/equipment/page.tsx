'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { formatDateTime, isoToLocalInput, localInputToIso, pickBusinessDate } from '@/lib/datetime'

type EquipmentType = 'TACHOGRAPH' | 'GLONASS' | 'OTHER'

type Tachograph = {
  id: string
  type: EquipmentType
  brand: string | null
  model: string | null
  serialNumber: string | null
  comment: string | null
  w: string | null
  k: string | null
  l: string | null
  workDate: string | null
  tireSize: string | null
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
  vehicle: { id: string; govNumber: string } | null
  customer: { id: string; name: string } | null
  skzi: { id: string; serialNumber: string | null; expiryDate: string | null } | null
}

type SKZI = {
  id: string
  serialNumber: string | null
  activationDate: string | null
  expiryDate: string | null
}

export default function EquipmentPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params?.tenantId
  const router = useRouter()
  const searchParams = useSearchParams()

  const [q, setQ] = useState('')
  const [tachographs, setTachographs] = useState<Tachograph[]>([])
  const [skzi, setSkzi] = useState<SKZI[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Init q from URL (e.g. /equipment?q=...)
  useEffect(() => {
    const fromUrl = (searchParams?.get('q') ?? '').trim()
    if (fromUrl) setQ(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep URL in sync with q (shareable filter)
  useEffect(() => {
    if (!tenantId) return
    const t = setTimeout(() => {
      const next = q.trim()
      const url = next
        ? `/crm/${tenantId}/equipment?q=${encodeURIComponent(next)}`
        : `/crm/${tenantId}/equipment`
      router.replace(url, { scroll: false })
    }, 300)
    return () => clearTimeout(t)
  }, [q, router, tenantId])

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingEquipment, setEditingEquipment] = useState<Tachograph | null>(null)
  const [equipmentType, setEquipmentType] = useState<EquipmentType>('TACHOGRAPH')
  const [equipmentBrand, setEquipmentBrand] = useState('')
  const [equipmentModel, setEquipmentModel] = useState('')
  const [equipmentSerialNumber, setEquipmentSerialNumber] = useState('')
  const [equipmentComment, setEquipmentComment] = useState('')
  const [equipmentCustomerId, setEquipmentCustomerId] = useState('')
  const [equipmentSkziSerialNumber, setEquipmentSkziSerialNumber] = useState('')
  const [equipmentW, setEquipmentW] = useState('')
  const [equipmentK, setEquipmentK] = useState('')
  const [equipmentL, setEquipmentL] = useState('')
  const [equipmentWorkDate, setEquipmentWorkDate] = useState('')
  const [equipmentTireSize, setEquipmentTireSize] = useState('')
  const [businessCreatedAtLocal, setBusinessCreatedAtLocal] = useState('')
  const [businessUpdatedAtLocal, setBusinessUpdatedAtLocal] = useState('')
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [skziBlocks, setSkziBlocks] = useState<
    Array<{ id: string; serialNumber: string | null; expiryDate: string | null }>
  >([])

  // Временное сохранение данных формы редактирования оборудования
  const equipmentFormData = {
    type: equipmentType,
    brand: equipmentBrand,
    model: equipmentModel,
    serialNumber: equipmentSerialNumber,
    comment: equipmentComment,
    customerId: equipmentCustomerId,
    skziSerialNumber: equipmentSkziSerialNumber,
    w: equipmentW,
    k: equipmentK,
    l: equipmentL,
    workDate: equipmentWorkDate,
    tireSize: equipmentTireSize,
    businessCreatedAtLocal,
    businessUpdatedAtLocal,
  }
  const equipmentDraft = useFormDraft(
    { key: `equipment-edit-${editingEquipment?.id || 'new'}`, enabled: isEditModalOpen },
    equipmentFormData,
    [isEditModalOpen, editingEquipment?.id]
  )

  const load = useCallback(async () => {
    setError('')
    try {
      const res = await fetch('/api/equipment')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить оборудование')
      setTachographs((data?.tachographs ?? []) as Tachograph[])
      setSkzi((data?.skzi ?? []) as SKZI[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }, [])

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

  function openEditModal(equipment: Tachograph) {
    setEditingEquipment(equipment)
    // Восстанавливаем данные из черновика или используем данные из БД
    const draft = equipmentDraft.loadDraft()
    if (draft) {
      setEquipmentType((draft.type as EquipmentType) ?? equipment.type)
      setEquipmentBrand(draft.brand ?? equipment.brand ?? '')
      setEquipmentModel(draft.model ?? equipment.model ?? '')
      setEquipmentSerialNumber(draft.serialNumber ?? equipment.serialNumber ?? '')
      setEquipmentComment(draft.comment ?? equipment.comment ?? '')
      setEquipmentCustomerId(draft.customerId ?? equipment.customer?.id ?? '')
      setEquipmentSkziSerialNumber(draft.skziSerialNumber ?? equipment.skzi?.serialNumber ?? '')
      setEquipmentW(draft.w ?? equipment.w ?? '')
      setEquipmentK(draft.k ?? equipment.k ?? '')
      setEquipmentL(draft.l ?? equipment.l ?? '')
      setEquipmentWorkDate(
        draft.workDate ??
          (equipment.workDate
            ? (new Date(equipment.workDate).toISOString().split('T')[0] ?? '')
            : '')
      )
      setEquipmentTireSize(draft.tireSize ?? equipment.tireSize ?? '')
      setBusinessCreatedAtLocal(
        draft.businessCreatedAtLocal ?? isoToLocalInput(equipment.businessCreatedAt)
      )
      setBusinessUpdatedAtLocal(
        draft.businessUpdatedAtLocal ?? isoToLocalInput(equipment.businessUpdatedAt)
      )
    } else {
      setEquipmentType(equipment.type)
      setEquipmentBrand(equipment.brand ?? '')
      setEquipmentModel(equipment.model ?? '')
      setEquipmentSerialNumber(equipment.serialNumber ?? '')
      setEquipmentComment(equipment.comment ?? '')
      setEquipmentCustomerId(equipment.customer?.id ?? '')
      setEquipmentSkziSerialNumber(equipment.skzi?.serialNumber ?? '')
      setEquipmentW(equipment.w ?? '')
      setEquipmentK(equipment.k ?? '')
      setEquipmentL(equipment.l ?? '')
      setEquipmentWorkDate(
        equipment.workDate ? (new Date(equipment.workDate).toISOString().split('T')[0] ?? '') : ''
      )
      setEquipmentTireSize(equipment.tireSize ?? '')
      setBusinessCreatedAtLocal(isoToLocalInput(equipment.businessCreatedAt))
      setBusinessUpdatedAtLocal(isoToLocalInput(equipment.businessUpdatedAt))
    }
    loadCustomers()
    loadSkziBlocks()
    setIsEditModalOpen(true)
  }

  async function saveEquipment() {
    if (!editingEquipment) return
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
        customerId: equipmentCustomerId || null,
        w: equipmentW || null,
        k: equipmentK || null,
        l: equipmentL || null,
        workDate: equipmentWorkDate || null,
        tireSize: equipmentTireSize || null,
        businessCreatedAt: localInputToIso(businessCreatedAtLocal),
        businessUpdatedAt: localInputToIso(businessUpdatedAtLocal),
      }

      if (skziIdToSend !== undefined) {
        body.skziId = skziIdToSend
      }
      if (skziSerialNumberToSend !== undefined) {
        body.skziSerialNumber = skziSerialNumberToSend
      }

      const res = await fetch(`/api/tachographs/${editingEquipment.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить оборудование')
      equipmentDraft.clearDraft()
      setIsEditModalOpen(false)
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

  useEffect(() => {
    load()
  }, [load])

  const needle = q.trim().toLowerCase()
  const filteredTachographs = useMemo(() => {
    if (!needle) return tachographs
    return tachographs.filter(t => {
      return (
        (t.serialNumber ?? '').toLowerCase().includes(needle) ||
        (t.model ?? '').toLowerCase().includes(needle) ||
        (t.brand ?? '').toLowerCase().includes(needle) ||
        (t.vehicle?.govNumber ?? '').toLowerCase().includes(needle) ||
        (t.customer?.name ?? '').toLowerCase().includes(needle) ||
        (t.skzi?.serialNumber ?? '').toLowerCase().includes(needle)
      )
    })
  }, [tachographs, needle])

  const filteredSkzi = useMemo(() => {
    if (!needle) return skzi
    return skzi.filter(s => (s.serialNumber ?? '').toLowerCase().includes(needle))
  }, [skzi, needle])

  const getEquipmentTypeLabel = (type: EquipmentType) => {
    switch (type) {
      case 'TACHOGRAPH':
        return 'Тахограф'
      case 'GLONASS':
        return 'Глонасс'
      case 'OTHER':
        return 'Другое'
      default:
        return type
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Оборудование</h1>
        <p className="text-gray-600">Тахографы и блоки СКЗИ</p>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Серийник, модель, госномер, клиент"
        />
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">
            Оборудование
          </div>
          <div className="p-5 space-y-3 text-sm">
            {filteredTachographs.map(t => {
              const typeLabel = getEquipmentTypeLabel(t.type)
              return (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-4 border-t border-gray-100 pt-3 first:border-t-0 first:pt-0"
                >
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
                    {t.customer ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Клиент:{' '}
                        <Link
                          href={`/crm/${tenantId}/customers/${t.customer.id}`}
                          className="hover:underline"
                        >
                          {t.customer.name}
                        </Link>
                      </div>
                    ) : null}
                    {t.vehicle ? (
                      <div className="text-xs text-gray-500 mt-1">
                        ТС:{' '}
                        <Link
                          href={`/crm/${tenantId}/vehicles/${t.vehicle.id}`}
                          className="hover:underline"
                        >
                          {t.vehicle.govNumber}
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
                    {t.comment ? (
                      <div className="text-gray-600 mt-2 text-xs whitespace-pre-wrap">
                        {t.comment}
                      </div>
                    ) : null}
                    <div className="text-xs text-gray-500 mt-1">
                      Создано: {formatDateTime(pickBusinessDate(t.businessCreatedAt, t.createdAt))}
                    </div>
                    <div className="text-xs text-gray-500">
                      Обновлено:{' '}
                      {formatDateTime(pickBusinessDate(t.businessUpdatedAt, t.updatedAt))}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditModal(t)}
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
              )
            })}
            {filteredTachographs.length === 0 ? (
              <div className="text-gray-500">Нет данных</div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-900">СКЗИ</div>
          <div className="p-5 space-y-3 text-sm">
            {filteredSkzi.map(s => (
              <div key={s.id} className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-gray-900">{s.serialNumber ?? '—'}</div>
                  <div className="text-xs text-gray-500">
                    {s.activationDate ? `активация: ${String(s.activationDate).slice(0, 10)}` : ''}{' '}
                    {s.expiryDate ? `· до: ${String(s.expiryDate).slice(0, 10)}` : ''}
                  </div>
                </div>
              </div>
            ))}
            {filteredSkzi.length === 0 ? <div className="text-gray-500">Нет данных</div> : null}
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Редактировать оборудование"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип оборудования</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={equipmentType}
              onChange={e => setEquipmentType(e.target.value as EquipmentType)}
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
                onChange={e => setEquipmentSkziSerialNumber(e.target.value)}
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
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={saveEquipment} isLoading={loading}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
