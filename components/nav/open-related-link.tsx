'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'

type OpenRelatedLinkProps = {
  href: string
  label: string
  disabled?: boolean
  newTab?: boolean
}

export function OpenRelatedLink({ href, label, disabled, newTab }: OpenRelatedLinkProps) {
  if (disabled || !href) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        <ExternalLink className="w-4 h-4 mr-2" />
        {label}
      </Button>
    )
  }

  return (
    <Link
      href={href}
      target={newTab ? '_blank' : undefined}
      rel={newTab ? 'noreferrer' : undefined}
    >
      <Button type="button" variant="outline" size="sm">
        <ExternalLink className="w-4 h-4 mr-2" />
        {label}
      </Button>
    </Link>
  )
}
