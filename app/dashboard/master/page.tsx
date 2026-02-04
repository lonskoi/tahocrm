'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wrench, Camera, Smartphone } from 'lucide-react'

export default function MasterDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Рабочий стол мастера</h1>
        <p className="text-gray-600 text-lg">Техническая работа, фотофиксация, ввод параметров</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" />
              Активные заказы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Wrench className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Список заказов в работе будет здесь</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-600" />
              Мобильная версия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
                <Camera className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="font-semibold text-gray-900">Фотофиксация</p>
                  <p className="text-sm text-gray-600">
                    Используйте мобильный браузер для доступа к камере
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-200">
                <Wrench className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="font-semibold text-gray-900">Ввод параметров</p>
                  <p className="text-sm text-gray-600">W, K, L - технические параметры</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
