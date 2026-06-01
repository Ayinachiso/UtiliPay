/**
 * Channel-aware receipt delivery.
 *
 * Called from the webhook consumer (after a Korapay payment lands) and from
 * the manual-cash logging endpoint. Always:
 *   1. Insert a `receipts` row (so the resident can re-download from the dashboard)
 *   2. Send an email if the payer has one on file
 *
 * For the `whatsapp` channel, the chat simulator on /whatsapp-demo will read
 * the receipt back into the chat history on its own — no extra delivery step
 * is needed here.
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'
import {
  renderReceiptHtml,
  renderReceiptPlainText,
  type ReceiptViewModel,
} from './template'
import { formatNaira } from '@/lib/utils'
import type { PaymentChannel } from '@/lib/db/types'

export interface DeliverReceiptInput {
  paymentId: string
}

export interface DeliverReceiptResult {
  receiptId: string
  receiptNumber: string
  emailSent: boolean
}

function buildReceiptNumber(): string {
  const ts = Date.now().toString(36).toUpperCase()
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `UTP-RCPT-${ts}-${rand}`
}

export async function deliverReceipt(
  input: DeliverReceiptInput
): Promise<DeliverReceiptResult> {
  const admin = getSupabaseAdmin()

  // 1. Pull the payment + related rows in one trip
  const { data: payment, error: payErr } = await admin
    .from('payments')
    .select(
      `id, amount, channel, provider, reference, paid_at, member_id, bill_id,
       bill:bills (id, title, description, unit_id,
         unit:units (id, label, community_id,
           community:communities (id, name)
         )
       ),
       member:members (id, full_name, email)`
    )
    .eq('id', input.paymentId)
    .single()

  if (payErr || !payment) {
    throw new Error(
      `deliverReceipt: payment ${input.paymentId} not found (${payErr?.message ?? 'no row'})`
    )
  }

  // Supabase returns nested relations as arrays in some configurations.
  // Normalise to single objects.
  const bill = Array.isArray(payment.bill) ? payment.bill[0] : payment.bill
  const member = Array.isArray(payment.member)
    ? payment.member[0]
    : payment.member
  const unit = bill
    ? Array.isArray(bill.unit)
      ? bill.unit[0]
      : bill.unit
    : null
  const community = unit
    ? Array.isArray(unit.community)
      ? unit.community[0]
      : unit.community
    : null

  if (!bill || !member || !unit || !community) {
    throw new Error('deliverReceipt: missing joined bill/member/unit/community')
  }

  // 2. Insert receipts row (idempotent on payment_id — schema has UNIQUE)
  const receiptNumber = buildReceiptNumber()
  const { data: receipt, error: rcptErr } = await admin
    .from('receipts')
    .upsert(
      { payment_id: payment.id, receipt_number: receiptNumber },
      { onConflict: 'payment_id' }
    )
    .select('id, receipt_number')
    .single()

  if (rcptErr || !receipt) {
    throw new Error(
      `deliverReceipt: failed to insert receipt (${rcptErr?.message ?? 'no row'})`
    )
  }

  const view: ReceiptViewModel = {
    receiptNumber: receipt.receipt_number,
    paidAt: payment.paid_at,
    amount: Number(payment.amount),
    payerName: member.full_name,
    payerEmail: member.email,
    unitLabel: unit.label,
    communityName: community.name,
    billTitle: bill.title,
    billDescription: bill.description,
    channel: payment.channel as PaymentChannel,
    provider: payment.provider as ReceiptViewModel['provider'],
    reference: payment.reference,
  }

  // 3. Email — only if the payer has an address on file
  let emailSent = false
  if (member.email) {
    try {
      await sendEmail({
        to: member.email,
        subject: `Receipt · ${formatNaira(view.amount)} · ${view.billTitle}`,
        html: renderReceiptHtml(view),
        text: renderReceiptPlainText(view),
      })
      emailSent = true
    } catch (err) {
      // Don't fail the whole webhook over a transient email error.
      // The receipt row exists; the resident can download it from the dashboard.
      console.error('[deliverReceipt] email send failed', err)
    }
  }

  return {
    receiptId: receipt.id,
    receiptNumber: receipt.receipt_number,
    emailSent,
  }
}
