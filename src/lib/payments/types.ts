/**
 * Provider-agnostic payment types.
 *
 * Every API route, webhook handler, and downstream consumer talks to the
 * `PaymentProvider` interface — never to a specific PSP's SDK or URLs.
 * To swap PSPs (Korapay → Paystack, etc.) the only file that changes is
 * `src/lib/payments/index.ts`, which exports the active provider.
 */

export type Currency = 'NGN'

export type Channel = 'web' | 'ussd' | 'whatsapp' | 'admin_logged'

export interface Customer {
  name: string
  email: string
  phone?: string
}

export interface CheckoutInput {
  /** Our internal payment_attempt.id — the source of truth across the system. */
  reference: string
  amount: number
  currency: Currency
  customer: Customer
  /** Where the PSP returns the user after success or failure. */
  redirectUrl: string
  /** Free-form text shown on the customer's bank statement, where supported. */
  narration?: string
  /** Echoed back in the webhook so we can correlate without a DB lookup. */
  metadata?: Record<string, string | number>
}

export interface CheckoutResult {
  /** Hosted checkout URL to redirect the resident to. */
  checkoutUrl: string
  /** Our reference — echoed back so callers don't have to track it separately. */
  reference: string
  /** PSP's internal reference, useful for support/debugging. */
  providerReference: string
}

export interface USSDInput {
  reference: string
  amount: number
  currency: Currency
  customer: Customer & { phone: string } // phone is required for USSD flows
  /** Korapay's bank slug (e.g. "058" for GTBank). */
  bankCode: string
  metadata?: Record<string, string | number>
}

export interface USSDResult {
  /** The USSD string the resident dials, e.g. "*737*000*123456#". */
  ussdCode: string
  reference: string
  providerReference: string
  /** ISO timestamp the USSD code is valid until. */
  expiresAt?: string
}

export type PaymentEventType = 'success' | 'failed' | 'pending' | 'expired'

/**
 * Normalised shape of a webhook event. Every PSP's webhook payload is
 * translated into this so the queue consumer + DB layer never sees vendor-specific fields.
 */
export interface NormalisedPaymentEvent {
  type: PaymentEventType
  /** Our payment_attempt.id (echoed back by the PSP). */
  reference: string
  /** PSP's internal reference. */
  providerReference: string
  amount: number
  currency: Currency
  channel: Channel | 'unknown'
  paidAt?: string
  /** Original payload, kept for audit. */
  rawProviderPayload: unknown
}

export interface PaymentProvider {
  /** Human-readable name used in logs and the admin "powered by" footer. */
  readonly name: 'korapay' | 'paystack' | 'flutterwave'

  initializeCheckout(input: CheckoutInput): Promise<CheckoutResult>
  initializeUSSD(input: USSDInput): Promise<USSDResult>

  /**
   * Verify that a webhook came from this provider.
   * Always pass the RAW request body (pre-parse) — the signature is computed over bytes.
   */
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean

  parseWebhookEvent(body: unknown): NormalisedPaymentEvent
}
