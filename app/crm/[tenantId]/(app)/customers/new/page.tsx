'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useFormDraft } from '@/lib/hooks/use-form-draft'

type CustomerType = 'COMPANY' | 'SOLE_PROPRIETOR' | 'INDIVIDUAL'

export default function NewCustomerPage() {
  const router = useRouter()
  const params = useParams<{ tenantId: string }>()
  const tenantId = params.tenantId

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [type, setType] = useState<CustomerType>('COMPANY')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [addressComment, setAddressComment] = useState('')
  const [comment, setComment] = useState('')

  const [inn, setInn] = useState('')
  const [fullName, setFullName] = useState('')
  const [legalAddress, setLegalAddress] = useState('')
  const [kpp, setKpp] = useState('')
  const [ogrn, setOgrn] = useState('')
  const [okpo, setOkpo] = useState('')

  // Временное сохранение данных формы создания клиента
  const customerFormData = {
    type,
    name,
    phone,
    email,
    address,
    addressComment,
    comment,
    inn,
    fullName,
    legalAddress,
    kpp,
    ogrn,
    okpo,
  }
  const customerDraft = useFormDraft({ key: 'customer-new', enabled: true }, customerFormData, [])

  // Восстанавливаем данные из черновика при монтировании
  useEffect(() => {
    const draft = customerDraft.loadDraft()
    if (draft) {
      setType((draft.type as CustomerType) ?? 'COMPANY')
      setName(draft.name ?? '')
      setPhone(draft.phone ?? '')
      setEmail(draft.email ?? '')
      setAddress(draft.address ?? '')
      setAddressComment(draft.addressComment ?? '')
      setComment(draft.comment ?? '')
      setInn(draft.inn ?? '')
      setFullName(draft.fullName ?? '')
      setLegalAddress(draft.legalAddress ?? '')
      setKpp(draft.kpp ?? '')
      setOgrn(draft.ogrn ?? '')
      setOkpo(draft.okpo ?? '')
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          name,
          phone: phone || null,
          email: email || null,
          address: address || null,
          addressComment: addressComment || null,
          comment: comment || null,
          inn: inn || null,
          fullName: fullName || null,
          legalAddress: legalAddress || null,
          kpp: kpp || null,
          ogrn: ogrn || null,
          okpo: okpo || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Не удалось создать клиента')
      customerDraft.clearDraft()
      router.push(`/crm/${tenantId}/customers/${data.id}`)
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
          <div className="text-sm text-gray-500">
            <Link href="../customers" className="hover:underline">
              Клиенты
            </Link>{' '}
            / Новый клиент
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Новый клиент</h1>
          <p className="text-gray-600">
            Заполните реквизиты — контакты/счета добавите на карточке после создания
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="../customers">
            <Button variant="outline" disabled={loading}>
              Отмена
            </Button>
          </Link>
          <Button variant="gradient" onClick={save} isLoading={loading}>
            Создать
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={type === 'COMPANY' ? 'gradient' : 'outline'}
            onClick={() => setType('COMPANY')}
          >
            Юрлицо
          </Button>
          <Button
            variant={type === 'SOLE_PROPRIETOR' ? 'gradient' : 'outline'}
            onClick={() => setType('SOLE_PROPRIETOR')}
          >
            ИП
          </Button>
          <Button
            variant={type === 'INDIVIDUAL' ? 'gradient' : 'outline'}
            onClick={() => setType('INDIVIDUAL')}
          >
            Физлицо
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Input label="Наименование" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Телефон" value={phone} onChange={e => setPhone(e.target.value)} />
          <Input label="Эл. почта" value={email} onChange={e => setEmail(e.target.value)} />
          <Input
            label="Фактический адрес"
            value={address}
            onChange={e => setAddress(e.target.value)}
          />
          <Textarea
            label="Комментарий к адресу"
            value={addressComment}
            onChange={e => setAddressComment(e.target.value)}
            rows={3}
            className="lg:col-span-2"
          />
          <Textarea
            label="Комментарий к клиенту"
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={4}
            className="lg:col-span-2"
          />
        </div>

        <div className="border-t border-gray-100 pt-6">
          <div className="font-semibold text-gray-900 mb-3">Реквизиты</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Input label="ИНН" value={inn} onChange={e => setInn(e.target.value)} />
            <Input label="КПП" value={kpp} onChange={e => setKpp(e.target.value)} />
            <Input label="ОГРН" value={ogrn} onChange={e => setOgrn(e.target.value)} />
            <Input label="ОКПО" value={okpo} onChange={e => setOkpo(e.target.value)} />
            <Input
              label="Полное наименование"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="lg:col-span-2"
            />
            <Textarea
              label="Юридический адрес"
              value={legalAddress}
              onChange={e => setLegalAddress(e.target.value)}
              rows={3}
              className="lg:col-span-2"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
