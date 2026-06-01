'use client'

import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'

import { useTheme } from './theme-provider'
import { cn } from '@/lib/utils'

interface ThemeToggleProps {
  className?: string
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  // Until the client has mounted, don't render theme-dependent attributes.
  // This prevents a hydration mismatch: the server doesn't know the user's
  // preference, but the inline boot script in layout.tsx has already applied
  // the dark/light class to <html> before React hydrates.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      aria-pressed={mounted ? theme === 'dark' : undefined}
      onClick={toggle}
      suppressHydrationWarning
      className={cn(
        'relative inline-flex h-9 w-9 items-center justify-center rounded-md',
        'text-muted-foreground hover:text-foreground hover:bg-accent',
        'transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className
      )}
    >
      {/* The icons swap purely via the .dark class on <html>, so they don't
          cause hydration issues — they're CSS-driven, not React-state-driven. */}
      <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </button>
  )
}
