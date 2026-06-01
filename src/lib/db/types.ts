/**
 * TypeScript shapes that mirror the Supabase schema in src/lib/db/schema.sql.
 * Hand-written for MVP speed; can be regenerated with `supabase gen types typescript` later.
 */

export type UserRole = 'admin' | 'resident'

export type BillStatus = 'open' | 'partial' | 'paid' | 'overdue'

export type PaymentProvider =
  | 'korapay'
  | 'manual_cash'
  | 'manual_transfer'

export type PaymentChannel =
  | 'web'
  | 'ussd'
  | 'whatsapp'
  | 'admin_logged'

export type PaymentAttemptStatus = 'pending' | 'expired' | 'promoted'

export interface Community {
  id: string
  name: string
  created_at: string
}

export interface Unit {
  id: string
  community_id: string
  label: string
  created_at: string
}

export interface Member {
  id: string
  user_id: string | null // null until they create an auth account
  unit_id: string | null // an admin may not belong to a specific unit
  community_id: string
  role: UserRole
  full_name: string
  email: string | null
  phone: string | null
  created_at: string
}

export interface Bill {
  id: string
  unit_id: string
  title: string
  description: string | null
  amount: number // naira
  due_date: string // ISO date
  status: BillStatus
  created_by: string // member.id of the admin who created it
  created_at: string
}

export interface PaymentAttempt {
  id: string
  bill_id: string
  member_id: string
  amount: number
  provider: 'korapay'
  channel: 'web' | 'ussd' | 'whatsapp'
  reference: string // PSP's reference
  status: PaymentAttemptStatus
  created_at: string
}

export interface Payment {
  id: string
  bill_id: string
  member_id: string
  amount: number
  provider: PaymentProvider
  channel: PaymentChannel
  reference: string
  status: 'successful'
  proof_url: string | null // R2/Supabase Storage URL for manual cash proof
  paid_at: string
  created_at: string
}

export interface Receipt {
  id: string
  payment_id: string
  receipt_number: string
  pdf_url: string | null
  created_at: string
}

/**
 * View row used by the admin dashboard "live activity" feed —
 * joins payment + bill + member into a single denormalised row.
 */
export interface AdminPaymentRow {
  payment_id: string
  amount: number
  channel: PaymentChannel
  provider: PaymentProvider
  paid_at: string
  bill_title: string
  bill_id: string
  unit_label: string
  unit_id: string
  member_full_name: string
  member_id: string
}
