/**
 * The active payment provider for UtiliPay.
 *
 * THIS IS THE ONLY FILE THAT CHANGES WHEN SWAPPING PSPs.
 *
 * To switch to a different provider:
 *   1. Implement the PaymentProvider interface in `./providers/<name>.ts`
 *   2. Import it here and assign it to `PSP`
 *   3. Update the env vars referenced by that provider
 *   4. Nothing else in the codebase needs to change
 */

import { korapayProvider } from './providers/korapay'
import type { PaymentProvider } from './types'

export const PSP: PaymentProvider = korapayProvider

// Re-export the types so callers can do: `import { PSP, type CheckoutInput } from '@/lib/payments'`
export type {
  CheckoutInput,
  CheckoutResult,
  Channel,
  Currency,
  Customer,
  NormalisedPaymentEvent,
  PaymentEventType,
  PaymentProvider,
  USSDInput,
  USSDResult,
} from './types'
