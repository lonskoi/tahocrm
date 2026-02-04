'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'

type VatRate = 'NONE' | 'VAT_5' | 'VAT_7' | 'VAT_10' | 'VAT_20' | 'VAT_22'

type Product = {
  id: string
  name: string
  sku: string | null
  unit: string | null
  price: string
  vatRate: VatRate
  isActive: boolean
  createdAt: string
}

type Service = {
  id: string
  name: string
  sku: string | null
  unit: string | null
  price: string
  vatRate: VatRate
  isActive: boolean
  createdAt: string
}

export default function ProductsServicesPage() {
  const [tab, setTab] = useState<'products' | 'services'>('products')
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Product | Service | null>(null)
  const [name, setName] = useState('')
  const [sku, setSku] = useState('')
  const [unit, setUnit] = useState('')
  const [price, setPrice] = useState('')
  const [vatRate, setVatRate] = useState<VatRate>('VAT_20')
  const [isActive, setIsActive] = useState(true)
  const [defaultVatRate, setDefaultVatRate] = useState<VatRate>('VAT_22')

  const formData = { name, sku, unit, price, vatRate, isActive }
  const draft = useFormDraft(
    { key: `${tab}-${editingItem?.id || 'new'}`, enabled: isModalOpen },
    formData,
    [isModalOpen, tab, editingItem?.id]
  )

  async function loadProducts() {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (res.ok) setProducts(data as Product[])
    } catch {
      // Ignore
    }
  }

  async function loadServices() {
    try {
      const res = await fetch('/api/services')
      const data = await res.json()
      if (res.ok) setServices(data as Service[])
    } catch {
      // Ignore
    }
  }

  async function loadDefaultVatRate() {
    try {
      const res = await fetch('/api/tenant/settings')
      const data = await res.json()
      if (res.ok && data?.defaultVatRate) {
        setDefaultVatRate(data.defaultVatRate as VatRate)
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    loadProducts()
    loadServices()
    loadDefaultVatRate()
  }, [])

  const filtered = useMemo(() => {
    const items = tab === 'products' ? products : services
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter(item => {
      return (
        item.name.toLowerCase().includes(needle) || (item.sku ?? '').toLowerCase().includes(needle)
      )
    })
  }, [products, services, tab, q])

  function openCreate() {
    setEditingItem(null)
    const draftData = draft.loadDraft()
    if (draftData) {
      setName(draftData.name ?? '')
      setSku(draftData.sku ?? '')
      setUnit(draftData.unit ?? '')
      setPrice(draftData.price ?? '')
      // Всегда используем defaultVatRate для новых товаров, игнорируя draft
      setVatRate(defaultVatRate)
      setIsActive(draftData.isActive ?? true)
    } else {
      setName('')
      setSku('')
      setUnit('')
      setPrice('')
      setVatRate(defaultVatRate)
      setIsActive(true)
    }
    setIsModalOpen(true)
  }

  function openEdit(item: Product | Service) {
    setEditingItem(item)
    setName(item.name)
    setSku(item.sku ?? '')
    setUnit(item.unit ?? '')
    setPrice(item.price)
    setVatRate(item.vatRate)
    setIsActive(item.isActive)
    setIsModalOpen(true)
  }

  async function saveItem() {
    setLoading(true)
    setError('')
    try {
      const body = {
        name: name || null,
        sku: sku || null,
        unit: unit || null,
        price: price ? parseFloat(price) : 0,
        vatRate: vatRate,
        isActive: isActive,
      }

      const endpoint = tab === 'products' ? '/api/products' : '/api/services'
      const method = editingItem ? 'PATCH' : 'POST'
      const url = editingItem ? `${endpoint}/${editingItem.id}` : endpoint

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok)
        throw new Error(
          data?.error ||
            `Не удалось ${editingItem ? 'сохранить' : 'создать'} ${tab === 'products' ? 'товар' : 'услугу'}`
        )
      draft.clearDraft()
      setIsModalOpen(false)
      if (tab === 'products') await loadProducts()
      else await loadServices()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function deleteItem(item: Product | Service) {
    if (!confirm(`Удалить ${tab === 'products' ? 'товар' : 'услугу'} "${item.name}"?`)) return
    setLoading(true)
    setError('')
    try {
      const endpoint = tab === 'products' ? '/api/products' : '/api/services'
      const res = await fetch(`${endpoint}/${item.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok)
        throw new Error(
          data?.error || `Не удалось удалить ${tab === 'products' ? 'товар' : 'услугу'}`
        )
      if (tab === 'products') await loadProducts()
      else await loadServices()
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
          <h1 className="text-3xl font-bold text-gray-900">Товары/услуги</h1>
          <p className="text-gray-600">Управление каталогом товаров и услуг</p>
        </div>
        <Button variant="gradient" onClick={openCreate} disabled={loading}>
          Добавить {tab === 'products' ? 'товар' : 'услугу'}
        </Button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setTab('products')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'products'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Товары
        </button>
        <button
          onClick={() => setTab('services')}
          className={`px-4 py-2 font-medium transition-colors ${
            tab === 'services'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Услуги
        </button>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Название, артикул"
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
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Артикул</th>
              <th className="px-4 py-3 text-left">Ед. изм.</th>
              <th className="px-4 py-3 text-right">Цена</th>
              <th className="px-4 py-3 text-left">НДС</th>
              <th className="px-4 py-3 text-center">Статус</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{item.name}</td>
                <td className="px-4 py-3 text-gray-700">{item.sku ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{item.unit ?? '—'}</td>
                <td className="px-4 py-3 text-right text-gray-900 font-medium">
                  {parseFloat(item.price).toLocaleString('ru-RU', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  ₽
                </td>
                <td className="px-4 py-3 text-gray-700">
                  {item.vatRate === 'VAT_22'
                    ? '22%'
                    : item.vatRate === 'VAT_20'
                      ? '20%'
                      : item.vatRate === 'VAT_10'
                        ? '10%'
                        : item.vatRate === 'VAT_7'
                          ? '7%'
                          : item.vatRate === 'VAT_5'
                            ? '5%'
                            : 'Без НДС'}
                </td>
                <td className="px-4 py-3 text-center">
                  {item.isActive ? (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Активен
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      Неактивен
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(item)}
                      disabled={loading}
                    >
                      Изм.
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteItem(item)}
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
                  {loading ? 'Загрузка...' : `${tab === 'products' ? 'Товары' : 'Услуги'} пока нет`}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={
          editingItem
            ? `Редактировать ${tab === 'products' ? 'товар' : 'услугу'}`
            : `Добавить ${tab === 'products' ? 'товар' : 'услугу'}`
        }
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Название" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="Артикул (SKU)" value={sku} onChange={e => setSku(e.target.value)} />
          <Input
            label="Единица измерения"
            value={unit}
            onChange={e => setUnit(e.target.value)}
            placeholder="шт, усл, кг"
          />
          <Input
            label="Цена"
            type="number"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="0.00"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">НДС</label>
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={vatRate}
              onChange={e => setVatRate(e.target.value as VatRate)}
            >
              <option value="NONE">Без НДС</option>
              <option value="VAT_5">5%</option>
              <option value="VAT_7">7%</option>
              <option value="VAT_10">10%</option>
              <option value="VAT_20">20%</option>
              <option value="VAT_22">22%</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={e => setIsActive(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Активен
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={saveItem} isLoading={loading}>
              {editingItem ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
