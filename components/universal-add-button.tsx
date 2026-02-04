'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { parseComment } from '@/lib/utils'

interface UniversalAddButtonProps {
  onCreateOrder?: (data: {
    comment: string
    vehicleInfo?: { govNumber?: string; type?: string }
  }) => void
}

export function UniversalAddButton({ onCreateOrder }: UniversalAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [comment, setComment] = useState('')

  const handleSubmit = () => {
    if (!comment.trim()) return

    const parsed = parseComment(comment)

    if (parsed.action === 'create_order' && onCreateOrder) {
      onCreateOrder({
        comment,
        ...(parsed.vehicleInfo ? { vehicleInfo: parsed.vehicleInfo } : {}),
      })
    }

    setComment('')
    setIsOpen(false)
  }

  return (
    <>
      <motion.div
        className="fixed bottom-6 right-6 z-50"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-full shadow-2xl shadow-blue-500/50 flex items-center justify-center hover:shadow-3xl hover:shadow-blue-500/60 transition-all duration-300 group"
        >
          <motion.div animate={{ rotate: isOpen ? 45 : 0 }} transition={{ duration: 0.2 }}>
            <Plus className="w-8 h-8" />
          </motion.div>
        </button>
      </motion.div>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setIsOpen(false)
          setComment('')
        }}
        title="Быстрое создание"
        size="md"
      >
        <div className="space-y-6">
          <div>
            <Input
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder='Например: "Камаз А123ВВ замена СКЗИ"'
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              autoFocus
              label="Комментарий"
            />
            <p className="mt-2 text-xs text-gray-500">
              Система автоматически распознает госномер и тип услуги
            </p>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={handleSubmit} disabled={!comment.trim()}>
              Создать
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
