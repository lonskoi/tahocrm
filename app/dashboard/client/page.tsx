'use client'

import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Car, Calendar, Download, FileText } from 'lucide-react'

export default function ClientDashboard() {
  return (
    <div className="space-y-8 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Личный кабинет клиента</h1>
        <p className="text-gray-600 text-lg">
          Просмотр парка, сроков калибровок, выгрузка ddd-файлов
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card hover>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-600" />
              Мой парк
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <Car className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Список транспортных средств</p>
            </div>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Сроки калибровок и СКЗИ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Ближайшая калибровка</span>
                  <span className="text-sm text-gray-500">-</span>
                </div>
                <p className="text-sm text-gray-600">Календарь предстоящих работ</p>
              </div>
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">Срок СКЗИ</span>
                  <span className="text-sm text-gray-500">-</span>
                </div>
                <p className="text-sm text-gray-600">Контроль сроков блоков</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card hover>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-green-600" />
            Выгрузка документов
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
            >
              <FileText className="w-5 h-5" />
              Выгрузить ddd-файлы
            </motion.button>
            <p className="text-sm text-gray-500 text-center">
              Самостоятельная выгрузка файлов для вашего парка
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
