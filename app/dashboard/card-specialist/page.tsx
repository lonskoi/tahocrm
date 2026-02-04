'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CreditCard, Calendar, AlertCircle, CheckCircle } from 'lucide-react'

export default function CardSpecialistDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Рабочий стол специалиста по картам
        </h1>
        <p className="text-gray-600 text-lg">
          Учет карт водителей, контроль сроков, сбор документов
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              Всего карт
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-gray-900 mb-2">0</div>
              <p className="text-sm text-gray-600">Карт водителей</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-orange-600" />
              Истекают скоро
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-orange-600 mb-2">0</div>
              <p className="text-sm text-gray-600">В течение 3 месяцев</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              Просрочено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="text-4xl font-bold text-red-600 mb-2">0</div>
              <p className="text-sm text-gray-600">Требуют замены</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-purple-600" />
              Учет карт водителей
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <CreditCard className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Список карт будет здесь</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Контроль сроков
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Срок действия</span>
                  <span className="text-sm text-gray-500">3 года</span>
                </div>
                <p className="text-sm text-gray-600">
                  Карты водителей требуют замены каждые 3 года
                </p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Документы</span>
                  <span className="text-sm text-gray-500">ФСБ</span>
                </div>
                <p className="text-sm text-gray-600">
                  Сбор документов при личном присутствии (требование ФСБ)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
