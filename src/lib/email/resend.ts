/**
 * Resend wrapper.
 * Lazy-instantiates the client so the app doesn't crash at import time
 * if RESEND_API_KEY is missing (which happens during build on Vercel
 * the very first time, before env vars are set).
 */

import { Resend } from 'resend'

let cached: Resend | null = null

function getResend(): Resend {
  if (cached) return cached
  const key = process.env.RESEND_API_KEY
  if (!key) throw new Error('RESEND_API_KEY is not set')
  cached = new Resend(key)
  return cached
}

function getFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL ?? 'UtiliPay <onboarding@resend.dev>'
  )
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
  /** Plain-text fallback for clients that strip HTML. */
  text?: string
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const { data, error } = await getResend().emails.send({
    from: getFromAddress(),
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
  })

  if (error) {
    throw new Error(`resend: ${error.name ?? 'unknown'} — ${error.message}`)
  }
  if (!data?.id) {
    throw new Error('resend: response missing email id')
  }
}
