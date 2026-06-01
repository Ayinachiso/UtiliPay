/**
 * POST /api/admin/notify
 *
 * Send a reminder to every resident with an outstanding balance on a given
 * bill title (e.g. "May 2026 Security Levy"). Email is real (via Resend),
 * WhatsApp + SMS are simulated for the hackathon.
 *
 * Body:
 *   {
 *     bill_title: string
 *     channels: { email: boolean, whatsapp: boolean, sms: boolean }
 *     custom_message?: string
 *   }
 *
 * Returns notify result + recipients list.
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  notifyDefaulters,
  type DefaulterRecipient,
} from '@/lib/messaging/notify'

const NotifySchema = z.object({
  bill_title: z.string().trim().min(2),
  channels: z.object({
    email: z.boolean(),
    whatsapp: z.boolean(),
    sms: z.boolean(),
  }),
  custom_message: z.string().trim().max(500).optional(),
})

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = NotifySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // Authenticate
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Admin member
  const { data: adminMember } = await admin
    .from('members')
    .select('id, community_id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()
  if (!adminMember) {
    return NextResponse.json({ error: 'not_an_admin' }, { status: 403 })
  }

  // Community name (for the email subject + body)
  const { data: community } = await admin
    .from('communities')
    .select('name')
    .eq('id', adminMember.community_id)
    .single()
  if (!community) {
    return NextResponse.json(
      { error: 'community_not_found' },
      { status: 404 }
    )
  }

  // Find every matching bill in the admin's community, joined with unit + payments
  const { data: bills, error: billsErr } = await admin
    .from('bills')
    .select(
      'id, title, amount, due_date, status, unit:units(id, label, community_id, members(id, full_name, email, phone, role)), payments(amount)'
    )
    .eq('title', parsed.data.bill_title)
    .order('due_date', { ascending: true })

  if (billsErr || !bills) {
    return NextResponse.json(
      { error: 'bills_lookup_failed', detail: billsErr?.message },
      { status: 500 }
    )
  }

  // Filter to bills in this community and that have outstanding balance
  const recipients: DefaulterRecipient[] = []
  let dueDate = ''
  for (const b of bills) {
    const unit = Array.isArray(b.unit) ? b.unit[0] : b.unit
    if (!unit || unit.community_id !== adminMember.community_id) continue
    const paidSum = (b.payments ?? []).reduce(
      (s, p) => s + Number(p.amount),
      0
    )
    const outstanding = Math.max(0, Number(b.amount) - paidSum)
    if (outstanding === 0) continue
    if (!dueDate) dueDate = b.due_date

    const members = Array.isArray(unit.members) ? unit.members : []
    for (const m of members) {
      if (m.role !== 'resident') continue
      recipients.push({
        memberId: m.id,
        fullName: m.full_name,
        email: m.email,
        phone: m.phone,
        unitLabel: unit.label,
        outstanding,
      })
    }
  }

  if (recipients.length === 0) {
    return NextResponse.json({
      success: true,
      result: {
        emailSent: 0,
        emailSkipped: 0,
        whatsappSimulated: 0,
        smsSimulated: 0,
        errors: [],
      },
      recipients: 0,
      message: 'No outstanding balances found for this bill. Nothing to send.',
    })
  }

  const result = await notifyDefaulters({
    communityName: community.name,
    billTitle: parsed.data.bill_title,
    dueDate: dueDate || new Date().toISOString(),
    customMessage: parsed.data.custom_message,
    recipients,
    channels: parsed.data.channels,
  })

  return NextResponse.json({
    success: true,
    result,
    recipients: recipients.length,
  })
}
