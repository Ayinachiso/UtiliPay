import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Compose Tailwind classnames. Used by every shadcn primitive.
 * Example: cn("px-4 py-2", isOpen && "bg-primary", className)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a naira amount with the ₦ symbol and thousand separators.
 * 25000 -> "₦25,000"
 */
export function formatNaira(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`
}

/**
 * Build a payment reference unique to this attempt.
 * Includes a timestamp prefix so refunds and webhook lookups stay scannable in logs.
 */
export function generatePaymentReference(prefix: 'UTP' = 'UTP'): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${prefix}-${ts}-${rand}`
}
