import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'

export interface InputProps extends HTMLMotionProps<'input'> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false)
    const inputId = props.id ?? props.name

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
          )}
          <motion.input
            id={inputId}
            type={type}
            className={cn(
              'flex h-12 w-full rounded-xl border-2 bg-white px-4 py-3 text-sm',
              'ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium',
              'placeholder:text-gray-400',
              'transition-all duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon && 'pl-11',
              error
                ? 'border-red-300 focus-visible:border-red-500 focus-visible:ring-red-500'
                : isFocused
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-gray-200 hover:border-gray-300',
              className
            )}
            ref={ref}
            onFocus={e => {
              setIsFocused(true)
              props.onFocus?.(e)
            }}
            onBlur={e => {
              setIsFocused(false)
              props.onBlur?.(e)
            }}
            {...props}
          />
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-sm text-red-600"
          >
            {error}
          </motion.p>
        )}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }
