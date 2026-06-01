/**
 * POST /api/webhooks/korapay
 *
 * Receives webhook events from Korapay. Verifies the HMAC signature,
 * promotes the payment_attempt to a confirmed payment, and triggers
 * channel-aware receipt delivery.
 *
 * IMPORTANT: must read the RAW body for signature verification.
 * We then JSON.parse it ourselves. Never call req.json() before
 * computing the signature.
 */

import { NextResponse } from 'next/server'

import { PSP } from '@/lib/payments'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { deliverReceipt } from '@/lib/receipts/deliver'

// Tell Next.js this is a dynamic route (no caching, always run)
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  // 1. Read raw body for signature verification
  const rawBody = await req.text()
  const signature =
    req.headers.get('x-korapay-signature') ??
    req.headers.get('x-korapay-signature'.toLowerCase())

  if (!PSP.verifyWebhookSignature(rawBody, signature)) {
    console.warn('[korapay webhook] invalid signature')
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
  }

  // 2. Parse + normalise
  let parsed
  try {
    const body = JSON.parse(rawBody)
    parsed = PSP.parseWebhookEvent(body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json(
      { error: 'parse_failed', detail: message },
      { status: 400 }
    )
  }

  const admin = getSupabaseAdmin()

  // 3. Only act on success events for MVP (failed/pending/expired left for later)
  if (parsed.type !== 'success') {
    // Still 200 so Korapay doesn't keep retrying.
    return NextResponse.json({ received: true, ignored: parsed.type })
  }

  // 4. Find the payment_attempt by reference (idempotency: if it's already
  //    promoted, exit early so duplicate webhooks don't double-charge the ledger)
  const { data: attempt, error: attemptErr } = await admin
    .from('payment_attempts')
    .select('id, bill_id, member_id, amount, channel, status')
    .eq('reference', parsed.reference)
    .single()

  if (attemptErr || !attempt) {
    console.warn('[korapay webhook] no matching attempt for', parsed.reference)
    // 200 to stop retries; this could be a stale webhook for an attempt that
    // was wiped during a schema rebuild.
    return NextResponse.json({ received: true, unmatched: true })
  }

  if (attempt.status === 'promoted') {
    return NextResponse.json({ received: true, already_promoted: true })
  }

  // 5. Insert the confirmed payment
  //    The trigger on payments will auto-recompute bill.status.
  const { data: payment, error: payErr } = await admin
    .from('payments')
    .insert({
      bill_id: attempt.bill_id,
      member_id: attempt.member_id,
      amount: attempt.amount,
      provider: 'korapay',
      channel: attempt.channel,
      reference: parsed.reference,
      status: 'successful',
      paid_at: parsed.paidAt ?? new Date().toISOString(),
    })
    .select('id')
    .single()

  if (payErr || !payment) {
    // Unique-violation on `reference` means we already inserted (double webhook) — that's fine.
    if (payErr?.code === '23505') {
      return NextResponse.json({ received: true, deduped: true })
    }
    console.error('[korapay webhook] payment insert failed', payErr)
    return NextResponse.json(
      { error: 'insert_failed', detail: payErr?.message },
      { status: 500 }
    )
  }

  // 6. Mark the attempt promoted
  await admin
    .from('payment_attempts')
    .update({ status: 'promoted' })
    .eq('id', attempt.id)

  // 7. Deliver the receipt (email + db row). Don't fail the webhook on
  //    delivery errors — the payment is already in the ledger.
  try {
    await deliverReceipt({ paymentId: payment.id })
  } catch (err) {
    console.error('[korapay webhook] receipt delivery failed', err)
  }

  return NextResponse.json({
    received: true,
    paymentId: payment.id,
    reference: parsed.reference,
  })
}
