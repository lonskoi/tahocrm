'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import type { UserRole } from '@prisma/client'

type UserRow = {
  id: string
  email: string
  name: string
  phone: string | null
  role: UserRole
  tenantId: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  lastLogin: string | null
}

const ROLE_OPTIONS: Array<{ value: Exclude<UserRole, 'SUPER_ADMIN'>; label: string }> = [
  { value: 'TENANT_ADMIN', label: 'Админ мастерской' },
  { value: 'DIRECTOR', label: 'Руководитель' },
  { value: 'MANAGER', label: 'Менеджер' },
  { value: 'MASTER', label: 'Мастер' },
  { value: 'CARD_SPECIALIST', label: 'Специалист по картам' },
  { value: 'CLIENT', label: 'Клиент' },
]

export default function UsersPage() {
  const params = useParams<{ tenantId: string }>()
  const tenantId = params?.tenantId

  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editing, setEditing] = useState<UserRow | null>(null)

  const [formEmail, setFormEmail] = useState('')
  const [formPassword, setFormPassword] = useState('')
  const [formName, setFormName] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formRole, setFormRole] = useState<Exclude<UserRole, 'SUPER_ADMIN'>>('MANAGER')
  const [formIsActive, setFormIsActive] = useState(true)

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => a.createdAt.localeCompare(b.createdAt) * -1)
  }, [users])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/users', { method: 'GET' })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.error || 'Не удалось загрузить пользователей')
      }
      setUsers(data as UserRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  function openCreate() {
    setEditing(null)
    setFormEmail('')
    setFormPassword('')
    setFormName('')
    setFormPhone('')
    setFormRole('MANAGER')
    setFormIsActive(true)
    setIsModalOpen(true)
  }

  function openEdit(u: UserRow) {
    setEditing(u)
    setFormEmail(u.email)
    setFormPassword('') // keep empty unless changing
    setFormName(u.name)
    setFormPhone(u.phone ?? '')
    setFormRole(u.role as Exclude<UserRole, 'SUPER_ADMIN'>)
    setFormIsActive(u.isActive)
    setIsModalOpen(true)
  }

  async function save() {
    setLoading(true)
    setError('')
    try {
      if (!tenantId) throw new Error('tenantId missing')

      if (!editing) {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formEmail,
            password: formPassword,
            name: formName,
            phone: formPhone || null,
            role: formRole,
            isActive: formIsActive,
          }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось создать пользователя')
      } else {
        const body: Record<string, unknown> = {
          email: formEmail,
          name: formName,
          phone: formPhone || null,
          role: formRole,
          isActive: formIsActive,
        }
        if (formPassword) body.password = formPassword

        const res = await fetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data?.error || 'Не удалось обновить пользователя')
      }

      setIsModalOpen(false)
      await loadUsers()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  async function remove(u: UserRow) {
    if (!confirm(`Удалить пользователя ${u.email}?`)) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/users/${u.id}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok)
        throw new Error((data as { error?: string })?.error || 'Не удалось удалить пользователя')
      await loadUsers()
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
          <h1 className="text-3xl font-bold text-gray-900">Пользователи</h1>
          <p className="text-gray-600">Управление сотрудниками и ролями в мастерской</p>
        </div>
        <Button variant="gradient" onClick={openCreate} disabled={loading}>
          Добавить пользователя
        </Button>
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
              <th className="px-4 py-3 text-left">Имя</th>
              <th className="px-4 py-3 text-left">Email</th>
              <th className="px-4 py-3 text-left">Телефон</th>
              <th className="px-4 py-3 text-left">Роль</th>
              <th className="px-4 py-3 text-left">Активен</th>
              <th className="px-4 py-3 text-right">Действия</th>
            </tr>
          </thead>
          <tbody>
            {sortedUsers.map(u => (
              <tr key={u.id} className="border-t border-gray-100">
                <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                <td className="px-4 py-3 text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-gray-700">{u.phone ?? '—'}</td>
                <td className="px-4 py-3 text-gray-700">{u.role}</td>
                <td className="px-4 py-3 text-gray-700">{u.isActive ? 'Да' : 'Нет'}</td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEdit(u)}
                      disabled={loading}
                    >
                      Изменить
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => remove(u)}
                      disabled={loading}
                    >
                      Удалить
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {sortedUsers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-gray-500" colSpan={6}>
                  {loading ? 'Загрузка...' : 'Пользователей пока нет'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editing ? 'Редактировать пользователя' : 'Создать пользователя'}
        size="lg"
      >
        <div className="space-y-4">
          <Input label="Email" value={formEmail} onChange={e => setFormEmail(e.target.value)} />
          <Input
            label={editing ? 'Новый пароль (если нужно поменять)' : 'Пароль'}
            type="password"
            value={formPassword}
            onChange={e => setFormPassword(e.target.value)}
          />
          <Input label="Имя" value={formName} onChange={e => setFormName(e.target.value)} />
          <Input label="Телефон" value={formPhone} onChange={e => setFormPhone(e.target.value)} />

          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <div className="text-sm font-semibold text-gray-900 mb-3">Роль (галочками)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {ROLE_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="flex items-center gap-3 rounded-lg bg-white px-3 py-2 border border-gray-200"
                >
                  <input
                    type="checkbox"
                    checked={formRole === opt.value}
                    onChange={() => setFormRole(opt.value)}
                  />
                  <span className="text-sm text-gray-800">{opt.label}</span>
                </label>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500">
              Сейчас у пользователя может быть только одна роль (выберите одну галочку).
            </div>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={e => setFormIsActive(e.target.checked)}
            />
            <span className="text-sm text-gray-800">Активен</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={loading}>
              Отмена
            </Button>
            <Button variant="gradient" onClick={save} isLoading={loading}>
              Сохранить
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
