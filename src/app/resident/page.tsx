'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatNaira } from '@/lib/utils'

type BillRow = {
  id: string
  title: string
  description: string | null
  amount: number
  due_date: string
  status: 'open' | 'partial' | 'paid' | 'overdue'
  payments: { amount: number }[]
}

type PaymentRow = {
  id: string
  amount: number
  channel: 'web' | 'ussd' | 'whatsapp' | 'admin_logged'
  provider: 'korapay' | 'manual_cash' | 'manual_transfer'
  paid_at: string
  reference: string
  bill: { id: string; title: string } | { id: string; title: string }[] | null
}

function channelLabel(c: PaymentRow['channel']): string {
  return c === 'web'
    ? 'Web'
    : c === 'ussd'
      ? 'USSD'
      : c === 'whatsapp'
        ? 'WhatsApp'
        : 'Cash / Transfer'
}

export default function ResidentDashboard() {
  const { residentMember, adminMember, signOut } = useAuth()
  const [bills, setBills] = useState<BillRow[]>([])
  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [unit, setUnit] = useState<{ label: string; community: string } | null>(
    null
  )
  const [payingBillId, setPayingBillId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!residentMember) return
    setLoading(true)

    try {
      // Unit + community (for header)
      if (residentMember.unit_id) {
        const { data: unitRow } = await supabase
          .from('units')
          .select('label, community:communities(name)')
          .eq('id', residentMember.unit_id)
          .single()
        if (unitRow) {
          const community = Array.isArray(unitRow.community)
            ? unitRow.community[0]
            : unitRow.community
          setUnit({
            label: unitRow.label,
            community: community?.name ?? '—',
          })
        }
      }

      // Bills on this unit + their payments (sum locally)
      const { data: billsData } = residentMember.unit_id
        ? await supabase
            .from('bills')
            .select('id, title, description, amount, due_date, status, payments(amount)')
            .eq('unit_id', residentMember.unit_id)
            .order('due_date', { ascending: true })
        : { data: [] }

      // Payments made by THIS member specifically
      const { data: paymentsData } = await supabase
        .from('payments')
        .select('id, amount, channel, provider, paid_at, reference, bill:bills(id, title)')
        .eq('member_id', residentMember.id)
        .order('paid_at', { ascending: false })
        .limit(20)

      setBills((billsData as BillRow[]) ?? [])
      setPayments((paymentsData as PaymentRow[]) ?? [])
    } catch (err) {
      // Swallow benign Supabase auth lock aborts (dev HMR only). Real errors
      // still log so we can debug.
      const msg = err instanceof Error ? err.message : ''
      if (!/AbortError/i.test(msg) && !/Lock broken/i.test(msg)) {
        console.error('[resident] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [residentMember])

  useEffect(() => {
    load()
  }, [load])

  // Real-time: re-fetch when payments or bills change on this unit
  useEffect(() => {
    if (!residentMember?.unit_id) return
    const channel = supabase
      .channel('resident-feed')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payments' },
        () => load()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bills' },
        () => load()
      )
      .subscribe()
    return () => {
      channel.unsubscribe()
    }
  }, [residentMember?.unit_id, load])

  const startWebPayment = async (billId: string) => {
    try {
      setPayingBillId(billId)
      const res = await fetch('/api/payments/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ billId, channel: 'web' }),
      })
      const data = await res.json()
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(
          data.error
            ? `${data.error}${data.detail ? `: ${data.detail}` : ''}`
            : 'Failed to start payment'
        )
      }
      window.location.href = data.checkoutUrl as string
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
      setPayingBillId(null)
    }
  }

  // Derived totals
  const outstanding = bills.reduce((sum, b) => {
    const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Math.max(0, Number(b.amount) - paid)
  }, 0)
  const unpaidCount = bills.filter((b) => b.status !== 'paid').length

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/images/utilipay_logo.png"
              alt=""
              width={28}
              height={28}
            />
            <span className="font-display font-bold tracking-tight">
              UtiliPay
            </span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:flex flex-col text-right leading-tight">
              <span className="font-medium text-foreground">
                {residentMember?.full_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {unit?.label} · {unit?.community}
              </span>
            </div>
            {adminMember && (
              <Link href="/admin">
                <Button variant="outline" size="sm">
                  Admin view
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-10 max-w-5xl">
        {/* Hero stat */}
        <div className="mb-12">
          <p className="text-xs uppercase tracking-[0.15em] text-muted-foreground font-semibold mb-3">
            Outstanding on your unit
          </p>
          <div className="flex items-end gap-4 flex-wrap">
            <h1 className="font-display text-5xl md:text-6xl font-bold tracking-tight">
              {formatNaira(outstanding)}
            </h1>
            <div className="text-sm text-muted-foreground mb-3">
              across {unpaidCount} unpaid {unpaidCount === 1 ? 'bill' : 'bills'}
            </div>
          </div>
        </div>

        {/* Bills */}
        <section className="mb-12">
          <h2 className="font-display text-xl font-bold mb-4">Your bills</h2>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : bills.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No bills on this unit yet. The admin hasn't sent any out.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {bills.map((bill) => {
                const paidSum = bill.payments.reduce(
                  (s, p) => s + Number(p.amount),
                  0
                )
                const due = Math.max(0, Number(bill.amount) - paidSum)
                const dueDate = new Date(bill.due_date).toLocaleDateString(
                  'en-NG',
                  { day: 'numeric', month: 'short', year: 'numeric' }
                )
                return (
                  <Card key={bill.id}>
                    <CardContent className="p-5 flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold truncate">
                            {bill.title}
                          </h3>
                          <Badge
                            variant={
                              bill.status === 'paid'
                                ? 'paid'
                                : bill.status === 'partial'
                                  ? 'partial'
                                  : bill.status === 'overdue'
                                    ? 'overdue'
                                    : 'open'
                            }
                          >
                            {bill.status}
                          </Badge>
                        </div>
                        {bill.description && (
                          <p className="text-sm text-muted-foreground mb-1">
                            {bill.description}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Due {dueDate} ·{' '}
                          {formatNaira(paidSum)} of{' '}
                          {formatNaira(Number(bill.amount))} paid
                        </p>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">
                            {due > 0 ? 'Due now' : 'Settled'}
                          </div>
                          <div
                            className={cn(
                              'font-display text-xl font-bold',
                              due > 0 ? 'text-foreground' : 'text-primary'
                            )}
                          >
                            {formatNaira(due)}
                          </div>
                        </div>
                        {due > 0 && (
                          <Button
                            onClick={() => startWebPayment(bill.id)}
                            disabled={payingBillId !== null}
                            size="sm"
                          >
                            {payingBillId === bill.id ? 'Starting…' : 'Pay'}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Payment history */}
        <section>
          <h2 className="font-display text-xl font-bold mb-4">
            Payment history
          </h2>
          {payments.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Your payments will show up here.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Bill</th>
                      <th className="text-left font-medium px-4 py-3">Amount</th>
                      <th className="text-left font-medium px-4 py-3">Channel</th>
                      <th className="text-left font-medium px-4 py-3">Date</th>
                      <th className="text-right font-medium px-4 py-3">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => {
                      const bill = Array.isArray(p.bill) ? p.bill[0] : p.bill
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="px-4 py-3 font-medium">
                            {bill?.title ?? '—'}
                          </td>
                          <td className="px-4 py-3">{formatNaira(Number(p.amount))}</td>
                          <td className="px-4 py-3">{channelLabel(p.channel)}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {new Date(p.paid_at).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Link
                              href={`/receipts/${p.id}`}
                              className="text-primary text-xs font-medium hover:underline"
                              target="_blank"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  )
}
