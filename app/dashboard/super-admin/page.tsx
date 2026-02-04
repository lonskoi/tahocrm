'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Globe, DollarSign, BarChart3, Settings } from 'lucide-react'

export default function SuperAdminDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Панель супер-администратора</h1>
        <p className="text-gray-600 text-lg">Общая статистика по регионам, управление ценами</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-600" />
              Статистика по регионам
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-12">
                <Globe className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Агрегированная статистика</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Управление ценами
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-12">
                <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Виджет закупок</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-600" />
            Общая статистика платформы
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Мастерских</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Пользователей</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Заказов</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">0 ₽</div>
              <div className="text-sm text-gray-600">Оборот</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
