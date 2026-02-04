'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, Users, ShoppingCart, BarChart3 } from 'lucide-react'

export default function DirectorDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Рабочий стол руководителя</h1>
        <p className="text-gray-600 text-lg">
          Аналитика прибыльности, расчет зарплаты, закупка оборудования
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Прибыльность
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-gray-900 mb-2">0 ₽</div>
              <p className="text-sm text-gray-600">Общая прибыль</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Зарплата мастеров
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-gray-900 mb-2">0 ₽</div>
              <p className="text-sm text-gray-600">Расчет по сдельной/процентной схеме</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
              Закупки
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-gray-900 mb-2">0</div>
              <p className="text-sm text-gray-600">Виджет закупок оборудования</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-600" />
            Детальная аналитика
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-8">
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Заказов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Клиентов</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">0</div>
              <div className="text-sm text-gray-600">Транспорт</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">0%</div>
              <div className="text-sm text-gray-600">Конверсия</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
