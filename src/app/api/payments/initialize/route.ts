/**
 * POST /api/payments/initialize
 *
 * Body: { billId: string, channel: 'web' | 'whatsapp' }
 *
 * 1. Authenticates the resident via the Supabase auth cookie
 * 2. Looks up the bill + member (via admin client, bypassing RLS — we've already authed)
 * 3. Creates a payment_attempt row
 * 4. Calls the active PSP to initialize a checkout
 * 5. Returns { checkoutUrl, reference } — the client redirects there
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import { PSP } from '@/lib/payments'
import { generatePaymentReference } from '@/lib/utils'

const InitializeSchema = z.object({
  billId: z.string().uuid(),
  channel: z.enum(['web', 'whatsapp']),
})

export async function POST(req: Request) {
  const json = await req.json().catch(() => null)
  const parsed = InitializeSchema.safeParse(json)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // ---- 1. Authenticate ----
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  // ---- 2. Load member + bill via admin client (skip RLS, we've authed) ----
  const admin = getSupabaseAdmin()

  const { data: member, error: memberErr } = await admin
    .from('members')
    .select('id, full_name, email, phone, unit_id, community_id')
    .eq('user_id', user.id)
    .single()

  if (memberErr || !member) {
    return NextResponse.json(
      { error: 'no_member_record', detail: memberErr?.message },
      { status: 403 }
    )
  }

  const { data: bill, error: billErr } = await admin
    .from('bills')
    .select('id, title, amount, unit_id, status')
    .eq('id', parsed.data.billId)
    .single()

  if (billErr || !bill) {
    return NextResponse.json({ error: 'bill_not_found' }, { status: 404 })
  }

  if (bill.status === 'paid') {
    return NextResponse.json({ error: 'bill_already_paid' }, { status: 409 })
  }

  // Sanity: the bill must belong to a unit the member is part of
  // (an admin paying on someone's behalf is out of scope for MVP)
  if (bill.unit_id !== member.unit_id) {
    return NextResponse.json(
      { error: 'bill_not_for_your_unit' },
      { status: 403 }
    )
  }

  // ---- 3. Create the payment_attempt ----
  const reference = generatePaymentReference('UTP')
  const amount = Number(bill.amount)

  const { error: attemptErr } = await admin.from('payment_attempts').insert({
    bill_id: bill.id,
    member_id: member.id,
    amount,
    provider: PSP.name,
    channel: parsed.data.channel,
    reference,
    status: 'pending',
  })

  if (attemptErr) {
    return NextResponse.json(
      { error: 'failed_to_create_attempt', detail: attemptErr.message },
      { status: 500 }
    )
  }

  // ---- 4. Initialize at the PSP ----
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  if (!member.email) {
    return NextResponse.json(
      { error: 'member_email_missing' },
      { status: 400 }
    )
  }

  try {
    const result = await PSP.initializeCheckout({
      reference,
      amount,
      currency: 'NGN',
      customer: {
        name: member.full_name,
        email: member.email,
        phone: member.phone ?? undefined,
      },
      redirectUrl: `${appUrl}/payments/success?ref=${encodeURIComponent(reference)}`,
      narration: bill.title,
      metadata: {
        bill_id: bill.id,
        member_id: member.id,
        channel: parsed.data.channel,
      },
    })

    return NextResponse.json({
      checkoutUrl: result.checkoutUrl,
      reference: result.reference,
      providerReference: result.providerReference,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    return NextResponse.json(
      { error: 'psp_initialize_failed', detail: message },
      { status: 502 }
    )
  }
}
