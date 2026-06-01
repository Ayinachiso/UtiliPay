'use client'

import { useEffect, useMemo, useState } from 'react'
import { Download, FileSpreadsheet, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

type StatementPreset =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'month'
  | 'lastmonth'
  | 'custom'

interface StatementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Distinct bill titles in the estate. Optional — when present the dialog
      offers a bill-scoped statement; otherwise it always returns the whole estate. */
  billTitles: string[]
  /** When opened from a bill-scoped view, preselect that bill. */
  defaultBillTitle?: string | null
}

function startOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}
function endOfDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x
}
function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function StatementDialog({
  open,
  onOpenChange,
  billTitles,
  defaultBillTitle,
}: StatementDialogProps) {
  const [preset, setPreset] = useState<StatementPreset>('30days')
  const [customFrom, setCustomFrom] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() - 29)
    return toIsoDate(d)
  })
  const [customTo, setCustomTo] = useState<string>(() => toIsoDate(new Date()))
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [billFilter, setBillFilter] = useState<string>('')
  const [downloading, setDownloading] = useState(false)

  // Pre-select bill when opening from a bill-scoped view
  useEffect(() => {
    if (!open) return
    setBillFilter(defaultBillTitle ?? '')
  }, [open, defaultBillTitle])

  const range = useMemo(() => {
    const now = new Date()
    const fmt = (d: Date) =>
      d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
    const fmtY = (d: Date) =>
      d.toLocaleDateString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })

    switch (preset) {
      case 'today':
        return {
          from: startOfDay(now),
          to: endOfDay(now),
          label: `${fmtY(now)}`,
        }
      case 'yesterday': {
        const y = new Date(now)
        y.setDate(y.getDate() - 1)
        return {
          from: startOfDay(y),
          to: endOfDay(y),
          label: fmtY(y),
        }
      }
      case '7days': {
        const s = new Date(now)
        s.setDate(s.getDate() - 6)
        return {
          from: startOfDay(s),
          to: endOfDay(now),
          label: `${fmt(s)} to ${fmtY(now)}`,
        }
      }
      case '30days': {
        const s = new Date(now)
        s.setDate(s.getDate() - 29)
        return {
          from: startOfDay(s),
          to: endOfDay(now),
          label: `${fmt(s)} to ${fmtY(now)}`,
        }
      }
      case 'month': {
        const s = new Date(now.getFullYear(), now.getMonth(), 1)
        return {
          from: startOfDay(s),
          to: endOfDay(now),
          label: `${fmt(s)} to ${fmtY(now)}`,
        }
      }
      case 'lastmonth': {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const e = new Date(now.getFullYear(), now.getMonth(), 0)
        return {
          from: startOfDay(s),
          to: endOfDay(e),
          label: `${fmt(s)} to ${fmtY(e)}`,
        }
      }
      case 'custom': {
        const f = customFrom ? startOfDay(new Date(customFrom)) : startOfDay(now)
        const t = customTo ? endOfDay(new Date(customTo)) : endOfDay(now)
        return { from: f, to: t, label: `${fmt(f)} to ${fmtY(t)}` }
      }
    }
  }, [preset, customFrom, customTo])

  const handleDownload = (e: React.FormEvent) => {
    e.preventDefault()
    setDownloading(true)
    try {
      const params = new URLSearchParams({
        format,
        scope: 'payments',
        date_from: range.from.toISOString(),
        date_to: range.to.toISOString(),
      })
      if (billFilter) params.set('bill_title', billFilter)
      const url = `/api/admin/export?${params.toString()}`
      window.open(url, '_blank')
      toast.success(
        `Statement download started${billFilter ? ` for "${billFilter}"` : ''}.`
      )
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setDownloading(false)
    }
  }

  const presets: { key: StatementPreset; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: '7days', label: 'Last 7 days' },
    { key: '30days', label: 'Last 30 days' },
    { key: 'month', label: 'This month' },
    { key: 'lastmonth', label: 'Last month' },
    { key: 'custom', label: 'Custom' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <form onSubmit={handleDownload}>
          <DialogHeader>
            <p className="text-[10px] tracking-eyebrow font-semibold text-primary mb-1">
              Statement of account
            </p>
            <DialogTitle>Download a statement.</DialogTitle>
            <DialogDescription>
              Pick a date range and a format. We will generate a tidy file with
              every payment in that window.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-6">
            {/* Date range */}
            <div className="space-y-3">
              <Label className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
                Date range
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPreset(p.key)}
                    aria-pressed={preset === p.key}
                    className={cn(
                      'shrink-0 px-2.5 py-1 rounded-md text-xs font-medium transition-colors border',
                      preset === p.key
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-border'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {preset === 'custom' && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="date"
                    value={customFrom}
                    max={customTo}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                  <span>to</span>
                  <input
                    type="date"
                    value={customTo}
                    min={customFrom}
                    max={toIsoDate(new Date())}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="h-9 px-3 rounded-md border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                  />
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Period: <span className="text-foreground font-medium">{range.label}</span>
              </p>
            </div>

            {/* Bill filter (optional) */}
            {billTitles.length > 0 && (
              <div className="space-y-2">
                <Label
                  htmlFor="statement-bill"
                  className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
                >
                  Bill
                  <span className="ml-1 normal-case tracking-normal text-muted-foreground/60 font-normal">
                    (optional)
                  </span>
                </Label>
                <select
                  id="statement-bill"
                  value={billFilter}
                  onChange={(e) => setBillFilter(e.target.value)}
                  className="w-full h-10 px-3 rounded-md border border-input bg-card text-foreground text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20"
                >
                  <option value="">All bills in this period</option>
                  {billTitles.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Format */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
                Format
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <FormatTab
                  selected={format === 'xlsx'}
                  onClick={() => setFormat('xlsx')}
                  Icon={FileSpreadsheet}
                  primary="XLSX"
                  secondary="Opens directly in Excel"
                />
                <FormatTab
                  selected={format === 'csv'}
                  onClick={() => setFormat('csv')}
                  Icon={FileText}
                  primary="CSV"
                  secondary="Plain comma-separated"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={downloading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={downloading}>
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {downloading ? 'Generating…' : 'Download statement'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function FormatTab({
  selected,
  onClick,
  Icon,
  primary,
  secondary,
}: {
  selected: boolean
  onClick: () => void
  Icon: React.ComponentType<{ className?: string }>
  primary: string
  secondary: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'relative text-left rounded-md border px-3.5 py-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-accent/30'
      )}
    >
      <Icon className="h-4 w-4 mb-2" />
      <p className="text-sm font-medium leading-none">{primary}</p>
      <p className="text-xs text-muted-foreground mt-1">{secondary}</p>
    </button>
  )
}
