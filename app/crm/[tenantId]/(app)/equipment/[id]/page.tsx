'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useFormDraft } from '@/lib/hooks/use-form-draft'
import { AuditHistory } from '@/components/audit/audit-history'
import { ContextNav } from '@/components/nav/context-nav'
import { OpenRelatedLink } from '@/components/nav/open-related-link'

type EquipmentType = 'TACHOGRAPH' | 'GLONASS' | 'OTHER'

type EquipmentDetails = {
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
  batteryReplaced: boolean
  batteryReplacedAt: string | null
  vehicle: { id: string; govNumber: string } | null
  customer: { id: string; name: string } | null
  skzi: { id: string; serialNumber: string | null; expiryDate: string | null } | null
}

export default function EquipmentDetailsPage() {
  const params = useParams<{ tenantId: string; id: string }>()
  const router = useRouter()
  const id = params?.id
  const tenantId = params?.tenantId

  const [data, setData] = useState<EquipmentDetails | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [equipmentType, setEquipmentType] = useState<EquipmentType>('TACHOGRAPH')
  const [equipmentBrand, setEquipmentBrand] = useState('')
  const [equipmentModel, setEquipmentModel] = useState('')
  const [equipmentSerialNumber, setEquipmentSerialNumber] = useState('')
  const [equipmentComment, setEquipmentComment] = useState('')
  const [equipmentCustomerId, setEquipmentCustomerId] = useState('')
  const [equipmentVehicleId, setEquipmentVehicleId] = useState('')
  const [equipmentSkziSerialNumber, setEquipmentSkziSerialNumber] = useState('')
  const [equipmentW, setEquipmentW] = useState('')
  const [equipmentK, setEquipmentK] = useState('')
  const [equipmentL, setEquipmentL] = useState('')
  const [equipmentWorkDate, setEquipmentWorkDate] = useState('')
  const [equipmentTireSize, setEquipmentTireSize] = useState('')
  const [customers, setCustomers] = useState<Array<{ id: string; name: string }>>([])
  const [vehicles, setVehicles] = useState<Array<{ id: string; govNumber: string }>>([])
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
    vehicleId: equipmentVehicleId,
    skziSerialNumber: equipmentSkziSerialNumber,
    w: equipmentW,
    k: equipmentK,
    l: equipmentL,
    workDate: equipmentWorkDate,
    tireSize: equipmentTireSize,
  }
  const equipmentDraft = useFormDraft(
    { key: `equipment-edit-${id || 'new'}`, enabled: true },
    equipmentFormData,
    [id]
  )

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tachographs/${id}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось загрузить оборудование')
      setData(json as EquipmentDetails)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [id])

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

  async function loadVehicles() {
    try {
      const res = await fetch('/api/vehicles')
      if (res.ok) {
        const json = await res.json()
        setVehicles(
          (json as Array<{ id: string; govNumber: string }>).map(v => ({
            id: v.id,
            govNumber: v.govNumber,
          }))
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

  useEffect(() => {
    load()
    loadCustomers()
    loadVehicles()
    loadSkziBlocks()
  }, [load])

  // Отслеживаем предыдущий id для очистки черновика при смене оборудования
  const prevIdRef = useRef<string | undefined>(undefined)

  // Очищаем черновик при смене id (переход на другое оборудование)
  useEffect(() => {
    if (id && prevIdRef.current !== undefined && prevIdRef.current !== id) {
      // Очищаем черновик предыдущего оборудования
      equipmentDraft.clearDraft()
    }
    prevIdRef.current = id
  }, [id, equipmentDraft])

  // Функция для правильной обработки workDate
  const formatWorkDate = useCallback((dateValue: string | null | undefined): string => {
    if (!dateValue) return ''
    try {
      // Если это уже строка в формате YYYY-MM-DD, возвращаем как есть
      if (typeof dateValue === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateValue)) {
        const parts = dateValue.split('T')
        return parts[0] || ''
      }
      // Если это Date объект или ISO строка, конвертируем
      const date = new Date(dateValue)
      if (!isNaN(date.getTime())) {
        const iso = date.toISOString()
        const parts = iso.split('T')
        return parts[0] || ''
      }
      return ''
    } catch {
      return ''
    }
  }, [])

  // Заполняем состояние при загрузке данных из БД
  useEffect(() => {
    if (!data) return

    // Всегда используем данные из БД при загрузке страницы
    setEquipmentType(data.type)
    setEquipmentBrand(data.brand ?? '')
    setEquipmentModel(data.model ?? '')
    setEquipmentSerialNumber(data.serialNumber ?? '')
    setEquipmentComment(data.comment ?? '')
    setEquipmentCustomerId(data.customer?.id ?? '')
    setEquipmentVehicleId(data.vehicle?.id ?? '')
    setEquipmentSkziSerialNumber(data.skzi?.serialNumber ?? '')
    setEquipmentW(data.w ?? '')
    setEquipmentK(data.k ?? '')
    setEquipmentL(data.l ?? '')
    setEquipmentWorkDate(formatWorkDate(data.workDate))
    setEquipmentTireSize(data.tireSize ?? '')
  }, [data, formatWorkDate])

  function resetForm() {
    if (!data) return
    setEquipmentType(data.type)
    setEquipmentBrand(data.brand ?? '')
    setEquipmentModel(data.model ?? '')
    setEquipmentSerialNumber(data.serialNumber ?? '')
    setEquipmentComment(data.comment ?? '')
    setEquipmentCustomerId(data.customer?.id ?? '')
    setEquipmentVehicleId(data.vehicle?.id ?? '')
    setEquipmentSkziSerialNumber(data.skzi?.serialNumber ?? '')
    setEquipmentW(data.w ?? '')
    setEquipmentK(data.k ?? '')
    setEquipmentL(data.l ?? '')
    setEquipmentWorkDate(
      data.workDate ? (new Date(data.workDate).toISOString().split('T')[0] ?? '') : ''
    )
    setEquipmentTireSize(data.tireSize ?? '')
    equipmentDraft.clearDraft()
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
        vehicleId: equipmentVehicleId || null,
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

      const res = await fetch(`/api/tachographs/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось сохранить оборудование')
      equipmentDraft.clearDraft()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteEquipment() {
    if (!id) return
    if (!confirm('Удалить оборудование?')) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tachographs/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось удалить оборудование')
      router.push(`/crm/${tenantId}/equipment`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

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
            <Link href={`/crm/${tenantId}/equipment`} className="hover:underline">
              Оборудование
            </Link>{' '}
            / {getEquipmentTypeLabel(data.type)}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {data.serialNumber ? `Серийный номер: ${data.serialNumber}` : 'Оборудование'}
          </h1>
          <p className="text-gray-600">
            {data.brand && data.model
              ? `${data.brand} ${data.model}`
              : data.brand || data.model || '—'}
          </p>
        </div>
        <div className="flex gap-2">
          <ContextNav
            backHref={`/crm/${tenantId}/equipment`}
            upHref={
              equipmentVehicleId
                ? `/crm/${tenantId}/vehicles/${equipmentVehicleId}`
                : equipmentCustomerId
                  ? `/crm/${tenantId}/customers/${equipmentCustomerId}`
                  : `/crm/${tenantId}/equipment`
            }
          />
          <Button variant="outline" onClick={resetForm} disabled={loading}>
            Отменить
          </Button>
          <Button variant="gradient" onClick={saveEquipment} isLoading={loading} disabled={loading}>
            Сохранить
          </Button>
          <Button variant="destructive" onClick={deleteEquipment} disabled={loading}>
            Удалить
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
        <div className="font-semibold text-gray-900">Основная информация</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            <div className="mt-2">
              <OpenRelatedLink
                label="Открыть клиента"
                href={
                  equipmentCustomerId ? `/crm/${tenantId}/customers/${equipmentCustomerId}` : ''
                }
                disabled={!equipmentCustomerId}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ТС (опционально)</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={equipmentVehicleId}
              onChange={e => setEquipmentVehicleId(e.target.value)}
            >
              <option value="">— Не привязано</option>
              {vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.govNumber}
                </option>
              ))}
            </select>
            <div className="mt-2">
              <OpenRelatedLink
                label="Открыть ТС"
                href={equipmentVehicleId ? `/crm/${tenantId}/vehicles/${equipmentVehicleId}` : ''}
                disabled={!equipmentVehicleId}
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="font-semibold text-gray-900 mb-4">Параметры</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="grid grid-cols-3 gap-3 lg:col-span-2">
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
            {data.batteryReplaced && (
              <div>
                <div className="text-sm text-gray-500 mb-2">Батарея заменена</div>
                <div className="text-sm font-medium text-gray-900">
                  Да
                  {data.batteryReplacedAt && (
                    <span className="ml-2 text-gray-500">
                      ({new Date(data.batteryReplacedAt).toLocaleDateString('ru-RU')})
                    </span>
                  )}
                </div>
              </div>
            )}
            <Textarea
              label="Комментарий"
              value={equipmentComment}
              onChange={e => setEquipmentComment(e.target.value)}
              rows={4}
              className="lg:col-span-2"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 mt-6">
        <div className="font-semibold text-gray-900 mb-4">История изменений</div>
        <AuditHistory tenantId={tenantId} entityType="tachograph" entityId={id} />
      </div>
    </div>
  )
}
