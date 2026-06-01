'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2 } from 'lucide-react'

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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn, formatNaira } from '@/lib/utils'

export interface UnitOption {
  id: string
  label: string
}

interface NewBillDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  units: UnitOption[]
  onCreated: () => void
}

export function NewBillDialog({
  open,
  onOpenChange,
  units,
  onCreated,
}: NewBillDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 14)
    return d.toISOString().split('T')[0]
  })
  const [target, setTarget] = useState<'all' | 'units'>('all')
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(
    new Set()
  )
  const [submitting, setSubmitting] = useState(false)

  const resetAndClose = () => {
    setTitle('')
    setDescription('')
    setAmount('')
    setTarget('all')
    setSelectedUnitIds(new Set())
    onOpenChange(false)
  }

  const toggleUnit = (id: string) => {
    setSelectedUnitIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const recipientCount =
    target === 'all' ? units.length : selectedUnitIds.size

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const amountNum = Number(amount)
    if (!title.trim() || !amountNum || amountNum <= 0 || !dueDate) {
      toast.error('Fill in the title, an amount above zero, and a due date.')
      return
    }
    if (target === 'units' && selectedUnitIds.size === 0) {
      toast.error('Pick at least one unit, or switch to broadcast.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || undefined,
          amount: amountNum,
          due_date: dueDate,
          target,
          unit_ids: target === 'units' ? Array.from(selectedUnitIds) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || 'Failed to create bill')
      }
      toast.success(
        `Bill created across ${data.createdCount} ${
          data.createdCount === 1 ? 'unit' : 'units'
        }.`
      )
      onCreated()
      resetAndClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form onSubmit={submit}>
          <DialogHeader>
            <p className="text-[10px] tracking-eyebrow font-semibold text-primary mb-1">
              New bill
            </p>
            <DialogTitle>Create a bill.</DialogTitle>
            <DialogDescription>
              It will appear on every targeted resident's dashboard the moment
              you save.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            <div className="space-y-2">
              <Label
                htmlFor="bill-title"
                className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
              >
                Title
              </Label>
              <Input
                id="bill-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Generator Repair Levy"
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="bill-description"
                className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
              >
                Description
                <span className="ml-1 text-muted-foreground/60 normal-case tracking-normal font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="bill-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short note for the residents. Why it is being collected, what it pays for."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label
                  htmlFor="bill-amount"
                  className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
                >
                  Amount (₦)
                </Label>
                <Input
                  id="bill-amount"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="15000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="bill-due"
                  className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
                >
                  Due date
                </Label>
                <Input
                  id="bill-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
                Send to
              </Label>
              <div className="grid grid-cols-2 gap-2">
                <TargetTab
                  selected={target === 'all'}
                  onClick={() => setTarget('all')}
                  primary="All units"
                  secondary={`Broadcast to ${units.length} units`}
                />
                <TargetTab
                  selected={target === 'units'}
                  onClick={() => setTarget('units')}
                  primary="Specific units"
                  secondary={
                    selectedUnitIds.size > 0
                      ? `${selectedUnitIds.size} selected`
                      : 'Pick from the list'
                  }
                />
              </div>

              {target === 'units' && (
                <div className="rounded-md border border-border bg-muted/30 max-h-48 overflow-y-auto divide-y divide-border">
                  {units.length === 0 ? (
                    <div className="p-4 text-xs text-muted-foreground text-center">
                      No units found.
                    </div>
                  ) : (
                    units.map((u) => {
                      const checked = selectedUnitIds.has(u.id)
                      return (
                        <label
                          key={u.id}
                          className={cn(
                            'flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer',
                            'hover:bg-accent/40 transition-colors',
                            checked && 'bg-accent/30'
                          )}
                        >
                          <span className="text-sm">{u.label}</span>
                          <span
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded border transition-colors',
                              checked
                                ? 'bg-primary border-primary text-primary-foreground'
                                : 'bg-card border-border'
                            )}
                          >
                            {checked && (
                              <Check className="h-3 w-3" strokeWidth={3} />
                            )}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => toggleUnit(u.id)}
                          />
                        </label>
                      )
                    })
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                This bill will be created on{' '}
                <span className="text-foreground font-medium">
                  {recipientCount}{' '}
                  {recipientCount === 1 ? 'unit' : 'units'}
                </span>
                {amount && Number(amount) > 0 && (
                  <>
                    {' '}for{' '}
                    <span className="text-foreground font-medium">
                      {formatNaira(Number(amount) * recipientCount)}
                    </span>{' '}
                    total receivable.
                  </>
                )}
              </p>
            </div>
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {submitting ? 'Creating…' : 'Create bill'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function TargetTab({
  selected,
  onClick,
  primary,
  secondary,
}: {
  selected: boolean
  onClick: () => void
  primary: string
  secondary: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative text-left rounded-md border px-3.5 py-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-accent/30'
      )}
    >
      <p className="text-sm font-medium">{primary}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{secondary}</p>
      {selected && (
        <span className="absolute top-3 right-3 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
