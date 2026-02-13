'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { useFormDraft } from '@/lib/hooks/use-form-draft'

type Customer = {
  id: string
  name: string
  inn?: string | null
  fullName?: string | null
}

type Product = {
  id: string
  name: string
  sku: string | null
  unit: string | null
  price: string
  vatRate: 'NONE' | 'VAT_5' | 'VAT_7' | 'VAT_10' | 'VAT_20' | 'VAT_22'
}

type Service = {
  id: string
  name: string
  sku: string | null
  unit: string | null
  price: string
  vatRate: 'NONE' | 'VAT_5' | 'VAT_7' | 'VAT_10' | 'VAT_20' | 'VAT_22'
}

type OrderItem = {
  id: string
  type: 'product' | 'service'
  productId?: string | undefined
  serviceId?: string | undefined
  name: string
  quantity: number
  unit: string | null
  price: number
  vatRate: 'NONE' | 'VAT_5' | 'VAT_7' | 'VAT_10' | 'VAT_20' | 'VAT_22'
  vatAmount: number
  totalAmount: number
}

type DriverCardRequestDraft = {
  id: string
  driverFullName: string
  driverPhone: string
  applicationDateLocal: string
  receivedByDriverDateLocal: string
  expiryDateLocal: string
  cardNumber: string
  pin1: string
  pin2: string
  status: 'DRAFT' | 'IN_WORK' | 'READY' | 'ISSUED' | 'CANCELLED'
}

