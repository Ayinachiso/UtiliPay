/**
 * GET /api/admin/export?format=csv|xlsx&scope=payments|bills|defaulters|all
 *
 * Streams a CSV or XLSX download with the admin's community data.
 * XLSX is multi-sheet (Summary + Payments + Bills + Defaulters), CSV is
 * scope-specific (one file at a time).
 */

import { NextResponse } from 'next/server'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'
import {
  buildBillsCsv,
  buildDefaultersCsv,
  buildPaymentsCsv,
  buildXlsxWorkbook,
  type BillExportRow,
  type DefaulterExportRow,
  type PaymentExportRow,
} from '@/lib/export/exporters'

export const dynamic = 'force-dynamic'

type Scope = 'payments' | 'bills' | 'defaulters' | 'all'
type Format = 'csv' | 'xlsx'

function isScope(v: string | null): v is Scope {
  return v === 'payments' || v === 'bills' || v === 'defaulters' || v === 'all'
}
function isFormat(v: string | null): v is Format {
  return v === 'csv' || v === 'xlsx'
}

function todayStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const scope = url.searchParams.get('scope') ?? 'all'
  const format = url.searchParams.get('format') ?? 'xlsx'
  /** Optional filter: only export rows that belong to this bill title. */
  const billTitleFilter = url.searchParams.get('bill_title')
  /** Optional date range filter for payments (ISO strings). */
  const dateFromRaw = url.searchParams.get('date_from')
  const dateToRaw = url.searchParams.get('date_to')
  const dateFrom = dateFromRaw ? new Date(dateFromRaw) : null
  const dateTo = dateToRaw ? new Date(dateToRaw) : null

  if (!isScope(scope)) {
    return NextResponse.json({ error: 'invalid_scope' }, { status: 400 })
  }
  if (!isFormat(format)) {
    return NextResponse.json({ error: 'invalid_format' }, { status: 400 })
  }
  if ((dateFrom && Number.isNaN(dateFrom.getTime())) ||
      (dateTo && Number.isNaN(dateTo.getTime()))) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
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
  const { data: adminMember } = (await admin
    .from('members')
    .select('id, community_id')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()) as {
    data: { id: string; community_id: string } | null
  }
  if (!adminMember) {
    return NextResponse.json({ error: 'not_an_admin' }, { status: 403 })
  }

  const { data: community } = (await admin
    .from('communities')
    .select('name')
    .eq('id', adminMember.community_id)
    .single()) as { data: { name: string } | null }

  // ---- Build rows ----
  const paymentRows: PaymentExportRow[] = []
  const billRows: BillExportRow[] = []
  const defaulterRows: DefaulterExportRow[] = []

  if (scope === 'payments' || scope === 'all') {
    let q = (admin as any)
      .from('payments')
      .select(
        'amount, channel, provider, reference, paid_at, bill:bills!inner(title, unit:units!inner(label, community_id)), member:members(full_name)'
      )
      .order('paid_at', { ascending: false })
      .limit(2000)
    if (billTitleFilter) q = q.eq('bills.title', billTitleFilter)
    if (dateFrom) q = q.gte('paid_at', dateFrom.toISOString())
    if (dateTo) q = q.lte('paid_at', dateTo.toISOString())
    const { data: payments } = (await q) as { data: any[] | null }
    for (const p of payments ?? []) {
      const bill = Array.isArray(p.bill) ? p.bill[0] : p.bill
      const unit = bill
        ? Array.isArray(bill.unit)
          ? bill.unit[0]
          : bill.unit
        : null
      if (!unit || unit.community_id !== adminMember.community_id) continue
      if (billTitleFilter && bill?.title !== billTitleFilter) continue
      const member = Array.isArray(p.member) ? p.member[0] : p.member
      paymentRows.push({
        paid_at: new Date(p.paid_at).toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
        bill_title: bill?.title ?? '',
        amount: Number(p.amount),
        channel: String(p.channel),
        provider: String(p.provider),
        resident: member?.full_name ?? '',
        unit: unit?.label ?? '',
        reference: p.reference ?? '',
      })
    }
  }

  if (scope === 'bills' || scope === 'all') {
    let q = (admin as any)
      .from('bills')
      .select(
        'title, amount, due_date, status, unit:units(label, community_id), payments(amount)'
      )
      .order('due_date', { ascending: true })
      .limit(2000)
    if (billTitleFilter) q = q.eq('title', billTitleFilter)
    const { data: bills } = (await q) as { data: any[] | null }
    for (const b of bills ?? []) {
      const unit = Array.isArray(b.unit) ? b.unit[0] : b.unit
      if (!unit || unit.community_id !== adminMember.community_id) continue
      const paid = (b.payments ?? []).reduce(
        (s, p) => s + Number(p.amount),
        0
      )
      billRows.push({
        bill_title: b.title,
        unit: unit.label,
        amount_due: Number(b.amount),
        amount_paid: paid,
        outstanding: Math.max(0, Number(b.amount) - paid),
        status: b.status,
        due_date: b.due_date,
      })
    }
  }

  if (scope === 'defaulters' || scope === 'all') {
    // Aggregate from billRows if we have them, otherwise re-query
    const billsSource =
      billRows.length > 0
        ? billRows
        : await (async () => {
            const { data } = await admin
              .from('bills')
              .select(
                'title, amount, due_date, status, unit:units(label, community_id, members(full_name, role)), payments(amount)'
              )
              .limit(2000)
            return (data ?? [])
              .map((b) => {
                const unit = Array.isArray(b.unit) ? b.unit[0] : b.unit
                if (!unit || unit.community_id !== adminMember.community_id)
                  return null
                const paid = (b.payments ?? []).reduce(
                  (s, p) => s + Number(p.amount),
                  0
                )
                return {
                  bill_title: b.title,
                  unit: unit.label,
                  amount_due: Number(b.amount),
                  amount_paid: paid,
                  outstanding: Math.max(0, Number(b.amount) - paid),
                  status: b.status,
                  due_date: b.due_date,
                  _members: (Array.isArray(unit.members)
                    ? unit.members
                    : []
                  )
                    .filter((m) => m.role === 'resident')
                    .map((m) => m.full_name)
                    .join(', '),
                }
              })
              .filter((b): b is NonNullable<typeof b> => b !== null)
          })()

    const byUnit = new Map<
      string,
      { unit: string; unpaid: number; out: number; residents: string }
    >()
    for (const b of billsSource) {
      if (b.outstanding <= 0) continue
      const existing = byUnit.get(b.unit)
      const residents = '_members' in b ? (b as any)._members : ''
      if (existing) {
        existing.unpaid += 1
        existing.out += b.outstanding
        if (!existing.residents && residents) existing.residents = residents
      } else {
        byUnit.set(b.unit, {
          unit: b.unit,
          unpaid: 1,
          out: b.outstanding,
          residents,
        })
      }
    }
    for (const v of Array.from(byUnit.values()).sort(
      (a, b) => b.out - a.out
    )) {
      defaulterRows.push({
        unit: v.unit,
        unpaid_bills: v.unpaid,
        outstanding: v.out,
        residents: v.residents,
      })
    }
  }

  // ---- Format + return ----
  const stamp = todayStamp()
  const safeCommunity = (community?.name ?? 'utilipay').replace(
    /[^a-z0-9]+/gi,
    '-'
  )
  const safeBillSlug = billTitleFilter
    ? '-' + billTitleFilter.replace(/[^a-z0-9]+/gi, '-').toLowerCase()
    : ''

  if (format === 'csv') {
    let body = ''
    let filename = ''
    if (scope === 'payments') {
      body = buildPaymentsCsv(paymentRows)
      filename = `${safeCommunity}-payments${safeBillSlug}-${stamp}.csv`
    } else if (scope === 'bills') {
      body = buildBillsCsv(billRows)
      filename = `${safeCommunity}-bills${safeBillSlug}-${stamp}.csv`
    } else if (scope === 'defaulters') {
      body = buildDefaultersCsv(defaulterRows)
      filename = `${safeCommunity}-defaulters${safeBillSlug}-${stamp}.csv`
    } else {
      body = buildBillsCsv(billRows)
      filename = `${safeCommunity}-bills${safeBillSlug}-${stamp}.csv`
    }
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  }

  // xlsx
  const buf = buildXlsxWorkbook({
    payments: paymentRows,
    bills: billRows,
    defaulters: defaulterRows,
    communityName:
      (community?.name ?? 'UtiliPay') +
      (billTitleFilter ? ` — ${billTitleFilter}` : ''),
    generatedAt: new Date().toLocaleString('en-NG', {
      dateStyle: 'long',
      timeStyle: 'short',
    }),
  })
  const filename = `${safeCommunity}${safeBillSlug}-${stamp}.xlsx`
  return new Response(buf, {
    status: 200,
    headers: {
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
