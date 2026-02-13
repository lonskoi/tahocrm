'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { formatDateTime, localInputToIso, pickBusinessDate } from '@/lib/datetime'

type DocumentRow = {
  id: string
  type: string
  title: string | null
  fileUrl: string
  fileName: string
  createdAt: string
  updatedAt: string
  businessCreatedAt: string | null
  businessUpdatedAt: string | null
}

export default function DocumentsPage() {
  const [items, setItems] = useState<DocumentRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [type, setType] = useState('OTHER')
  const [title, setTitle] = useState('')
  const [fileName, setFileName] = useState('')
  const [fileUrl, setFileUrl] = useState('')
  const [businessCreatedAtLocal, setBusinessCreatedAtLocal] = useState('')
  const [businessUpdatedAtLocal, setBusinessUpdatedAtLocal] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/documents')
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось загрузить документы')
      setItems(data as DocumentRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    if (!needle) return items
    return items.filter(d => {
      return (
        (d.type ?? '').toLowerCase().includes(needle) ||
        (d.title ?? '').toLowerCase().includes(needle) ||
        d.fileName.toLowerCase().includes(needle)
      )
    })
  }, [items, q])

  function openCreate() {
    setType('OTHER')
    setTitle('')
    setFileName('')
    setFileUrl('')
    setBusinessCreatedAtLocal('')
    setBusinessUpdatedAtLocal('')
    setIsModalOpen(true)
  }

  async function create() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title: title || null,
          fileName,
          fileUrl,
          businessCreatedAt: localInputToIso(businessCreatedAtLocal),
          businessUpdatedAt: localInputToIso(businessUpdatedAtLocal),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось создать документ')
      setIsModalOpen(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Документы</h1>
          <p className="text-gray-600">
            Пока — хранение ссылок/файлов и привязки, генерация будет следующим этапом
          </p>
        </div>
        <Button variant="gradient" onClick={openCreate} disabled={loading}>
          Добавить документ
        </Button>
      </div>

      <div className="max-w-xl">
        <Input
          label="Поиск"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Тип, название, файл"
        />
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-gray-700">
            <tr>
              <th className="px-4 py-3 text-left">Тип</th>
              <th className="px-4 py-3 text-left">Название</th>
              <th className="px-4 py-3 text-left">Файл</th>
              <th className="px-4 py-3 text-left">Дата/время</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="border-t border-gray-100">
                <td className="px-4 py-3 text-gray-700">{d.type}</td>
                <td className="px-4 py-3 text-gray-900">{d.title ?? '—'}</td>
                <td className="px-4 py-3">
                  <a
                    className="text-blue-600 hover:underline"
                    href={d.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {d.fileName}
                  </a>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <div>
                    Создано: {formatDateTime(pickBusinessDate(d.businessCreatedAt, d.createdAt))}
                  </div>
                  <div>
                    Обновлено: {formatDateTime(pickBusinessDate(d.businessUpdatedAt, d.updatedAt))}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={4}>
                  {loading ? 'Загрузка...' : 'Документов пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Добавить документ"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Тип"
            value={type}
            onChange={e => setType(e.target.value)}
            placeholder="INVOICE / UPD / ACT / ..."
          />
          <Input
            label="Название"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Опционально"
          />
          <Input
            label="Имя файла"
            value={fileName}
            onChange={e => setFileName(e.target.value)}
            placeholder="Например: akt.pdf"
          />
          <Input
            label="URL файла"
            value={fileUrl}
            onChange={e => setFileUrl(e.target.value)}
            placeholder="https://..."
          />
          <Input
            label="Дата/время создания (бизнес)"
            type="datetime-local"
            value={businessCreatedAtLocal}
            onChange={e => setBusinessCreatedAtLocal(e.target.value)}
          />
          <Input
            label="Дата/время изменения (бизнес)"
            type="datetime-local"
            value={businessUpdatedAtLocal}
            onChange={e => setBusinessUpdatedAtLocal(e.target.value)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={create} isLoading={loading}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
