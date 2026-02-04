'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'

export default function OrdersPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Заказы</h1>
          <p className="text-gray-600 text-lg">Управление заказами и workflow</p>
        </div>
        <Link href="/crm/orders/skzi-wizard">
          <Button variant="gradient" size="lg">
            <Plus className="w-5 h-5 mr-2" />
            Новый заказ (СКЗИ)
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />В работе
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
            <p className="text-sm text-gray-600">Активных заказов</p>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              Ожидают оплаты
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
            <p className="text-sm text-gray-600">Неоплаченных</p>
          </CardContent>
        </Card>

        <Card hover gradient>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Завершено
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 mb-2">0</div>
            <p className="text-sm text-gray-600">За этот месяц</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Список заказов</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Заказы появятся здесь</p>
            <Link href="/crm/orders/skzi-wizard">
              <Button variant="outline" className="mt-4">
                Создать первый заказ
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
