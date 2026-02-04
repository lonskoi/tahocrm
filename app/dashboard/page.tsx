'use client'

import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import { UserRole } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp,
  FileText,
  Car,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'

export default function DashboardPage() {
  const { data: session } = useSession()
  const role = session?.user?.role

  const getRoleName = (role: UserRole | undefined) => {
    const names: Record<UserRole, string> = {
      SUPER_ADMIN: 'Супер-Админ',
      TENANT_ADMIN: 'Админ мастерской',
      MANAGER: 'Менеджер',
      MASTER: 'Мастер',
      CARD_SPECIALIST: 'Специалист по картам',
      DIRECTOR: 'Руководитель',
      CLIENT: 'Клиент',
    }
    return role ? names[role] : 'Пользователь'
  }

  const stats = [
    {
      title: 'Активные заказы',
      value: '0',
      change: '+0%',
      icon: FileText,
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Задачи',
      value: '0',
      change: '+0%',
      icon: CheckCircle,
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Транспорт',
      value: '0',
      change: '+0%',
      icon: Car,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Дебиторка',
      value: '0 ₽',
      change: '-0%',
      icon: DollarSign,
      color: 'from-orange-500 to-red-500',
      bgColor: 'bg-orange-50',
    },
  ]

  const recentActivities = [
    {
      id: 1,
      type: 'order',
      message: 'Создан новый заказ #12345',
      time: '2 мин назад',
      icon: FileText,
    },
    {
      id: 2,
      type: 'task',
      message: "Задача 'Калибровка' выполнена",
      time: '15 мин назад',
      icon: CheckCircle,
    },
    { id: 3, type: 'vehicle', message: 'Добавлен новый транспорт', time: '1 час назад', icon: Car },
  ]

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold text-gray-900 mb-2">
          Добро пожаловать,{' '}
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {session?.user?.name}
          </span>
          !
        </h1>
        <p className="text-gray-600 text-lg">
          Роль: <span className="font-semibold text-gray-900">{getRoleName(role)}</span>
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card hover gradient className="relative overflow-hidden">
                <div
                  className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.color} opacity-10 rounded-full -mr-16 -mt-16`}
                />
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                  <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} shadow-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
                  <div className="flex items-center gap-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-gray-600">{stat.change}</span>
                    <span className="text-gray-400">за месяц</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Recent Activities & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Последние действия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivities.map((activity, index) => {
                const Icon = activity.icon
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-purple-600" />
              Быстрые действия
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                Создать новый заказ
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-500 hover:text-blue-600 transition-all"
              >
                Добавить транспорт
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full p-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-purple-500 hover:text-purple-600 transition-all"
              >
                Создать задачу
              </motion.button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
