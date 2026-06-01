/**
 * Korapay implementation of the PaymentProvider interface.
 *
 * Docs: https://developers.korapay.com
 * Base URL: https://api.korapay.com/merchant/api/v1
 *
 * Two env vars must be set:
 *   KORAPAY_PUBLIC_KEY  — used by the browser checkout modal (when we use that path)
 *   KORAPAY_SECRET_KEY  — used by every server-side call below
 */

import crypto from 'crypto'
import type {
  CheckoutInput,
  CheckoutResult,
  NormalisedPaymentEvent,
  PaymentProvider,
  USSDInput,
  USSDResult,
} from '../types'

const BASE_URL = 'https://api.korapay.com/merchant/api/v1'

function getSecretKey(): string {
  const key = process.env.KORAPAY_SECRET_KEY
  if (!key) throw new Error('KORAPAY_SECRET_KEY is not set')
  return key
}

/**
 * Naira → kobo. Korapay accepts amounts in the base unit (naira, not kobo, for NGN),
 * but kept here in case we ever need to switch.
 */
function toMajorUnits(naira: number): number {
  return naira
}

async function korapayFetch<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getSecretKey()}`,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  })

  const json = (await res.json().catch(() => null)) as
    | { status: boolean; message?: string; data?: T }
    | null

  if (!res.ok || !json?.status) {
    const msg = json?.message ?? `Korapay request failed (HTTP ${res.status})`
    throw new Error(`korapay: ${msg}`)
  }

  if (!json.data) {
    throw new Error('korapay: response missing data')
  }
  return json.data
}

export const korapayProvider: PaymentProvider = {
  name: 'korapay',

  async initializeCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    type InitResponse = {
      reference: string
      checkout_url: string
    }

    const data = await korapayFetch<InitResponse>('/charges/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: toMajorUnits(input.amount),
        currency: input.currency,
        reference: input.reference,
        narration: input.narration ?? 'UtiliPay payment',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/korapay`,
        redirect_url: input.redirectUrl,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
        },
        metadata: {
          channel: 'web',
          ...(input.metadata ?? {}),
        },
      }),
    })

    return {
      checkoutUrl: data.checkout_url,
      reference: input.reference,
      providerReference: data.reference,
    }
  },

  async initializeUSSD(input: USSDInput): Promise<USSDResult> {
    /**
     * Korapay USSD: POST /charges/initialize with channels: ["pay_with_bank"]
     * or use direct /charges/ussd endpoint depending on account configuration.
     * Below uses the direct endpoint pattern. If the merchant account doesn't
     * have direct USSD enabled, fall back to standard checkout with channel hint.
     */
    type USSDResponse = {
      reference: string
      payment_code: string // e.g. "*737*000*123456#"
      expires_at?: string
    }

    const data = await korapayFetch<USSDResponse>('/charges/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: toMajorUnits(input.amount),
        currency: input.currency,
        reference: input.reference,
        narration: 'UtiliPay USSD payment',
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/korapay`,
        channels: ['pay_with_bank'],
        default_channel: 'pay_with_bank',
        bank_code: input.bankCode,
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          phone: input.customer.phone,
        },
        metadata: {
          channel: 'ussd',
          bank_code: input.bankCode,
          ...(input.metadata ?? {}),
        },
      }),
    })

    return {
      ussdCode: data.payment_code,
      reference: input.reference,
      providerReference: data.reference,
      expiresAt: data.expires_at,
    }
  },

  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!signature) return false
    const expected = crypto
      .createHmac('sha256', getSecretKey())
      .update(rawBody)
      .digest('hex')
    // timingSafeEqual requires equal-length buffers
    const a = Buffer.from(signature, 'utf8')
    const b = Buffer.from(expected, 'utf8')
    if (a.length !== b.length) return false
    return crypto.timingSafeEqual(a, b)
  },

  parseWebhookEvent(body: unknown): NormalisedPaymentEvent {
    /**
     * Korapay webhook envelope shape:
     * {
     *   event: 'charge.success' | 'charge.failed',
     *   data: {
     *     reference: 'merchant-ref',
     *     payment_reference: 'kpy-ref',
     *     amount: 25000,
     *     currency: 'NGN',
     *     status: 'success' | 'failed',
     *     payment_method: 'card' | 'bank_transfer' | 'pay_with_bank' | ...,
     *     paid_at: '2026-05-24T...',
     *     metadata: { channel: 'web' | 'ussd' | ... }
     *   }
     * }
     */
    const env = body as {
      event?: string
      data?: {
        reference?: string
        payment_reference?: string
        amount?: number
        currency?: string
        status?: string
        payment_method?: string
        paid_at?: string
        metadata?: Record<string, unknown>
      }
    }

    const data = env.data
    if (!data || !data.reference) {
      throw new Error('korapay: webhook missing data.reference')
    }

    const type: NormalisedPaymentEvent['type'] =
      data.status === 'success'
        ? 'success'
        : data.status === 'failed'
          ? 'failed'
          : data.status === 'expired'
            ? 'expired'
            : 'pending'

    const channelHint = (data.metadata?.channel as string | undefined) ?? undefined
    const channel: NormalisedPaymentEvent['channel'] =
      channelHint === 'web' ||
      channelHint === 'ussd' ||
      channelHint === 'whatsapp' ||
      channelHint === 'admin_logged'
        ? channelHint
        : data.payment_method === 'pay_with_bank'
          ? 'ussd'
          : 'web'

    return {
      type,
      reference: data.reference,
      providerReference: data.payment_reference ?? data.reference,
      amount: data.amount ?? 0,
      currency: (data.currency as 'NGN') ?? 'NGN',
      channel,
      paidAt: data.paid_at,
      rawProviderPayload: body,
    }
  },
}