export default function NewCustomerOrderPage() {
  const params = useParams<{ tenantId: string }>()
  const router = useRouter()
  const tenantId = params?.tenantId
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [orderNumber, setOrderNumber] = useState('')
  const [documentDateLocal, setDocumentDateLocal] = useState(() => {
    const d = new Date()
    // yyyy-MM-ddTHH:mm (for <input type="datetime-local" />)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })

  const [customerId, setCustomerId] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerInn, setNewCustomerInn] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [isPaid, setIsPaid] = useState(false)
  const [isShipped, setIsShipped] = useState(false)
  const [isDocumentsSigned, setIsDocumentsSigned] = useState(false)

  const [driverCards, setDriverCards] = useState<DriverCardRequestDraft[]>([])

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemType, setItemType] = useState<'product' | 'service'>('product')
  const [products, setProducts] = useState<Product[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedItemId, setSelectedItemId] = useState('')
  const [itemQuantity, setItemQuantity] = useState('1')
  const [itemPrice, setItemPrice] = useState('')
  const [itemSearch, setItemSearch] = useState('')

  const formData = {
    orderNumber,
    documentDateLocal,
    customerId,
    orderItems,
    driverCards,
    isPaid,
    isShipped,
    isDocumentsSigned,
  }
  const { loadDraft, clearDraft } = useFormDraft(
    { key: 'customer-order-new', enabled: true },
    formData,
    []
  )

  useEffect(() => {
    loadCustomers()
    loadProducts()
    loadServices()
    const draftData = loadDraft()
    if (draftData) {
      setOrderNumber(draftData.orderNumber ?? '')
      setDocumentDateLocal(draftData.documentDateLocal ?? '')
      setCustomerId(draftData.customerId ?? '')
      setOrderItems(draftData.orderItems ?? [])
      setDriverCards(draftData.driverCards ?? [])
      setIsPaid(draftData.isPaid ?? false)
      setIsShipped(draftData.isShipped ?? false)
      setIsDocumentsSigned(draftData.isDocumentsSigned ?? false)
    }
  }, [loadDraft])

  function addDriverCardRow() {
    setDriverCards(prev => [
      ...prev,
      {
        id: String(Date.now()) + Math.random().toString(16).slice(2),
        driverFullName: '',
        driverPhone: '',
        applicationDateLocal: '',
        receivedByDriverDateLocal: '',
        expiryDateLocal: '',
        cardNumber: '',
        pin1: '',
        pin2: '',
        status: 'DRAFT',
      },
    ])
  }

  function removeDriverCardRow(id: string) {
    setDriverCards(prev => prev.filter(r => r.id !== id))
  }

  async function loadCustomers() {
    try {
      const res = await fetch('/api/customers')
      if (res.ok) {
        const data = await res.json()
        setCustomers(
          (data as any[]).map(c => ({
            id: c.id,
            name: c.name,
            inn: c.inn ?? null,
            fullName: c.fullName ?? null,
          }))
        )
      }
    } catch {
      // Ignore
    }
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
          type: 'COMPANY',
          name,
          inn: newCustomerInn.trim() || null,
          phone: newCustomerPhone.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Не удалось создать клиента')
      await loadCustomers()
      setCustomerId(json.id)
      setCustomerSearch(name)
      setIsCustomerModalOpen(false)
      setNewCustomerName('')
      setNewCustomerInn('')
      setNewCustomerPhone('')
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/products')
      if (res.ok) {
        const data = await res.json()
        setProducts(data as Product[])
      }
    } catch {
      // Ignore
    }
  }

  async function loadServices() {
    try {
      const res = await fetch('/api/services')
      if (res.ok) {
        const data = await res.json()
        setServices(data as Service[])
      }
    } catch {
      // Ignore
    }
  }

  function openAddItem(type: 'product' | 'service') {
    setItemType(type)
    setSelectedItemId('')
    setItemQuantity('1')
    setItemPrice('')
    setItemSearch('')
    setIsItemModalOpen(true)
  }

  const filteredCatalog = (() => {
    const catalog = itemType === 'product' ? products : services
    const q = itemSearch.trim().toLowerCase()
    if (!q) return catalog

    const qText = q
    const qNumRaw = q.replace(/[^0-9.,]/g, '').replace(',', '.')
    const qNum = qNumRaw ? Number(qNumRaw) : NaN
    const qHasNum = qNumRaw.length > 0 && Number.isFinite(qNum)

    return catalog.filter(item => {
      const name = String(item.name ?? '').toLowerCase()
      const sku = String(item.sku ?? '').toLowerCase()
      const textMatch = name.includes(qText) || sku.includes(qText)

      if (!qHasNum) return textMatch

      const priceNum = Number(String(item.price ?? '').replace(',', '.'))
      const priceFixed = Number.isFinite(priceNum) ? priceNum.toFixed(2) : String(item.price ?? '')
      const priceMatch =
        (Number.isFinite(priceNum) && Math.abs(priceNum - qNum) < 0.0001) ||
        String(item.price ?? '').includes(qNumRaw) ||
        priceFixed.includes(qNumRaw)

      return textMatch || priceMatch
    })
  })()

  function addItem() {
    const catalog = itemType === 'product' ? products : services
    const item = catalog.find(i => i.id === selectedItemId)
    if (!item) return

    const quantity = parseFloat(itemQuantity) || 1
    const price = parseFloat(itemPrice) || parseFloat(item.price)
    const vatRate = item.vatRate
    // Цена считается "с НДС": НДС выделяем из суммы, а не добавляем сверху
    const gross = price * quantity
    const vatMultiplier =
      vatRate === 'VAT_22'
        ? 0.22
        : vatRate === 'VAT_20'
          ? 0.2
          : vatRate === 'VAT_10'
            ? 0.1
            : vatRate === 'VAT_7'
              ? 0.07
              : vatRate === 'VAT_5'
                ? 0.05
                : 0
    const vatAmount = vatMultiplier > 0 ? (gross * vatMultiplier) / (1 + vatMultiplier) : 0
    const totalAmount = gross

    const newItem: OrderItem = {
      id: `temp-${Date.now()}-${Math.random()}`,
      type: itemType,
      productId: itemType === 'product' ? item.id : undefined,
      serviceId: itemType === 'service' ? item.id : undefined,
      name: item.name,
      quantity,
      unit: item.unit,
      price,
      vatRate,
      vatAmount,
      totalAmount,
    }

    setOrderItems([...orderItems, newItem])
    setIsItemModalOpen(false)
  }

  function removeItem(itemId: string) {
    setOrderItems(orderItems.filter(i => i.id !== itemId))
  }

  const totalAmount = orderItems.reduce((sum, item) => sum + item.totalAmount, 0)

  async function saveOrder() {
    setLoading(true)
    setError('')
    try {
      if (!customerId && driverCards.length > 0) {
        throw new Error(
          'Чтобы сохранить заказ с картами водителей, сначала выберите или создайте клиента'
        )
      }
      const orderBody = {
        number: orderNumber,
        documentDate: documentDateLocal ? new Date(documentDateLocal).toISOString() : '',
        type: 'CUSTOMER_ORDER' as const,
        status: 'DRAFT' as const,
        customerId: customerId || null,
        totalAmount: totalAmount,
        driverCards: driverCards.map(r => ({
          status: r.status,
          driverFullName: r.driverFullName,
          driverPhone: r.driverPhone,
          applicationDate: r.applicationDateLocal
            ? new Date(r.applicationDateLocal).toISOString()
            : '',
          receivedByDriverDate: r.receivedByDriverDateLocal
            ? new Date(r.receivedByDriverDateLocal).toISOString()
            : '',
          expiryDate: r.expiryDateLocal ? new Date(r.expiryDateLocal).toISOString() : '',
          cardNumber: r.cardNumber,
          pinPackCodes: { pin1: r.pin1, pin2: r.pin2 },
        })),
        isPaid,
        isShipped,
        isDocumentsSigned,
      }

      const orderRes = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      })
      const orderData = await orderRes.json()
      if (!orderRes.ok) throw new Error(orderData?.error || 'Не удалось создать заказ')

      // Создаем счет с позициями
      if (orderItems.length > 0) {
        const invoiceBody = {
          orderId: orderData.id,
          customerId: customerId || null,
          items: orderItems.map(item => ({
            productId: item.productId || null,
            serviceId: item.serviceId || null,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || null,
            price: item.price,
            vatRate: item.vatRate,
          })),
          isPaid,
          isShipped,
          isDocumentsSigned,
        }

        await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(invoiceBody),
        })
      }

      clearDraft()
      router.push(`/crm/${tenantId}/customer-orders/${orderData.id}`)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  const selectedCatalogItem =
    itemType === 'product'
      ? products.find(p => p.id === selectedItemId)
      : services.find(s => s.id === selectedItemId)

  useEffect(() => {
    if (selectedCatalogItem && !itemPrice) {
      setItemPrice(selectedCatalogItem.price)
    }
  }, [selectedItemId, selectedCatalogItem, itemPrice])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Новый заказ покупателя</h1>
          <p className="text-gray-600">Создание нового заказа</p>
        </div>
        <Button variant="ghost" onClick={() => router.back()} disabled={loading}>
          Отмена
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Номер заказа</label>
              <Input
                value={orderNumber}
                onChange={e => setOrderNumber(e.target.value)}
                placeholder="Оставьте пустым для автонумерации"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Дата документа</label>
              <Input
                type="datetime-local"
                value={documentDateLocal}
                onChange={e => setDocumentDateLocal(e.target.value)}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3 mb-2">
              <label className="block text-sm font-medium text-gray-700">Клиент *</label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsCustomerModalOpen(true)}
                disabled={loading}
              >
                + Добавить клиента
              </Button>
            </div>
            <Input
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
              placeholder="Поиск: название / ИНН / ФИО"
              className="mb-2"
            />
            <select
              className="w-full h-12 rounded-xl border-2 border-gray-200 px-4 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              required
            >
              <option value="">— Выберите клиента</option>
              {customers
                .filter(c => {
                  const q = customerSearch.trim().toLowerCase()
                  if (!q) return true
                  const name = String(c.name ?? '').toLowerCase()
                  const inn = String(c.inn ?? '').toLowerCase()
                  const fullName = String(c.fullName ?? '').toLowerCase()
                  return name.includes(q) || inn.includes(q) || fullName.includes(q)
                })
                .map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.inn ? ` · ИНН ${c.inn}` : ''}
                  </option>
                ))}
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPaid"
                checked={isPaid}
                onChange={e => setIsPaid(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isPaid" className="text-sm font-medium text-gray-700">
                Оплата получена
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isShipped"
                checked={isShipped}
                onChange={e => setIsShipped(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isShipped" className="text-sm font-medium text-gray-700">
                Отгрузка произведена
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isDocumentsSigned"
                checked={isDocumentsSigned}
                onChange={e => setIsDocumentsSigned(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="isDocumentsSigned" className="text-sm font-medium text-gray-700">
                Документы подписаны
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold text-gray-900">Карты водителей</div>
                <div className="text-sm text-gray-600">
                  Можно добавить несколько карт; заполнение не обязательно сразу
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addDriverCardRow}
                disabled={loading}
              >
                + Карта
              </Button>
            </div>

            {driverCards.length === 0 ? (
              <div className="text-sm text-gray-600">Пока нет карточек</div>
            ) : (
              <div className="space-y-3">
                {driverCards.map(r => (
                  <div key={r.id} className="rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-medium text-gray-900">Карта</div>
                      <button
                        className="text-sm text-red-600 hover:underline"
                        onClick={() => removeDriverCardRow(r.id)}
                        type="button"
                      >
                        Удалить
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">ФИО</label>
                        <Input
                          value={r.driverFullName}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x =>
                                x.id === r.id ? { ...x, driverFullName: e.target.value } : x
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Телефон</label>
                        <Input
                          value={r.driverPhone}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x =>
                                x.id === r.id ? { ...x, driverPhone: e.target.value } : x
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата оформления</label>
                        <Input
                          type="datetime-local"
                          value={r.applicationDateLocal}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x =>
                                x.id === r.id ? { ...x, applicationDateLocal: e.target.value } : x
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата получения</label>
                        <Input
                          type="datetime-local"
                          value={r.receivedByDriverDateLocal}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x =>
                                x.id === r.id
                                  ? { ...x, receivedByDriverDateLocal: e.target.value }
                                  : x
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Дата окончания</label>
                        <Input
                          type="datetime-local"
                          value={r.expiryDateLocal}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x =>
                                x.id === r.id ? { ...x, expiryDateLocal: e.target.value } : x
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Номер карты</label>
                        <Input
                          value={r.cardNumber}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x => (x.id === r.id ? { ...x, cardNumber: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Пин‑пак 1</label>
                        <Input
                          value={r.pin1}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x => (x.id === r.id ? { ...x, pin1: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Пин‑пак 2</label>
                        <Input
                          value={r.pin2}
                          onChange={e =>
                            setDriverCards(p =>
                              p.map(x => (x.id === r.id ? { ...x, pin2: e.target.value } : x))
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Товары/услуги</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddItem('product')}
                disabled={loading}
              >
                + Товар
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openAddItem('service')}
                disabled={loading}
              >
                + Услуга
              </Button>
            </div>
          </div>

          {orderItems.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-2 text-left">Название</th>
                    <th className="px-3 py-2 text-right">Кол-во</th>
                    <th className="px-3 py-2 text-right">Цена (с НДС)</th>
                    <th className="px-3 py-2 text-right">Сумма</th>
                    <th className="px-3 py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {orderItems.map(item => (
                    <tr key={item.id} className="border-t border-gray-100">
                      <td className="px-3 py-2 text-gray-900">{item.name}</td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.quantity} {item.unit ?? ''}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-700">
                        {item.price.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ₽
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-gray-900">
                        {item.totalAmount.toLocaleString('ru-RU', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        ₽
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          disabled={loading}
                        >
                          Удалить
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right font-semibold text-gray-900">
                      Итого:
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-lg text-gray-900">
                      {totalAmount.toLocaleString('ru-RU', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{' '}
                      ₽
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <p className="text-gray-500">Добавьте товары или услуги в заказ</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
        <Button variant="ghost" onClick={() => router.back()} disabled={loading}>
          Отмена
        </Button>
        <Button
          variant="gradient"
          onClick={saveOrder}
          isLoading={loading}
          disabled={!customerId || orderItems.length === 0}
        >
          Создать заказ
        </Button>
      </div>

      <Modal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        title={`Добавить ${itemType === 'product' ? 'товар' : 'услугу'}`}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Поиск"
            value={itemSearch}
            onChange={e => setItemSearch(e.target.value)}
            placeholder="Поиск: название / SKU / цена"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {itemType === 'product' ? 'Товар' : 'Услуга'} *
            </label>
            {itemSearch.trim().length < 2 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Введите минимум 2 символа, чтобы увидеть варианты
              </div>
            ) : filteredCatalog.filter(item => item.vatRate !== undefined).length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
                Ничего не найдено
              </div>
            ) : (
              <div className="max-h-64 overflow-auto rounded-xl border-2 border-gray-200 bg-white">
                {filteredCatalog
                  .filter(item => item.vatRate !== undefined)
                  .slice(0, 12)
                  .map(item => {
                    const isSelected = item.id === selectedItemId
                    const price = parseFloat(item.price)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id)
                          setItemPrice('')
                        }}
                        className={[
                          'w-full text-left px-4 py-3 border-t border-gray-100 first:border-t-0',
                          'hover:bg-gray-50 transition-colors',
                          isSelected ? 'bg-blue-50' : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 truncate">{item.name}</div>
                            <div className="text-xs text-gray-500">
                              {item.sku ? `SKU: ${item.sku}` : '—'}
                            </div>
                          </div>
                          <div className="shrink-0 text-sm font-medium text-gray-900">
                            {Number.isFinite(price)
                              ? price.toLocaleString('ru-RU', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              : String(item.price)}{' '}
                            ₽
                          </div>
                        </div>
                      </button>
                    )
                  })}
              </div>
            )}
          </div>
          <Input
            label="Количество"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            value={itemQuantity}
            onChange={e => setItemQuantity(e.target.value)}
            placeholder="1"
            required
          />
          <Input
            label="Цена (с НДС, можно изменить)"
            type="number"
            step="0.01"
            value={itemPrice}
            onChange={e => setItemPrice(e.target.value)}
            placeholder="0.00"
            required
            disabled={!selectedItemId}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsItemModalOpen(false)}>
              Отмена
            </Button>
            <Button
              variant="gradient"
              onClick={addItem}
              disabled={!selectedItemId || !itemQuantity || !itemPrice}
            >
              Добавить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        title="Новый клиент"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Наименование / ФИО *"
            value={newCustomerName}
            onChange={e => setNewCustomerName(e.target.value)}
          />
          <Input
            label="ИНН"
            value={newCustomerInn}
            onChange={e => setNewCustomerInn(e.target.value)}
          />
          <Input
            label="Телефон"
            value={newCustomerPhone}
            onChange={e => setNewCustomerPhone(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="ghost"
              onClick={() => setIsCustomerModalOpen(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button variant="gradient" onClick={quickCreateCustomer} isLoading={loading}>
              Создать и выбрать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
