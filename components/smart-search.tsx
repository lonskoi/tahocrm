'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface SmartSearchProps {
  basePath: string
  onSearch: (query: string) => void
  results: {
    vehicles: Array<any>
    orders: Array<any>
    tachographs: Array<any>
    skzi: Array<any>
    cards: Array<any>
    customers: Array<any>
  } | null
  loading?: boolean
  error?: string
  placeholder?: string
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : ''
}

function hasAnyResults(r: SmartSearchProps['results']): boolean {
  if (!r) return false
  return (
    (Array.isArray(r.customers) && r.customers.length > 0) ||
    (Array.isArray(r.vehicles) && r.vehicles.length > 0) ||
    (Array.isArray(r.orders) && r.orders.length > 0) ||
    (Array.isArray(r.tachographs) && r.tachographs.length > 0) ||
    (Array.isArray(r.skzi) && r.skzi.length > 0) ||
    (Array.isArray(r.cards) && r.cards.length > 0)
  )
}

export function SmartSearch({
  basePath,
  onSearch,
  results,
  loading,
  error,
  placeholder = 'Поиск по ИНН, госномеру, VIN, серийному номеру или фамилии...',
}: SmartSearchProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  // Debounced search
  useEffect(() => {
    const q = query
    const t = setTimeout(() => onSearch(q), 250)
    return () => clearTimeout(t)
  }, [query, onSearch])

  // Close on outside click / Esc
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      const el = rootRef.current
      if (!el) return
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  const showDropdown = open && Boolean(query.trim())

  const customers = useMemo(() => (results?.customers ?? []).slice(0, 8), [results])
  const vehicles = useMemo(() => (results?.vehicles ?? []).slice(0, 8), [results])
  const orders = useMemo(() => (results?.orders ?? []).slice(0, 6), [results])
  const tachographs = useMemo(() => (results?.tachographs ?? []).slice(0, 6), [results])
  const skzi = useMemo(() => (results?.skzi ?? []).slice(0, 6), [results])
  const cards = useMemo(() => (results?.cards ?? []).slice(0, 6), [results])

  return (
    <div ref={rootRef} className="relative w-full">
      <div className="relative">
        <Input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full pr-10"
          icon={<Search className="w-5 h-5" />}
        />
        {query && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => {
              setQuery('')
              onSearch('')
              setOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </motion.button>
        )}
      </div>

      {showDropdown && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50"
        >
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          ) : loading ? (
            <p className="text-sm text-gray-500">Ищем…</p>
          ) : !hasAnyResults(results) ? (
            <p className="text-sm text-gray-500">Ничего не найдено</p>
          ) : (
            <div className="space-y-4">
              {customers.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Клиенты ({customers.length})
                  </div>
                  <div className="space-y-1">
                    {customers.map(c => (
                      <Link
                        key={safeStr(c?.id) || JSON.stringify(c)}
                        href={`${basePath}/customers/${safeStr(c?.id)}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {safeStr(c?.name) || 'Клиент'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {[safeStr(c?.inn), safeStr(c?.phone)].filter(Boolean).join(' · ') || '—'}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {vehicles.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Транспорт ({vehicles.length})
                  </div>
                  <div className="space-y-1">
                    {vehicles.map(v => (
                      <Link
                        key={safeStr(v?.id) || JSON.stringify(v)}
                        href={`${basePath}/vehicles/${safeStr(v?.id)}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {safeStr(v?.govNumber) || 'ТС'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {[safeStr(v?.vin), safeStr(v?.ownerName)].filter(Boolean).join(' · ') ||
                            '—'}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {orders.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Заказы ({orders.length})
                  </div>
                  <div className="space-y-1">
                    {orders.map(o => (
                      <Link
                        key={safeStr(o?.id) || JSON.stringify(o)}
                        href={`${basePath}/customer-orders/${safeStr(o?.id)}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {safeStr(o?.number) || 'Заказ'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {safeStr(o?.description) || '—'}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {tachographs.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Оборудование ({tachographs.length})
                  </div>
                  <div className="space-y-1">
                    {tachographs.map(t => (
                      <Link
                        key={safeStr(t?.id) || JSON.stringify(t)}
                        href={`${basePath}/equipment/${safeStr(t?.id)}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {safeStr(t?.serialNumber) || 'Тахограф'}
                        </div>
                        <div className="text-xs text-gray-500">{safeStr(t?.model) || '—'}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}

              {skzi.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    СКЗИ ({skzi.length})
                  </div>
                  <div className="space-y-1">
                    {skzi.map(s => {
                      const serial = safeStr(s?.serialNumber)
                      return (
                        <Link
                          key={safeStr(s?.id) || JSON.stringify(s)}
                          href={`${basePath}/equipment?q=${encodeURIComponent(serial)}`}
                          onClick={() => setOpen(false)}
                          className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                        >
                          <div className="text-sm font-medium text-gray-900">
                            {serial || 'СКЗИ'}
                          </div>
                          <div className="text-xs text-gray-500">Открыть в «Оборудование»</div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              {cards.length > 0 ? (
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Карты водителей ({cards.length})
                  </div>
                  <div className="space-y-1">
                    {cards.map(c => (
                      <Link
                        key={safeStr(c?.id) || JSON.stringify(c)}
                        href={`${basePath}/driver-cards/${safeStr(c?.id)}`}
                        onClick={() => setOpen(false)}
                        className="block rounded-lg px-3 py-2 hover:bg-gray-50"
                      >
                        <div className="text-sm font-medium text-gray-900">
                          {safeStr(c?.driverFullName || c?.driverName) || 'Карта'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {safeStr(c?.driverPhone) || '—'}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </motion.div>
      )}
    </div>
  )
}
