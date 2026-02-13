'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDateTime, localInputToIso, pickBusinessDate } from '@/lib/datetime'

type Org = {
  id: string
  name: string
  inn: string | null
  kpp: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
}

type VatRate = 'NONE' | 'VAT_5' | 'VAT_7' | 'VAT_10' | 'VAT_20' | 'VAT_22'

export default function SettingsPage() {
  const [orgs, setOrgs] = useState<Org[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modules, setModules] = useState<Record<string, boolean> | null>(null)
  const [defaultVatRate, setDefaultVatRate] = useState<VatRate>('VAT_22')
  const [loadingVatRate, setLoadingVatRate] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [inn, setInn] = useState('')
  const [kpp, setKpp] = useState('')
  const [isDefault, setIsDefault] = useState(false)
  const [businessCreatedAtLocal, setBusinessCreatedAtLocal] = useState('')
  const [businessUpdatedAtLocal, setBusinessUpdatedAtLocal] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const [orgRes, uiRes, settingsRes] = await Promise.all([
        fetch('/api/organizations'),
        fetch('/api/ui-config'),
        fetch('/api/tenant/settings'),
      ])
      const orgData = await orgRes.json()
      if (!orgRes.ok) throw new Error(orgData?.error || 'Не удалось загрузить организации')
      setOrgs(orgData as Org[])

      const uiData = await uiRes.json().catch(() => null)
      if (uiData?.modules && typeof uiData.modules === 'object') {
        setModules(uiData.modules as Record<string, boolean>)
      } else {
        setModules(null)
      }

      const settingsData = await settingsRes.json().catch(() => null)
      if (settingsData?.defaultVatRate) {
        setDefaultVatRate(settingsData.defaultVatRate as VatRate)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  function openCreate() {
    setName('')
    setInn('')
    setKpp('')
    setIsDefault(false)
    setBusinessCreatedAtLocal('')
    setBusinessUpdatedAtLocal('')
    setIsModalOpen(true)
  }

  async function create() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          inn: inn || null,
          kpp: kpp || null,
          isDefault,
          businessCreatedAt: localInputToIso(businessCreatedAtLocal),
          businessUpdatedAt: localInputToIso(businessUpdatedAtLocal),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось создать организацию')
      setIsModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function saveUiConfig() {
    if (!modules) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/ui-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modules }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить настройки интерфейса')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function saveDefaultVatRate() {
    setLoadingVatRate(true)
    setError('')
    try {
      const res = await fetch('/api/tenant/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ defaultVatRate }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось сохранить НДС по умолчанию')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoadingVatRate(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Настройки</h1>
          <p className="text-gray-600">
            Организации, от имени которых выставляются счета/документы
          </p>
        </div>
        <Button variant="gradient" onClick={openCreate} disabled={loading}>
          Добавить организацию
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">ИНН</th>
              <th className="px-4 py-3 text-left">КПП</th>
              <th className="px-4 py-3 text-left">По умолчанию</th>
              <th className="px-4 py-3 text-left">Дата/время</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map(o => (
              <tr key={o.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{o.name}</td>
                <td className="px-4 py-3 text-gray-700">{o.inn ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{o.kpp ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{o.isDefault ? 'Да' : 'Нет'}</td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>
                    Создано: {formatDateTime(pickBusinessDate(o.businessCreatedAt, o.createdAt))}
                  </div>
                  <div>
                    Обновлено: {formatDateTime(pickBusinessDate(o.businessUpdatedAt, o.updatedAt))}
                  </div>
                </td>
              </tr>
            ))}
            {orgs.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={5}>
                  {loading ? 'Загрузка...' : 'Организаций пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="font-semibold text-gray-900 mb-3">НДС по умолчанию</div>
        <p className="text-sm text-gray-600 mb-4">
          Выберите НДС по умолчанию для новых товаров и услуг. Этот НДС будет автоматически
          применяться при создании, но его можно изменить для каждого товара/услуги отдельно.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">НДС по умолчанию</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={defaultVatRate}
              onChange={e => setDefaultVatRate(e.target.value as VatRate)}
            >
              <option value="NONE">Без НДС</option>
              <option value="VAT_5">5%</option>
              <option value="VAT_7">7%</option>
              <option value="VAT_10">10%</option>
              <option value="VAT_20">20%</option>
              <option value="VAT_22">22%</option>
            </select>
          </div>
          <div className="pt-2">
            <Button variant="gradient" onClick={saveDefaultVatRate} isLoading={loadingVatRate}>
              Сохранить НДС по умолчанию
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="font-semibold text-gray-900 mb-3">Интерфейс (включение разделов)</div>
        <p className="text-sm text-gray-600 mb-4">
          Можно скрывать разделы для мастерской (меню и доступ к страницам останутся защищены
          ролями/API).
        </p>
        {modules ? (
          <div className="space-y-3">
            {(
              [
                ['customers', 'Клиенты'],
                ['vehicles', 'ТС'],
                ['equipment', 'Оборудование'],
                ['orders', 'Сделки'],
                ['invoices', 'Счета'],
                ['documents', 'Документы'],
                ['users', 'Пользователи'],
                ['settings', 'Настройки'],
              ] as Array<[string, string]>
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={modules[key] !== false}
                  onChange={e => setModules({ ...modules, [key]: e.target.checked })}
                />
                <span className="text-sm text-gray-800">{label}</span>
              </label>
            ))}
            <div className="pt-2">
              <Button variant="gradient" onClick={saveUiConfig} isLoading={loading}>
                Сохранить интерфейс
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500">Загрузка настроек интерфейса...</div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Добавить организацию"
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Название" value={name} onChange={e => setName(e.target.value)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Input label="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
            <Input label="КПП" value={kpp} onChange={e => setKpp(e.target.value)} />
          </div>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={e => setIsDefault(e.target.checked)}
            />
            <span className="text-sm text-gray-800">Сделать организацией по умолчанию</span>
          </label>
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
            <Button variant="gradient" onClick={create} isLoading={loading}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
