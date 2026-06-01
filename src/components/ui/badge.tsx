import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  [
    'inline-flex items-center gap-1 rounded-full px-2 py-0.5',
    'text-[10px] font-semibold uppercase tracking-wider leading-none',
    'transition-colors',
  ].join(' '),
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border border-border text-foreground',

        // Bill status — light/dark aware via primary/destructive tokens
        paid:
          'bg-primary/12 text-primary border border-primary/20 dark:bg-primary/15 dark:text-primary dark:border-primary/30',
        partial:
          'bg-gold-500/15 text-gold-600 border border-gold-500/30 dark:bg-gold-500/15 dark:text-gold-500 dark:border-gold-500/30',
        overdue:
          'bg-destructive/12 text-destructive border border-destructive/25',
        open:
          'bg-muted text-muted-foreground border border-border',

        // Channel pills — used on the admin live feed
        channel:
          'bg-accent text-accent-foreground font-medium normal-case tracking-normal text-xs px-2.5 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
