'use client'

import Link from 'next/link'
import { ArrowLeft, ArrowUp } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ContextNavProps = {
  backHref: string
  upHref: string
  className?: string
}

export function ContextNav({ backHref, upHref, className }: ContextNavProps) {
  return (
    <div className={className ?? ''}>
      <div className="flex flex-wrap items-center gap-2">
        <Link href={backHref}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Назад
          </Button>
        </Link>
        <Link href={upHref}>
          <Button variant="outline" size="sm" disabled={!upHref || upHref === backHref}>
            <ArrowUp className="w-4 h-4 mr-2" />
            Вверх
          </Button>
        </Link>
      </div>
    </div>
  )
}
