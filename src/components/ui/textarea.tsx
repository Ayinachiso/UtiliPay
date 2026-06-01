import * as React from 'react'

import { cn } from '@/lib/utils'

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.ComponentProps<'textarea'>
>(({ className, ...props }, ref) => {
  return (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-input',
        'bg-card text-foreground',
        'px-3.5 py-2.5 text-sm leading-relaxed',
        'shadow-[inset_0_1px_0_0_hsl(var(--background)/0.4)] dark:shadow-none',
        'placeholder:text-muted-foreground/60',
        'transition-colors resize-y',
        'focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      ref={ref}
      {...props}
    />
  )
})
Textarea.displayName = 'Textarea'

export { Textarea }
