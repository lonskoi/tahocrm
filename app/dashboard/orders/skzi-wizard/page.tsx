'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  FileText,
  CreditCard,
  Car,
  Wrench,
  CheckSquare,
  Camera,
  Printer,
} from 'lucide-react'

// Этапы workflow замены СКЗИ
const WORKFLOW_STEPS = [
  {
    id: 'order_info',
    title: 'Информация о заказе',
    icon: FileText,
    description: 'Сбор данных о клиенте и оплате',
  },
  {
    id: 'payment',
    title: 'Оплата',
    icon: CreditCard,
    description: 'Выставление счета и получение оплаты',
  },
  {
    id: 'appointment',
    title: 'Запись на визит',
    icon: Clock,
    description: 'Согласование времени визита',
  },
  {
    id: 'preparation',
    title: 'Подготовка',
    icon: Car,
    description: 'Проверка МЧД и снятие тахографа',
  },
  {
    id: 'activation_check',
    title: 'Проверка активаций',
    icon: CheckSquare,
    description: 'Проверка действующих активаций (10 мин)',
  },
  {
    id: 'tachograph_check',
    title: 'Проверка тахографа',
    icon: Wrench,
    description: 'Проверка ПО и батарейки',
  },
  {
    id: 'skzi_replacement',
    title: 'Замена блока СКЗИ',
    icon: Wrench,
    description: 'Физическая замена блока',
  },
  {
    id: 'deactivation',
    title: 'Деактивация',
    icon: CheckSquare,
    description: 'Деактивация старых активаций',
  },
  {
    id: 'activation_prep',
    title: 'Подготовка активации',
    icon: FileText,
    description: 'Сканирование документов и создание заявки',
  },
  {
    id: 'activation_review',
    title: 'Ожидание проверки',
    icon: Clock,
    description: 'Проверка заявки (5 мин - 5 дней)',
  },
  {
    id: 'signature_statement',
    title: 'Заявление на подпись',
    icon: Camera,
    description: 'Подпись и фото заявления',
  },
  {
    id: 'activation',
    title: 'Активация',
    icon: CheckCircle,
    description: 'Активация через АРМ',
  },
  {
    id: 'receipt',
    title: 'Расписка',
    icon: FileText,
    description: 'Расписка в получении ключа',
  },
  {
    id: 'final_activation',
    title: 'Финальная активация',
    icon: CheckCircle,
    description: 'Ввод данных в тахограф',
  },
  {
    id: 'completion',
    title: 'Завершение',
    icon: Printer,
    description: 'Печать документов и установка',
  },
]

export default function SKZIWizardPage() {
  const [currentStep, setCurrentStep] = useState(0)
  type FormData = {
    organizationName?: string
    inn?: string
    paymentType?: string
    taxType?: string
    govNumber?: string
    paymentReceived?: boolean
    activationCheckCompleted?: boolean
    hasActiveActivations?: boolean
  }
  const [formData, setFormData] = useState<FormData>({})

  const currentStepData = WORKFLOW_STEPS[currentStep]!
  const CurrentIcon = currentStepData.icon

  const handleNext = () => {
    if (currentStep < WORKFLOW_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateFormData = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }))
  }

  const renderStepContent = () => {
    switch (currentStepData.id) {
      case 'order_info':
        return (
          <div className="space-y-4">
            <Input
              label="Название организации"
              value={formData.organizationName || ''}
              onChange={e => updateFormData('organizationName', e.target.value)}
              placeholder="ООО 'Транспорт'"
            />
            <Input
              label="ИНН"
              value={formData.inn || ''}
              onChange={e => updateFormData('inn', e.target.value)}
              placeholder="1234567890"
            />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Тип оплаты</label>
                <select
                  className="w-full h-12 rounded-xl border-2 border-gray-200 px-4"
                  value={formData.paymentType || ''}
                  onChange={e => updateFormData('paymentType', e.target.value)}
                >
                  <option value="">Выберите...</option>
                  <option value="cash">Нал</option>
                  <option value="cashless">Безнал</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">НДС</label>
                <select
                  className="w-full h-12 rounded-xl border-2 border-gray-200 px-4"
                  value={formData.taxType || ''}
                  onChange={e => updateFormData('taxType', e.target.value)}
                >
                  <option value="">Выберите...</option>
                  <option value="with_vat">С НДС</option>
                  <option value="without_vat">Без НДС</option>
                </select>
              </div>
            </div>
            <Input
              label="Госномер ТС"
              value={formData.govNumber || ''}
              onChange={e => updateFormData('govNumber', e.target.value)}
              placeholder="А123ВВ77"
            />
          </div>
        )

      case 'payment':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">Если безнал, выставить счет:</p>
              <Button variant="outline" className="w-full">
                Выставить счет
              </Button>
            </div>
            <div className="p-4 bg-green-50 rounded-xl">
              <p className="text-sm text-gray-600 mb-2">После получения оплаты:</p>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.paymentReceived || false}
                  onChange={e => updateFormData('paymentReceived', e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm font-medium">Оплата получена</span>
              </label>
            </div>
          </div>
        )

      case 'activation_check':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                ⏱️ Запрос на проверку активаций отправлен
              </p>
              <p className="text-xs text-yellow-600">Ожидание обработки: ~10 минут</p>
            </div>
            <Button
              variant="outline"
              onClick={() => updateFormData('activationCheckCompleted', true)}
              disabled={formData.activationCheckCompleted}
            >
              {formData.activationCheckCompleted ? 'Проверка завершена' : 'Проверка завершена'}
            </Button>
            {formData.hasActiveActivations && (
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm font-medium text-red-800">
                  ⚠️ Обнаружены действующие активации. Требуется деактивация.
                </p>
              </div>
            )}
          </div>
        )

      default:
        return (
          <div className="text-center py-12">
            <CurrentIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Этап «{currentStepData.title}» будет реализован</p>
          </div>
        )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-4xl font-bold text-gray-900 mb-2">Замена блока СКЗИ</h1>
        <p className="text-gray-600 text-lg">Пошаговый мастер замены блока СКЗИ</p>
      </div>

      {/* Прогресс бар */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">
              Шаг {currentStep + 1} из {WORKFLOW_STEPS.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(((currentStep + 1) / WORKFLOW_STEPS.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / WORKFLOW_STEPS.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Боковая панель с этапами */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Этапы</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {WORKFLOW_STEPS.map((step, index) => {
                  const StepIcon = step.icon
                  const isActive = index === currentStep
                  const isCompleted = index < currentStep

                  return (
                    <button
                      key={step.id}
                      onClick={() => setCurrentStep(index)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-all
                        ${
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                            : isCompleted
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'text-gray-600 hover:bg-gray-50'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4" />
                        ) : (
                          <StepIcon className="w-4 h-4" />
                        )}
                        <span className="text-xs font-medium">{step.title}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Основной контент */}
        <div className="lg:col-span-3">
          <Card hover>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl">
                  <CurrentIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <CardTitle>{currentStepData.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">{currentStepData.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>

              {/* Навигация */}
              <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
                <Button variant="outline" onClick={handlePrevious} disabled={currentStep === 0}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Назад
                </Button>
                <Button
                  variant="gradient"
                  onClick={handleNext}
                  disabled={currentStep === WORKFLOW_STEPS.length - 1}
                >
                  Далее
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
