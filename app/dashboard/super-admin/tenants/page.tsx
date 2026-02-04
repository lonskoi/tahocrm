'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import {
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Ban,
  Unlock,
  DollarSign,
  Users,
  Search,
} from 'lucide-react'

interface Tenant {
  id: string
  name: string
  inn: string | null
  email: string | null
  subscriptionStatus: string
  subscriptionPlan: string
  subscriptionEndDate: string | null
  isActive: boolean
  isBlocked: boolean
  blockedReason: string | null
  currentUsersCount: number
  maxUsers: number
  createdAt: string
}

export default function TenantsManagementPage() {
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false)
  const [blockReason, setBlockReason] = useState('')

  useEffect(() => {
    fetchTenants()
  }, [])

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants')
      if (response.ok) {
        const data = await response.json()
        setTenants(data)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBlock = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/block`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: blockReason }),
      })
      if (response.ok) {
        fetchTenants()
        setIsBlockModalOpen(false)
        setBlockReason('')
      }
    } catch (error) {
      console.error('Error blocking tenant:', error)
    }
  }

  const handleUnblock = async (tenantId: string) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/unblock`, {
        method: 'POST',
      })
      if (response.ok) {
        fetchTenants()
      }
    } catch (error) {
      console.error('Error unblocking tenant:', error)
    }
  }

  const getStatusColor = (status: string, isBlocked: boolean) => {
    if (isBlocked) return 'bg-red-100 text-red-800'
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'TRIAL':
        return 'bg-blue-100 text-blue-800'
      case 'SUSPENDED':
        return 'bg-yellow-100 text-yellow-800'
      case 'EXPIRED':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string, isBlocked: boolean) => {
    if (isBlocked) return <Ban className="w-4 h-4" />
    switch (status) {
      case 'ACTIVE':
        return <CheckCircle className="w-4 h-4" />
      case 'SUSPENDED':
        return <AlertCircle className="w-4 h-4" />
      default:
        return <XCircle className="w-4 h-4" />
    }
  }

  const filteredTenants = tenants.filter(
    tenant =>
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.inn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Управление мастерскими</h1>
          <p className="text-gray-600 text-lg">Контроль подписок, оплаты и доступов</p>
        </div>
        <Button variant="gradient" size="lg">
          <Building2 className="w-5 h-5 mr-2" />
          Добавить мастерскую
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-blue-600" />
              Всего
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">{tenants.length}</div>
            <p className="text-sm text-gray-600">Мастерских</p>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Активных
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {tenants.filter(t => t.subscriptionStatus === 'ACTIVE' && !t.isBlocked).length}
            </div>
            <p className="text-sm text-gray-600">С активной подпиской</p>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-600" />
              Пробный период
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {tenants.filter(t => t.subscriptionStatus === 'TRIAL').length}
            </div>
            <p className="text-sm text-gray-600">На триале</p>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="w-5 h-5 text-red-600" />
              Заблокировано
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {tenants.filter(t => t.isBlocked).length}
            </div>
            <p className="text-sm text-gray-600">Заблокированных</p>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию, ИНН или email..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Список мастерских */}
      <Card>
        <CardHeader>
          <CardTitle>Список мастерских</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTenants.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Мастерские не найдены</p>
              </div>
            ) : (
              filteredTenants.map(tenant => (
                <motion.div
                  key={tenant.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 bg-white rounded-xl border-2 border-gray-200 hover:border-blue-500 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{tenant.name}</h3>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.subscriptionStatus, tenant.isBlocked)}`}
                        >
                          {getStatusIcon(tenant.subscriptionStatus, tenant.isBlocked)}
                          {tenant.isBlocked ? 'Заблокировано' : tenant.subscriptionStatus}
                        </span>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">
                          {tenant.subscriptionPlan}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">ИНН:</span>
                          <span className="ml-2 font-medium">{tenant.inn || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Email:</span>
                          <span className="ml-2 font-medium">{tenant.email || '—'}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Пользователи:</span>
                          <span className="ml-2 font-medium">
                            {tenant.currentUsersCount} / {tenant.maxUsers}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Подписка до:</span>
                          <span className="ml-2 font-medium">
                            {tenant.subscriptionEndDate
                              ? new Date(tenant.subscriptionEndDate).toLocaleDateString('ru-RU')
                              : '—'}
                          </span>
                        </div>
                      </div>

                      {tenant.isBlocked && tenant.blockedReason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg">
                          <p className="text-sm text-red-800">
                            <strong>Причина блокировки:</strong> {tenant.blockedReason}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {tenant.isBlocked ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnblock(tenant.id)}
                          className="border-green-500 text-green-700 hover:bg-green-50"
                        >
                          <Unlock className="w-4 h-4 mr-2" />
                          Разблокировать
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTenant(tenant)
                            setIsBlockModalOpen(true)
                          }}
                          className="border-red-500 text-red-700 hover:bg-red-50"
                        >
                          <Ban className="w-4 h-4 mr-2" />
                          Заблокировать
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        <DollarSign className="w-4 h-4 mr-2" />
                        Платежи
                      </Button>
                      <Button variant="outline" size="sm">
                        <Users className="w-4 h-4 mr-2" />
                        Детали
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Модалка блокировки */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => {
          setIsBlockModalOpen(false)
          setBlockReason('')
        }}
        title="Заблокировать мастерскую"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Вы собираетесь заблокировать мастерскую <strong>{selectedTenant?.name}</strong>. Это
            отключит доступ всех пользователей этой мастерской к системе.
          </p>
          <div>
            <label className="block text-sm font-medium mb-2">Причина блокировки</label>
            <textarea
              value={blockReason}
              onChange={e => setBlockReason(e.target.value)}
              className="w-full h-24 p-3 border-2 border-gray-200 rounded-xl resize-none focus:border-blue-500 focus:outline-none"
              placeholder="Укажите причину блокировки..."
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setIsBlockModalOpen(false)
                setBlockReason('')
              }}
            >
              Отмена
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTenant && handleBlock(selectedTenant.id)}
              disabled={!blockReason.trim()}
            >
              Заблокировать
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
