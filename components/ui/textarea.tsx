import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, ...props }, ref) => {
    const textareaId = props.id ?? props.name

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          className={cn(
            'w-full rounded-xl border-2 bg-white px-4 py-3 text-sm',
            'placeholder:text-gray-400',
            'transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-300 focus-visible:ring-red-500'
              : 'border-gray-200 hover:border-gray-300',
            className
          )}
          {...props}
        />
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
