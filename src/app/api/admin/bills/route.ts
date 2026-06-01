/**
 * POST /api/admin/bills
 *
 * Create a new bill across one, many, or every unit in the admin's community.
 *
 * Body:
 *   {
 *     title: string
 *     description?: string
 *     amount: number              // naira
 *     due_date: string            // ISO date
 *     target: 'all' | 'units'
 *     unit_ids?: string[]         // required when target === 'units'
 *   }
 *
 * Returns:
 *   { createdCount: number, billIds: string[] }
 */

import { NextResponse } from 'next/server'
import { z } from 'zod'

import { createClient as createSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdmin } from '@/lib/supabase/admin'

const BillSchema = z
  .object({
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(400).optional(),
    amount: z.number().positive().max(50_000_000),
    due_date: z.string().refine((v) => !Number.isNaN(Date.parse(v)), {
      message: 'invalid date',
    }),
    target: z.enum(['all', 'units']),
    unit_ids: z.array(z.string().uuid()).optional(),
  })
  .refine(
    (v) =>
      v.target === 'all' ||
      (v.target === 'units' && (v.unit_ids?.length ?? 0) > 0),
    { message: 'unit_ids required when target is "units"' }
  )

export async function POST(req: Request) {
  const body = await req.json().catch(() => null)
  const parsed = BillSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_body', issues: parsed.error.issues },
      { status: 400 }
    )
  }

  // Authenticate the admin
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
  }

  const admin = getSupabaseAdmin()

  // Find the admin member row
  const { data: adminMember, error: adminErr } = (await admin
    .from('members')
    .select('id, community_id, role')
    .eq('user_id', user.id)
    .eq('role', 'admin')
    .maybeSingle()) as {
    data: { id: string; community_id: string; role: string } | null
    error: { message?: string } | null
  }
  if (adminErr || !adminMember) {
    return NextResponse.json(
      { error: 'not_an_admin', detail: adminErr?.message },
      { status: 403 }
    )
  }

  // Resolve target unit IDs
  let unitIds: string[]
  if (parsed.data.target === 'all') {
    const { data: units, error: unitsErr } = (await admin
      .from('units')
      .select('id')
      .eq('community_id', adminMember.community_id)) as {
      data: { id: string }[] | null
      error: { message?: string } | null
    }
    if (unitsErr || !units) {
      return NextResponse.json(
        { error: 'units_lookup_failed', detail: unitsErr?.message },
        { status: 500 }
      )
    }
    unitIds = units.map((u) => u.id)
  } else {
    // Validate that picked units belong to admin's community
    const wanted = parsed.data.unit_ids ?? []
    const { data: units, error: unitsErr } = (await admin
      .from('units')
      .select('id, community_id')
      .in('id', wanted)) as {
      data: { id: string; community_id: string }[] | null
      error: { message?: string } | null
    }
    if (unitsErr || !units) {
      return NextResponse.json(
        { error: 'units_lookup_failed', detail: unitsErr?.message },
        { status: 500 }
      )
    }
    unitIds = units
      .filter((u) => u.community_id === adminMember.community_id)
      .map((u) => u.id)
  }

  if (unitIds.length === 0) {
    return NextResponse.json(
      { error: 'no_units_in_target' },
      { status: 400 }
    )
  }

  // Insert one bill per target unit
  const rows = unitIds.map((unitId) => ({
    unit_id: unitId,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    amount: parsed.data.amount,
    due_date: parsed.data.due_date,
    created_by: adminMember.id,
    status: 'open',
  }))

  const { data: inserted, error: insertErr } = await admin
    .from('bills')
    .insert(rows)
    .select('id')

  if (insertErr || !inserted) {
    return NextResponse.json(
      { error: 'insert_failed', detail: insertErr?.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    createdCount: inserted.length,
    billIds: inserted.map((b) => b.id),
  })
}
