'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TaskStatus } from '@prisma/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { CheckCircle, Clock, AlertCircle, User, Calendar, LucideIcon } from 'lucide-react'

interface Task {
  id: string
  title: string
  description: string | null
  status: TaskStatus
  priority: number
  dueDate: string | null
  completedAt: string | null
  confirmedAt: string | null
  creator: { name: string }
  assignee: { name: string } | null
}

function extractDriverCardRequestId(description?: string | null): string | null {
  if (!description) return null
  const m = description.match(/driverCardRequestId:([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

export default function TasksPage() {
  const { data: session } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTasks()
  }, [])

  const fetchTasks = async () => {
    try {
      const response = await fetch('/api/tasks')
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/complete`, {
        method: 'POST',
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error completing task:', error)
    }
  }

  const handleConfirm = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/confirm`, {
        method: 'POST',
      })
      if (response.ok) {
        fetchTasks()
      }
    } catch (error) {
      console.error('Error confirming task:', error)
    }
  }

  const getStatusConfig = (status: TaskStatus) => {
    const configs: Record<
      TaskStatus,
      { color: string; bgColor: string; icon: LucideIcon; label: string }
    > = {
      PENDING: {
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
        icon: Clock,
        label: 'Ожидает',
      },
      IN_PROGRESS: {
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
        icon: Clock,
        label: 'В работе',
      },
      COMPLETED: {
        color: 'text-green-700',
        bgColor: 'bg-green-100',
        icon: CheckCircle,
        label: 'Выполнено',
      },
      CONFIRMED: {
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
        icon: CheckCircle,
        label: 'Подтверждено',
      },
      CANCELLED: {
        color: 'text-red-700',
        bgColor: 'bg-red-100',
        icon: AlertCircle,
        label: 'Отменено',
      },
    }
    return configs[status]
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Задачи</h1>
        <p className="text-gray-600 text-lg">Система задач с двойным подтверждением</p>
      </motion.div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Нет задач</h3>
            <p className="text-gray-500">Создайте первую задачу, используя кнопку «+»</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task, index) => {
            const statusConfig = getStatusConfig(task.status)
            const StatusIcon = statusConfig.icon
            const tenantId = (session?.user as any)?.tenantId as string | undefined
            const driverCardRequestId = extractDriverCardRequestId(task.description)

            return (
              <motion.div
                key={task.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card hover className="border-l-4 border-l-blue-600">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                          <span
                            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {statusConfig.label}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-gray-600 mb-4">{task.description}</p>
                        )}

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4" />
                            <span>
                              Создатель:{' '}
                              <span className="font-medium text-gray-700">{task.creator.name}</span>
                            </span>
                          </div>
                          {task.assignee && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>
                                Исполнитель:{' '}
                                <span className="font-medium text-gray-700">
                                  {task.assignee.name}
                                </span>
                              </span>
                            </div>
                          )}
                          {task.dueDate && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(task.dueDate).toLocaleDateString('ru-RU')}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {tenantId && driverCardRequestId ? (
                          <Link href={`/crm/${tenantId}/driver-cards/${driverCardRequestId}`}>
                            <Button size="sm" variant="outline">
                              Открыть карту
                            </Button>
                          </Link>
                        ) : null}
                        {task.status === 'PENDING' &&
                          task.assignee?.name === session?.user?.name && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(task.id)}
                              variant="gradient"
                            >
                              Выполнено
                            </Button>
                          )}
                        {task.status === 'COMPLETED' &&
                          task.creator.name === session?.user?.name && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleConfirm(task.id)}
                              className="border-green-500 text-green-700 hover:bg-green-50"
                            >
                              Подтвердить
                            </Button>
                          )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
