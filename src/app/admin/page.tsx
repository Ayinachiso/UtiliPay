'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Bell,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  Plus,
  Sparkles,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import {
  NewBillDialog,
  type UnitOption,
} from '@/components/admin/new-bill-dialog'
import { NotifyDefaultersDialog } from '@/components/admin/notify-defaulters-dialog'
import { StatementDialog } from '@/components/admin/statement-dialog'
import { cn, formatNaira } from '@/lib/utils'

/* ============================================================
   Data types — narrowed to what the dashboard renders
   ============================================================ */

type PaymentRow = {
  id: string
  amount: number
  channel: 'web' | 'ussd' | 'whatsapp' | 'admin_logged'
  provider: 'korapay' | 'manual_cash' | 'manual_transfer'
  paid_at: string
  reference: string
  bill: { id: string; title: string; unit: { label: string } | { label: string }[] | null } | null | any
  member: { full_name: string } | { full_name: string }[] | null
}

type BillRow = {
  id: string
  title: string
  amount: number
  due_date: string
  status: 'open' | 'partial' | 'paid' | 'overdue'
  unit: { id: string; label: string } | { id: string; label: string }[] | null
  payments: { amount: number }[]
}

type UnitRow = { id: string; label: string }

/* ============================================================
   Small SVG charts — inline, no library
   ============================================================ */

