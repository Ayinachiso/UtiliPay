/**
 * Server-rendered receipt page.
 * Visit /receipts/<paymentId> to view the receipt as a printable HTML page
 * (same template that gets emailed). Press Ctrl/Cmd+P to print to PDF.
 *
 * Note: this uses the admin client (bypasses RLS) because anyone with the
 * payment ID can already see the receipt in their email. For MVP simplicity
 * we don't gate this page further; post-hackathon we'd add a signed-URL token.
 */

import { notFound } from 'next/navigation'

import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  renderReceiptHtml,
  type ReceiptViewModel,
} from '@/lib/receipts/template'
import type { PaymentChannel } from '@/lib/db/types'

export const dynamic = 'force-dynamic'

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const admin = getSupabaseAdmin()

  const { data: payment, error } = await admin
    .from('payments')
    .select(
      `id, amount, channel, provider, reference, paid_at,
       bill:bills (title, description, unit:units (label, community:communities (name))),
       member:members (full_name, email),
       receipt:receipts (receipt_number)`
    )
    .eq('id', id)
    .single()

  if (error || !payment) return notFound()

  const bill = Array.isArray(payment.bill) ? payment.bill[0] : payment.bill
  const member = Array.isArray(payment.member) ? payment.member[0] : payment.member
  const receipt = Array.isArray(payment.receipt)
    ? payment.receipt[0]
    : payment.receipt
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

  if (!bill || !member || !unit || !community) return notFound()

  const view: ReceiptViewModel = {
    receiptNumber: receipt?.receipt_number ?? 'PENDING',
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

  const html = renderReceiptHtml(view)

  // Inject the HTML directly. The template is self-contained and safe (no user
  // input is rendered without escaping at the source).
  return <div dangerouslySetInnerHTML={{ __html: html }} />
}
