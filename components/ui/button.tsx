import * as React from 'react'
import { cn } from '@/lib/utils'
import { motion, type HTMLMotionProps } from 'framer-motion'

export interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'gradient'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  isLoading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { className, variant = 'default', size = 'md', isLoading, children, disabled, ...props },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden'

    const variants = {
      default:
        'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/50 hover:shadow-xl hover:shadow-blue-500/50 hover:from-blue-700 hover:to-blue-800 active:scale-95',
      outline:
        'border-2 border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 hover:border-gray-400 hover:shadow-md active:scale-95',
      ghost: 'text-gray-700 hover:bg-gray-100 active:scale-95',
      destructive:
        'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/50 hover:shadow-xl hover:shadow-red-500/50 hover:from-red-700 hover:to-red-800 active:scale-95',
      gradient:
        'bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 text-white shadow-lg shadow-purple-500/50 hover:shadow-xl hover:shadow-purple-500/50 active:scale-95',
    }

    const sizes = {
      sm: 'h-9 px-4 text-sm',
      md: 'h-11 px-6 text-base',
      lg: 'h-14 px-8 text-lg',
      icon: 'h-10 w-10',
    }

    return (
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && (
          <span className="absolute inset-0 flex items-center justify-center">
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          </span>
        )}
        <span className={isLoading ? 'opacity-0' : ''}>{children as React.ReactNode}</span>
      </motion.button>
    )
  }
)
Button.displayName = 'Button'

export { Button }
