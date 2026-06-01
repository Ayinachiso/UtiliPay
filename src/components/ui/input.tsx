import * as React from 'react'

import { cn } from '@/lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-11 w-full rounded-md border border-input',
          'bg-card text-foreground',
          'px-4 py-2 text-sm',
          'shadow-[inset_0_1px_0_0_hsl(var(--background)/0.4)] dark:shadow-none',
          'placeholder:text-muted-foreground/60',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground',
          'transition-colors',
          'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
