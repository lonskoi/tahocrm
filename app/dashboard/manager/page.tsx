'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, DollarSign, TrendingUp } from 'lucide-react'

export default function ManagerDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Рабочий стол менеджера</h1>
        <p className="text-gray-600 text-lg">
          Работа с клиентами, выставление счетов, контроль дебиторки
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Последние заказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Заказы появятся здесь</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Неоплаченные счета
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Список счетов будет здесь</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card hover gradient>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            Статистика дебиторки
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-1">0 ₽</div>
              <div className="text-sm text-gray-600">Всего дебиторка</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-1">0 ₽</div>
              <div className="text-sm text-gray-600">Оплачено</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-1">0 ₽</div>
              <div className="text-sm text-gray-600">Просрочено</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
