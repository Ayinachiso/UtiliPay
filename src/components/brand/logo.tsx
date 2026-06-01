import { cn } from '@/lib/utils'

/**
 * UtiliPay brand assets.
 *
 * MARK — a rounded-square emblem in the brand color, with a stylised
 * estate gate cut out in the background color. Substantial enough to
 * read at small sizes, distinctive enough to feel intentional.
 *
 * WORDMARK — "UtiliPay" set in Instrument Serif, the "Pay" italicised in
 * the primary color so the brand name reads as a phrase, not a logo.
 *
 * Three variants for different uses:
 *   <LogoMark />   — emblem only (favicon, mobile header)
 *   <Logo />       — emblem + inline wordmark (header lockup)
 *   <LogoEmblem /> — stacked: emblem on top, wordmark below (hero use)
 *
 * The emblem uses the foreground/background colors of its surrounding context,
 * so it works on any panel (dark, cream, forest) without props.
 */

interface LogoMarkProps {
  className?: string
  size?: number
  /** Forces the foreground (the emblem fill) regardless of inherited color. */
  fg?: string
  /** Forces the background (the gate cutout) — defaults to the page background. */
  bg?: string
}

export function LogoMark({
  className,
  size = 32,
  fg,
  bg,
}: LogoMarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label="UtiliPay"
      className={cn('shrink-0', className)}
    >
      {/* Outer rounded-square emblem in brand fg */}
      <rect
        x="0"
        y="0"
        width="40"
        height="40"
        rx="9"
        fill={fg ?? 'currentColor'}
      />

      {/* Estate-gate negative space — arch + columns + threshold */}
      <g fill={bg ?? 'hsl(var(--background))'}>
        {/* The arch + walls (one shape) */}
        <path
          d="M11 30 V21 a9 9 0 0 1 18 0 V30 H25 V23 a5 5 0 0 0 -10 0 V30 Z"
        />
        {/* Threshold dash at the base — a small stamp-like detail */}
        <rect x="13" y="31.5" width="14" height="1.5" rx="0.5" />
      </g>
    </svg>
  )
}

interface WordmarkProps {
  className?: string
  /** Size multiplier on the base em — defaults to 1.4 for header use. */
  scale?: number
}

export function Wordmark({ className, scale = 1.4 }: WordmarkProps) {
  return (
    <span
      className={cn(
        'font-display font-normal tracking-tighter leading-none whitespace-nowrap',
        className
      )}
      style={{ fontSize: `${scale}em` }}
    >
      <span>Utili</span>
      <span className="italic text-primary">Pay</span>
    </span>
  )
}

interface LogoProps {
  className?: string
  size?: number
  wordmarkScale?: number
}

export function Logo({ className, size = 32, wordmarkScale = 1.4 }: LogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <Wordmark scale={wordmarkScale} />
    </span>
  )
}

/**
 * Stacked emblem for hero use — bigger mark on top, wordmark + tagline below.
 * Used on the login page and any "brand statement" surface.
 */
interface LogoEmblemProps {
  className?: string
  size?: number
  tagline?: string
}

export function LogoEmblem({
  className,
  size = 56,
  tagline = 'Estate operations, made simple.',
}: LogoEmblemProps) {
  return (
    <div className={cn('inline-flex flex-col items-start gap-3', className)}>
      <LogoMark size={size} />
      <div className="flex flex-col gap-1">
        <Wordmark scale={2.2} />
        {tagline && (
          <p className="text-xs tracking-eyebrow opacity-60 mt-1.5">
            {tagline}
          </p>
        )}
      </div>
    </div>
  )
}