function ChannelMixDonut({
  data,
}: {
  data: { label: string; count: number; color: string }[]
}) {
  const total = data.reduce((s, d) => s + d.count, 0) || 1
  const realTotal = data.reduce((s, d) => s + d.count, 0)
  const r = 38
  const C = 2 * Math.PI * r
  let offset = 0
  return (
    <div className="flex items-center gap-5">
      <div className="relative w-28 h-28 shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="14"
          />
          {data.map((d) => {
            const len = (d.count / total) * C
            const seg = (
              <circle
                key={d.label}
                cx="50"
                cy="50"
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth="14"
                strokeDasharray={`${len} ${C}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
            offset += len
            return seg
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl tracking-tighter nums-tabular leading-none">
            {realTotal}
          </span>
          <span className="text-[10px] tracking-eyebrow text-muted-foreground font-semibold mt-1">
            payments
          </span>
        </div>
      </div>
      <ul className="flex-1 space-y-1.5 min-w-0">
        {data.map((d) => (
          <li
            key={d.label}
            className="flex items-center justify-between gap-2 text-xs"
          >
            <span className="flex items-center gap-2 truncate">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: d.color }}
              />
              <span className="truncate">{d.label}</span>
            </span>
            <span className="font-medium tabular-nums">
              {realTotal === 0 ? '0%' : `${Math.round((d.count / total) * 100)}%`}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TrendBars({
  data,
}: {
  data: { label: string; amount: number }[]
}) {
  const max = Math.max(1, ...data.map((d) => d.amount))
  return (
    <div className="flex flex-col">
      <div className="flex items-end gap-1 h-24">
        {data.map((d) => {
          const h = Math.max(2, (d.amount / max) * 96)
          return (
            <div
              key={d.label}
              className="flex-1 group relative flex items-end"
              title={`${d.label}: ${formatNaira(d.amount)}`}
            >
              <div
                className="w-full rounded-sm bg-primary/30 group-hover:bg-primary transition-colors"
                style={{ height: `${h}px` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex justify-between text-[10px] tracking-eyebrow text-muted-foreground font-semibold mt-2">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  )
}

/* ============================================================
   Channel display helpers
   ============================================================ */

function channelLabel(c: PaymentRow['channel']): string {
  return c === 'web'
    ? 'Web'
    : c === 'ussd'
      ? 'USSD'
      : c === 'whatsapp'
        ? 'WhatsApp'
        : 'Cash'
}

const CHANNEL_COLORS: Record<PaymentRow['channel'], string> = {
  web: '#1B4332',
  ussd: '#4D9374',
  whatsapp: '#C9A24F',
  admin_logged: '#74B091',
}

/* ============================================================
   Page
   ============================================================ */

const ALL_BILLS = '__all__'

export default function AdminDashboard() {
  const { adminMember, residentMember, signOut } = useAuth()

  const [payments, setPayments] = useState<PaymentRow[]>([])
  const [bills, setBills] = useState<BillRow[]>([])
  const [units, setUnits] = useState<UnitRow[]>([])
  const [communityName, setCommunityName] = useState<string>('your estate')
  const [loading, setLoading] = useState(true)

  const [newBillOpen, setNewBillOpen] = useState(false)
  const [notifyOpen, setNotifyOpen] = useState(false)
  const [statementOpen, setStatementOpen] = useState(false)

  /** "__all__" or a specific bill title. */
  const [selectedTitle, setSelectedTitle] = useState<string>(ALL_BILLS)

  /** Live activity date-range state. Default = today only. */
  type RangePreset = 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'custom'
  const [rangePreset, setRangePreset] = useState<RangePreset>('today')
  const [rangeOpen, setRangeOpen] = useState(false)
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [customTo, setCustomTo] = useState(
    () => new Date().toISOString().split('T')[0]
  )

  const load = useCallback(async () => {
    if (!adminMember) return

    try {
      const [paymentsRes, billsRes, unitsRes, communityRes] =
        await Promise.all([
          // Bumped to 100 so per-bill filtering has enough data to show meaningful
          // channel mix and trend even when one bill has many payments.
          supabase
            .from('payments')
            .select(
              'id, amount, channel, provider, paid_at, reference, bill:bills(id, title, unit:units(label)), member:members(full_name)'
            )
            .order('paid_at', { ascending: false })
            .limit(100),
          supabase
            .from('bills')
            .select(
              'id, title, amount, due_date, status, unit:units(id, label), payments(amount)'
            )
            .order('due_date', { ascending: true })
            .limit(500),
          supabase
            .from('units')
            .select('id, label')
            .eq('community_id', adminMember.community_id)
            .order('label', { ascending: true }),
          supabase
            .from('communities')
            .select('name')
            .eq('id', adminMember.community_id)
            .single(),
        ])

      setPayments((paymentsRes.data as PaymentRow[]) ?? [])
      setBills((billsRes.data as BillRow[]) ?? [])
      setUnits((unitsRes.data as UnitRow[]) ?? [])
      if (communityRes.data?.name) setCommunityName(communityRes.data.name)
    } catch (err) {
      const msg = err instanceof Error ? err.message : ''
      if (!/AbortError/i.test(msg) && !/Lock broken/i.test(msg)) {
        console.error('[admin] load failed:', err)
      }
    } finally {
      setLoading(false)
    }
  }, [adminMember])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const channel = supabase
      .channel('admin-feed')
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
  }, [load])

  /* ============================================================
     BILL TAB STRIP — distinct titles with unit counts
     ============================================================ */

  const billTabs = useMemo(() => {
    const map = new Map<
      string,
      { title: string; unitCount: number; nextDue: string }
    >()
    for (const b of bills) {
      const existing = map.get(b.title)
      if (existing) {
        existing.unitCount += 1
        if (b.due_date < existing.nextDue) existing.nextDue = b.due_date
      } else {
        map.set(b.title, {
          title: b.title,
          unitCount: 1,
          nextDue: b.due_date,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      // Newest due first, then alphabetical
      if (b.nextDue !== a.nextDue) return b.nextDue.localeCompare(a.nextDue)
      return a.title.localeCompare(b.title)
    })
  }, [bills])

  // If the currently-selected title disappears (e.g. all bills with that title
  // were deleted), reset to All.
  useEffect(() => {
    if (selectedTitle === ALL_BILLS) return
    if (!billTabs.find((b) => b.title === selectedTitle)) {
      setSelectedTitle(ALL_BILLS)
    }
  }, [billTabs, selectedTitle])

  const isFiltered = selectedTitle !== ALL_BILLS

  /* ============================================================
     FILTERED data — everything below the tab strip uses these
     ============================================================ */

  const filteredBills = useMemo(
    () =>
      isFiltered ? bills.filter((b) => b.title === selectedTitle) : bills,
    [bills, isFiltered, selectedTitle]
  )

  const filteredPayments = useMemo(() => {
    if (!isFiltered) return payments
    return payments.filter((p) => {
      const bill = Array.isArray(p.bill) ? p.bill[0] : p.bill
      return bill?.title === selectedTitle
    })
  }, [payments, isFiltered, selectedTitle])

  // Active bill cycle metadata — shown next to the hero when filtered
  const activeBillMeta = useMemo(() => {
    if (!isFiltered) return null
    const sample = filteredBills[0]
    if (!sample) return null
    return {
      title: sample.title,
      dueDate: sample.due_date,
      perUnit: Number(sample.amount),
      totalUnits: filteredBills.length,
      paidUnits: filteredBills.filter((b) => b.status === 'paid').length,
    }
  }, [filteredBills, isFiltered])

  /* ============================================================
     DERIVED METRICS — computed from filteredBills + filteredPayments
     ============================================================ */

  const totalCollected = filteredPayments.reduce(
    (s, p) => s + Number(p.amount),
    0
  )

  const billsPaidCount = filteredBills.filter(
    (b) => b.status === 'paid'
  ).length

  const outstanding = filteredBills.reduce((sum, b) => {
    const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0)
    return sum + Math.max(0, Number(b.amount) - paid)
  }, 0)

  const defaulters = useMemo(() => {
    type D = { unitId: string; unitLabel: string; due: number; bills: number }
    const map = new Map<string, D>()
    for (const b of filteredBills) {
      if (b.status === 'paid') continue
      const unit = Array.isArray(b.unit) ? b.unit[0] : b.unit
      if (!unit) continue
      const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0)
      const due = Math.max(0, Number(b.amount) - paid)
      if (due === 0) continue
      const existing = map.get(unit.id)
      if (existing) {
        existing.due += due
        existing.bills += 1
      } else {
        map.set(unit.id, {
          unitId: unit.id,
          unitLabel: unit.label,
          due,
          bills: 1,
        })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.due - a.due)
  }, [filteredBills])

  const channelMix = useMemo(() => {
    const counts: Record<PaymentRow['channel'], number> = {
      web: 0,
      ussd: 0,
      whatsapp: 0,
      admin_logged: 0,
    }
    for (const p of filteredPayments) counts[p.channel] += 1
    return [
      { label: 'Web', count: counts.web, color: CHANNEL_COLORS.web },
      { label: 'USSD', count: counts.ussd, color: CHANNEL_COLORS.ussd },
      {
        label: 'WhatsApp',
        count: counts.whatsapp,
        color: CHANNEL_COLORS.whatsapp,
      },
      {
        label: 'Cash at gate',
        count: counts.admin_logged,
        color: CHANNEL_COLORS.admin_logged,
      },
    ]
  }, [filteredPayments])

  const trend = useMemo(() => {
    const days: { label: string; amount: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      days.push({
        label: d.toLocaleDateString('en-NG', {
          day: 'numeric',
          month: 'short',
        }),
        amount: 0,
      })
    }
    for (const p of filteredPayments) {
      const d = new Date(p.paid_at)
      d.setHours(0, 0, 0, 0)
      const idx = days.findIndex(
        (x) =>
          x.label ===
          d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
      )
      if (idx >= 0) days[idx].amount += Number(p.amount)
    }
    return days
  }, [filteredPayments])

  /* ============================================================
     LIVE ACTIVITY date range — composes with the bill filter
     ============================================================ */

  const activeRange = useMemo(() => {
    const startOfDay = (d: Date) => {
      const x = new Date(d)
      x.setHours(0, 0, 0, 0)
      return x
    }
    const endOfDay = (d: Date) => {
      const x = new Date(d)
      x.setHours(23, 59, 59, 999)
      return x
    }
    const now = new Date()
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
    const fmtY = (d: Date) =>
      d.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

    switch (rangePreset) {
      case 'today':
        return {
          from: startOfDay(now),
          to: endOfDay(now),
          title: "Today's activity.",
          subtitle: fmtY(now),
          shortLabel: 'Today',
        }
      case 'yesterday': {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        return {
          from: startOfDay(y),
          to: endOfDay(y),
          title: "Yesterday's activity.",
          subtitle: fmtY(y),
          shortLabel: 'Yesterday',
        }
      }
      case '7days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 6)
        return {
          from: startOfDay(start),
          to: endOfDay(now),
          title: 'Last seven days.',
          subtitle: `${fmt(start)} to ${fmtY(now)}`,
          shortLabel: 'Last 7 days',
        }
      }
      case '30days': {
        const start = new Date(now)
        start.setDate(start.getDate() - 29)
        return {
          from: startOfDay(start),
          to: endOfDay(now),
          title: 'Last thirty days.',
          subtitle: `${fmt(start)} to ${fmtY(now)}`,
          shortLabel: 'Last 30 days',
        }
      }
      case 'month': {
        const start = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
          from: startOfDay(start),
          to: endOfDay(now),
          title: 'This month so far.',
          subtitle: `${fmt(start)} to ${fmtY(now)}`,
          shortLabel: 'This month',
        }
      }
      case 'custom': {
        const from = customFrom
          ? startOfDay(new Date(customFrom))
          : startOfDay(now)
        const to = customTo ? endOfDay(new Date(customTo)) : endOfDay(now)
        return {
          from,
          to,
          title: 'Custom range.',
          subtitle: `${fmt(from)} to ${fmtY(to)}`,
          shortLabel: `${fmt(from)} – ${fmt(to)}`,
        }
      }
    }
  }, [rangePreset, customFrom, customTo])

  const paymentsInRange = useMemo(() => {
    return filteredPayments.filter((p) => {
      const t = new Date(p.paid_at).getTime()
      return t >= activeRange.from.getTime() && t <= activeRange.to.getTime()
    })
  }, [filteredPayments, activeRange])

  const isLiveRange = rangePreset === 'today'

  // Distinct bill titles with defaulter counts (for the notify dialog).
  // Always computed from ALL bills so the dialog list is complete; the
  // currently-selected one becomes the default pick.
  const billOptions = useMemo(() => {
    const grouped = new Map<
      string,
      { defaultingUnits: number; outstanding: number }
    >()
    for (const b of bills) {
      if (b.status === 'paid') continue
      const paid = b.payments.reduce((s, p) => s + Number(p.amount), 0)
      const due = Math.max(0, Number(b.amount) - paid)
      if (due === 0) continue
      const existing = grouped.get(b.title)
      if (existing) {
        existing.defaultingUnits += 1
        existing.outstanding += due
      } else {
        grouped.set(b.title, { defaultingUnits: 1, outstanding: due })
      }
    }
    return Array.from(grouped.entries())
      .map(([title, v]) => ({ title, ...v }))
      .sort((a, b) => b.defaultingUnits - a.defaultingUnits)
  }, [bills])

  function downloadExport(
    format: 'csv' | 'xlsx',
    scope: 'payments' | 'bills' | 'all'
  ) {
    const params = new URLSearchParams({ format, scope })
    if (isFiltered) params.set('bill_title', selectedTitle)
    const url = `/api/admin/export?${params.toString()}`
    window.open(url, '_blank')
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ============================================================
          HEADER
         ============================================================ */}
      <header className="hairline-b sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container flex items-center justify-between h-16">
          <Link
            href="/admin"
            className="flex items-center gap-3"
            aria-label="UtiliPay Admin"
          >
            <Logo size={28} />
            <span className="hidden sm:inline-flex items-center text-[10px] tracking-eyebrow font-semibold text-muted-foreground border border-border rounded-full px-2.5 py-0.5">
              Admin
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm">
            <ThemeToggle />
            {residentMember && (
              <Link href="/resident">
                <Button variant="ghost" size="sm">
                  Resident view
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              Sign out
            </Button>
          </nav>
        </div>
      </header>

      {/* ============================================================
          BILL PICKER TAB STRIP — sub-nav under the header
         ============================================================ */}
      <div className="hairline-b sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70">
        <div className="container max-w-6xl">
          <div className="flex items-center gap-1 overflow-x-auto py-2 -mx-1 px-1 scrollbar-thin">
            <BillTab
              label="All bills"
              count={bills.length}
              active={selectedTitle === ALL_BILLS}
              onClick={() => setSelectedTitle(ALL_BILLS)}
            />
            {billTabs.map((b) => (
              <BillTab
                key={b.title}
                label={b.title}
                count={b.unitCount}
                active={selectedTitle === b.title}
                onClick={() => setSelectedTitle(b.title)}
              />
            ))}
          </div>
        </div>
      </div>

      <main className="container max-w-6xl pb-20">
        {/* ============================================================
            HERO  outstanding + quick actions
           ============================================================ */}
        <section className="pt-10 lg:pt-14 pb-10 hairline-b">
          <div className="flex items-baseline justify-between gap-6 flex-wrap mb-2">
            <p className="text-[10px] tracking-eyebrow font-semibold text-primary">
              Today · {communityName}
            </p>
            <p className="text-[10px] tracking-eyebrow font-semibold text-muted-foreground hidden sm:block">
              Welcome back, {adminMember?.full_name}
            </p>
          </div>

          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 lg:gap-16 items-end">
            <div>
              <p className="text-[11px] tracking-eyebrow font-semibold text-muted-foreground mb-3">
                {isFiltered
                  ? `Outstanding on "${activeBillMeta?.title}"`
                  : 'Outstanding across the estate'}
              </p>
              <h1 className="font-display text-5xl md:text-6xl lg:text-7xl leading-none tracking-tightest nums-tabular mb-4">
                {formatNaira(outstanding)}
              </h1>
              {isFiltered && activeBillMeta ? (
                <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 opacity-70" />
                    Due{' '}
                    <span className="text-foreground font-medium">
                      {new Date(activeBillMeta.dueDate).toLocaleDateString(
                        'en-NG',
                        { day: 'numeric', month: 'long', year: 'numeric' }
                      )}
                    </span>
                  </span>
                  <span>
                    <span className="text-foreground font-medium">
                      {formatNaira(activeBillMeta.perUnit)}
                    </span>{' '}
                    per unit
                  </span>
                  <span>
                    <span className="text-foreground font-medium">
                      {activeBillMeta.paidUnits} of {activeBillMeta.totalUnits}
                    </span>{' '}
                    units paid
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Across{' '}
                  <span className="text-foreground font-medium">
                    {filteredBills.filter((b) => b.status !== 'paid').length}{' '}
                    unpaid bills
                  </span>{' '}
                  in{' '}
                  <span className="text-foreground font-medium">
                    {defaulters.length} units
                  </span>
                  .
                </p>
              )}
            </div>

            {/* Quick actions */}
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 lg:items-end">
              <Button
                size="lg"
                onClick={() => setNewBillOpen(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                New bill
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setNotifyOpen(true)}
                disabled={billOptions.length === 0}
                className="w-full sm:w-auto"
              >
                <Bell className="h-4 w-4" />
                {isFiltered ? 'Remind on this bill' : 'Remind defaulters'}
              </Button>
            </div>
          </div>
        </section>

        {/* ============================================================
            SUMMARY STATS
           ============================================================ */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border hairline-b">
          <StatCell
            label={isFiltered ? 'Collected on this bill' : 'Collected, last 100'}
            value={formatNaira(totalCollected)}
            accent="emerald"
          />
          <StatCell
            label="Units paid"
            value={`${billsPaidCount} / ${filteredBills.length}`}
          />
          <StatCell
            label="Defaulting units"
            value={defaulters.length.toString()}
            accent={defaulters.length > 0 ? 'destructive' : 'neutral'}
          />
          <StatCell
            label="Channels used"
            value={channelMix.filter((c) => c.count > 0).length.toString()}
          />
        </section>

        {/* ============================================================
            ANALYTICS  donut + trend
           ============================================================ */}
        <section className="grid md:grid-cols-2 gap-px bg-border hairline-b">
          <div className="bg-background p-6 lg:p-8">
            <div className="flex items-baseline justify-between mb-5">
              <p className="text-[11px] tracking-eyebrow font-semibold text-muted-foreground">
                Channel mix
              </p>
              <p className="text-[10px] text-muted-foreground">
                {filteredPayments.length} payments
                {isFiltered ? ' on this bill' : ''}
              </p>
            </div>
            <ChannelMixDonut data={channelMix} />
          </div>

          <div className="bg-background p-6 lg:p-8">
            <div className="flex items-baseline justify-between mb-5">
              <p className="text-[11px] tracking-eyebrow font-semibold text-muted-foreground">
                Collection trend
              </p>
              <p className="text-[10px] text-muted-foreground">
                Last 14 days
                {isFiltered ? ' · this bill only' : ''}
              </p>
            </div>
            <TrendBars data={trend} />
          </div>
        </section>

        {/* ============================================================
            EXPORT
           ============================================================ */}
        <section className="hairline-b py-6">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[11px] tracking-eyebrow font-semibold text-muted-foreground mb-1">
                Take it offline
              </p>
              <h3 className="font-display text-2xl tracking-tighter">
                {isFiltered
                  ? `Export "${selectedTitle}".`
                  : 'Export to spreadsheet.'}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                size="sm"
                onClick={() => setStatementOpen(true)}
              >
                <FileText className="h-3.5 w-3.5" />
                Statement (date range)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExport('xlsx', 'all')}
              >
                <Download className="h-3.5 w-3.5" />
                Full report (XLSX)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExport('csv', 'payments')}
              >
                <Download className="h-3.5 w-3.5" />
                Payments (CSV)
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => downloadExport('csv', 'bills')}
              >
                <Download className="h-3.5 w-3.5" />
                Bills (CSV)
              </Button>
            </div>
          </div>
        </section>

        {/* ============================================================
            LIVE ACTIVITY  original heading + inline Custom range trigger
           ============================================================ */}
        <section className="py-10 hairline-b">
          <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
            {/* Heading — original styling preserved when on Today */}
            <div>
              <p className="text-[11px] tracking-eyebrow font-semibold text-primary mb-1">
                {isLiveRange ? (
                  <>
                    <Sparkles className="inline-block h-3 w-3 mr-1 -mt-0.5" />
                    Live
                  </>
                ) : (
                  'Activity'
                )}
              </p>
              <h2 className="font-display text-2xl tracking-tighter">
                {isLiveRange ? "Today's activity." : activeRange.title}
              </h2>
              {!isLiveRange && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  {activeRange.subtitle}
                  {isFiltered ? ` · ${selectedTitle}` : ''}
                </p>
              )}
            </div>

            {/* Right side: streaming + custom range trigger */}
            <div className="flex items-center gap-2 flex-wrap">
              {isLiveRange && (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground mr-1">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                  streaming
                </span>
              )}
              <button
                type="button"
                onClick={() => setRangeOpen((o) => !o)}
                aria-expanded={rangeOpen}
                className={cn(
                  'inline-flex items-center gap-2 h-9 px-3 rounded-md',
                  'border border-input bg-card text-foreground text-xs font-medium',
                  'hover:bg-accent/30 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
                )}
              >
                <Calendar className="h-3.5 w-3.5 opacity-70" />
                <span>
                  {isLiveRange ? 'Custom range' : activeRange.shortLabel}
                </span>
                <ChevronDown
                  className={cn(
                    'h-3 w-3 opacity-50 transition-transform',
                    rangeOpen && 'rotate-180'
                  )}
                />
              </button>
              {!isLiveRange && (
                <button
                  type="button"
                  onClick={() => {
                    setRangePreset('today')
                    setRangeOpen(false)
                  }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Collapsible inline range picker */}
          {rangeOpen && (
            <div className="rounded-lg border border-border bg-card p-4 mb-6 animate-fade-in">
              <p className="text-[10px] tracking-eyebrow font-semibold text-muted-foreground mb-3">
                Quick range
              </p>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {(
                  [
                    { key: 'today', label: 'Today' },
                    { key: 'yesterday', label: 'Yesterday' },
                    { key: '7days', label: 'Last 7 days' },
                    { key: '30days', label: 'Last 30 days' },
                    { key: 'month', label: 'This month' },
                    { key: 'custom', label: 'Custom' },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setRangePreset(p.key)}
                    aria-pressed={rangePreset === p.key}
                    className={cn(
                      'shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                      rangePreset === p.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {rangePreset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-4">
                  <label className="sr-only" htmlFor="range-from">
                    From
                  </label>
                  <input
                    id="range-from"
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-8 px-2.5 rounded-md border border-input bg-background text-foreground text-xs focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <span>to</span>
                  <label className="sr-only" htmlFor="range-to">
                    To
                  </label>
                  <input
                    id="range-to"
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-8 px-2.5 rounded-md border border-input bg-background text-foreground text-xs focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              )}

              <div className="hairline-t pt-3 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  {paymentsInRange.length}{' '}
                  {paymentsInRange.length === 1 ? 'payment' : 'payments'} in
                  this range
                </p>
                <button
                  type="button"
                  onClick={() => setRangeOpen(false)}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : paymentsInRange.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {rangePreset === 'today' ? (
                  <>No payments yet today. They will appear here the moment a resident pays.</>
                ) : (
                  <>
                    No payments in this range
                    {isFiltered ? ' on this bill' : ''}.
                  </>
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Bill</th>
                    <th className="text-left font-semibold px-4 py-3">Resident</th>
                    <th className="text-left font-semibold px-4 py-3">Unit</th>
                    <th className="text-left font-semibold px-4 py-3">Channel</th>
                    <th className="text-right font-semibold px-4 py-3">Amount</th>
                    <th className="text-right font-semibold px-4 py-3">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {paymentsInRange.map((p) => {
                    const bill = Array.isArray(p.bill) ? p.bill[0] : p.bill
                    const member = Array.isArray(p.member)
                      ? p.member[0]
                      : p.member
                    const unit = bill?.unit
                      ? Array.isArray(bill.unit)
                        ? bill.unit[0]
                        : bill.unit
                      : null
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-accent/20 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium">
                          {bill?.title ?? '—'}
                        </td>
                        <td className="px-4 py-3">{member?.full_name ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {unit?.label ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center text-[10px] tracking-wider uppercase font-semibold px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: `${CHANNEL_COLORS[p.channel]}22`,
                              color: CHANNEL_COLORS[p.channel],
                            }}
                          >
                            {channelLabel(p.channel)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-display tracking-tighter nums-tabular">
                          {formatNaira(Number(p.amount))}
                        </td>
                        <td className="px-4 py-3 text-right text-xs text-muted-foreground nums-tabular">
                          {new Date(p.paid_at).toLocaleString('en-NG', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ============================================================
            DEFAULTERS
           ============================================================ */}
        <section className="py-10">
          <div className="flex items-baseline justify-between gap-3 mb-6">
            <div>
              <p className="text-[11px] tracking-eyebrow font-semibold text-muted-foreground mb-1">
                Outstanding by unit
              </p>
              <h2 className="font-display text-2xl tracking-tighter">
                {isFiltered ? 'Who has not paid this bill.' : 'Defaulting units.'}
              </h2>
            </div>
            {defaulters.length > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setNotifyOpen(true)}
                className="text-primary group"
              >
                Send reminders
                <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Button>
            )}
          </div>

          {defaulters.length === 0 ? (
            <div className="border border-dashed border-border rounded-lg py-12 text-center">
              <p className="text-sm text-muted-foreground">
                {isFiltered
                  ? 'Every unit has paid this bill in full.'
                  : 'Every unit is current. Rare and beautiful.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="text-left font-semibold px-4 py-3">Unit</th>
                    <th className="text-left font-semibold px-4 py-3">
                      Unpaid bills
                    </th>
                    <th className="text-right font-semibold px-4 py-3">
                      Outstanding
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {defaulters.map((d) => (
                    <tr
                      key={d.unitId}
                      className="hover:bg-accent/20 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">{d.unitLabel}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {d.bills}
                      </td>
                      <td className="px-4 py-3 text-right font-display tracking-tighter nums-tabular text-destructive">
                        {formatNaira(d.due)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {/* ============================================================
          DIALOGS
         ============================================================ */}
      <NewBillDialog
        open={newBillOpen}
        onOpenChange={setNewBillOpen}
        units={units}
        onCreated={load}
      />
      <NotifyDefaultersDialog
        open={notifyOpen}
        onOpenChange={setNotifyOpen}
        billOptions={billOptions}
        defaultBillTitle={isFiltered ? selectedTitle : null}
      />
      <StatementDialog
        open={statementOpen}
        onOpenChange={setStatementOpen}
        billTitles={billTabs.map((b) => b.title)}
        defaultBillTitle={isFiltered ? selectedTitle : null}
      />
    </div>
  )
}

function StatCell({
  label,
  value,
  accent = 'neutral',
}: {
  label: string
  value: string
  accent?: 'neutral' | 'emerald' | 'destructive'
}) {
  return (
    <div className="bg-background p-5 lg:p-6">
      <p className="text-[10px] tracking-eyebrow font-semibold text-muted-foreground mb-2">
        {label}
      </p>
      <p
        className={cn(
          'font-display text-2xl lg:text-3xl tracking-tighter nums-tabular leading-none',
          accent === 'emerald' && 'text-primary',
          accent === 'destructive' && 'text-destructive'
        )}
      >
        {value}
      </p>
    </div>
  )
}

function BillTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap',
        'transition-colors',
        active
          ? 'bg-accent text-accent-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      )}
    >
      <span>{label}</span>
      <span
        className={cn(
          'text-[10px] tabular-nums font-semibold rounded-full px-1.5 py-0.5',
          active
            ? 'bg-primary/15 text-primary'
            : 'bg-muted text-muted-foreground'
        )}
      >
        {count}
      </span>
    </button>
  )
}
