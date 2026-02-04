'use client'

import * as React from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { UniversalAddButton } from '@/components/universal-add-button'
import { SmartSearch } from '@/components/smart-search'
import {
  LayoutDashboard,
  CheckSquare,
  BarChart3,
  LogOut,
  User,
  Users,
  Building2,
  Car,
  Cpu,
  CreditCard,
  Receipt,
  FolderOpen,
  Settings,
  Menu,
  X,
  ShoppingCart,
  Package,
  ListChecks,
} from 'lucide-react'
import { useState } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  basePath?: string
  area?: 'crm' | 'platform'
}

type GlobalSearchResults = {
  vehicles: unknown[]
  orders: unknown[]
  tachographs: unknown[]
  skzi: unknown[]
  cards: unknown[]
  customers: unknown[]
}

export function DashboardLayout({
  children,
  basePath = '/dashboard',
  area = 'crm',
}: DashboardLayoutProps) {
  const { data: session } = useSession()
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [uiModules, setUiModules] = useState<Record<string, boolean> | null>(null)

  const [searchResults, setSearchResults] = useState<GlobalSearchResults | null>(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const searchAbortRef = React.useRef<AbortController | null>(null)
  const searchLastQueryRef = React.useRef<string>('')

  // Load tenant UI config (best-effort). If it fails, default is "show all".
  // Note: we intentionally keep it simple for MVP.
  React.useEffect(() => {
    if (area !== 'crm') return
    if (uiModules) return
    fetch('/api/ui-config')
      .then(r => r.json())
      .then(cfg => {
        if (cfg?.modules && typeof cfg.modules === 'object')
          setUiModules(cfg.modules as Record<string, boolean>)
      })
      .catch(() => {})
  }, [area, uiModules])

  const crmNavigation = [
    {
      name: 'Главная',
      href: `${basePath}`,
      icon: LayoutDashboard,
      roles: ['TENANT_ADMIN', 'MANAGER', 'MASTER', 'CARD_SPECIALIST', 'DIRECTOR', 'CLIENT'],
    },
    {
      name: 'Клиенты',
      href: `${basePath}/customers`,
      icon: Building2,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER', 'CARD_SPECIALIST'],
      moduleKey: 'customers',
    },
    {
      name: 'ТС',
      href: `${basePath}/vehicles`,
      icon: Car,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER', 'CARD_SPECIALIST'],
      moduleKey: 'vehicles',
    },
    {
      name: 'Оборудование',
      href: `${basePath}/equipment`,
      icon: Cpu,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'],
      moduleKey: 'equipment',
    },
    {
      name: 'Чекпоинты замены СКЗИ',
      href: `${basePath}/skzi-wizard`,
      icon: ListChecks,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER'],
      moduleKey: 'skzi-wizard',
    },
    {
      name: 'Заказы покупателей',
      href: `${basePath}/customer-orders`,
      icon: ShoppingCart,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'],
      moduleKey: 'customer-orders',
    },
    {
      name: 'Карты водителей',
      href: `${basePath}/driver-cards`,
      icon: CreditCard,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'CARD_SPECIALIST'],
      moduleKey: 'driver-cards',
    },
    {
      name: 'Товары/услуги',
      href: `${basePath}/products-services`,
      icon: Package,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'],
      moduleKey: 'products-services',
    },
    {
      name: 'Счета',
      href: `${basePath}/invoices`,
      icon: Receipt,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER'],
      moduleKey: 'invoices',
    },
    {
      name: 'Документы',
      href: `${basePath}/documents`,
      icon: FolderOpen,
      roles: ['TENANT_ADMIN', 'DIRECTOR', 'MANAGER', 'MASTER', 'CARD_SPECIALIST'],
      moduleKey: 'documents',
    },
    {
      name: 'Задачи',
      href: `${basePath}/tasks`,
      icon: CheckSquare,
      roles: ['TENANT_ADMIN', 'MANAGER', 'MASTER', 'CARD_SPECIALIST', 'DIRECTOR'],
    },
    {
      name: 'Пользователи',
      href: `${basePath}/users`,
      icon: Users,
      roles: ['TENANT_ADMIN'],
      moduleKey: 'users',
    },
    {
      name: 'Настройки',
      href: `${basePath}/settings`,
      icon: Settings,
      roles: ['TENANT_ADMIN'],
      moduleKey: 'settings',
    },
  ]

  const platformNavigation = [
    { name: 'Мастерские', href: `${basePath}/tenants`, icon: BarChart3, roles: ['SUPER_ADMIN'] },
  ]

  const navigation = area === 'platform' ? platformNavigation : crmNavigation

  const userRole = String(session?.user?.role ?? '').trim()
  const filteredNav = navigation
    .filter(item => item.roles.includes(userRole))
    .filter(item => {
      if (area !== 'crm') return true
      if (!uiModules) return true
      const key = (item as { moduleKey?: string }).moduleKey
      if (!key) return true
      return uiModules[key] !== false
    })

  const handleSearch = React.useCallback(async (query: string) => {
    const q = query.trim()
    searchLastQueryRef.current = q

    // Cancel in-flight request (if any)
    if (searchAbortRef.current) {
      searchAbortRef.current.abort()
      searchAbortRef.current = null
    }

    if (!q) {
      setSearchError('')
      setSearchLoading(false)
      setSearchResults(null)
      return
    }

    const controller = new AbortController()
    searchAbortRef.current = controller

    setSearchLoading(true)
    setSearchError('')

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
      const data = await res.json()

      if (searchLastQueryRef.current !== q) return

      if (!res.ok) {
        setSearchResults(null)
        setSearchError(data?.error || 'Поиск недоступен')
        return
      }

      setSearchResults(data as GlobalSearchResults)
    } catch (e) {
      if (controller.signal.aborted) return
      if (searchLastQueryRef.current !== q) return
      setSearchResults(null)
      setSearchError(e instanceof Error ? e.message : String(e))
    } finally {
      if (searchLastQueryRef.current === q) setSearchLoading(false)
    }
  }, [])

  const handleCreateOrder = (data: {
    comment: string
    vehicleInfo?: { govNumber?: string; type?: string }
  }) => {
    // TODO: Реализовать создание заказа
    console.log('Create order:', data)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-purple-50/30">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl shadow-lg border-b border-gray-200/50 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <Link href={basePath} className="flex items-center gap-2 group">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                  tahoCRM
                </span>
              </Link>
            </div>

            <div className="flex-1 max-w-xl mx-4 hidden md:block">
              <SmartSearch
                basePath={basePath}
                onSearch={handleSearch}
                results={searchResults}
                loading={searchLoading}
                error={searchError}
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-50">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
                  <p className="text-xs text-gray-500">{session?.user?.role}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut()}
                className="hidden sm:flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden lg:inline">Выход</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`
            fixed lg:static left-0 z-30
            top-16 bottom-0 lg:top-auto lg:bottom-auto
            w-64 bg-white/80 backdrop-blur-xl shadow-xl lg:shadow-none
            border-r border-gray-200/50
            transform transition-transform duration-300 ease-in-out
            ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          `}
        >
          <nav className="p-4 space-y-2 h-full overflow-y-auto">
            {filteredNav.map((item, index) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/')
              const Icon = item.icon
              return (
                <motion.div
                  key={item.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`
                      flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                      transition-all duration-200 group
                      ${
                        isActive
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/50'
                          : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                      }
                    `}
                  >
                    <Icon
                      className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-gray-700'}`}
                    />
                    <span>{item.name}</span>
                  </Link>
                </motion.div>
              )
            })}
          </nav>
        </aside>

        {/* Mobile Menu Overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Universal Add Button (CRM only) */}
      {area === 'crm' ? <UniversalAddButton onCreateOrder={handleCreateOrder} /> : null}
    </div>
  )
}
