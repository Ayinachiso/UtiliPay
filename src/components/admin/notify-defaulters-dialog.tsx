'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Check, Loader2, Mail, MessageCircle, Phone } from 'lucide-react'

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
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

interface NotifyDefaultersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Distinct bill titles in the estate, with each title's defaulting unit count. */
  billOptions: { title: string; defaultingUnits: number; outstanding: number }[]
  /** If provided, this bill is preselected when the dialog opens (overrides the
      "most defaulters" auto-pick). Used when the admin opens the dialog from a
      page already scoped to a specific bill. */
  defaultBillTitle?: string | null
}

interface ChannelState {
  email: boolean
  whatsapp: boolean
  sms: boolean
}

const DEFAULT_MESSAGE =
  'Just a friendly reminder. Kindly settle this when you can. Thank you.'

export function NotifyDefaultersDialog({
  open,
  onOpenChange,
  billOptions,
  defaultBillTitle,
}: NotifyDefaultersDialogProps) {
  const [billTitle, setBillTitle] = useState<string>('')
  const [custom, setCustom] = useState<string>('')
  const [channels, setChannels] = useState<ChannelState>({
    email: true,
    whatsapp: true,
    sms: false,
  })
  const [submitting, setSubmitting] = useState(false)

  // Preselect a bill when the dialog opens:
  //   1. If the caller passed defaultBillTitle, use it (admin is viewing
  //      a specific bill on the dashboard).
  //   2. Otherwise pick the bill with the most defaulters.
  useEffect(() => {
    if (!open) return
    if (defaultBillTitle && billOptions.find((b) => b.title === defaultBillTitle)) {
      setBillTitle(defaultBillTitle)
      return
    }
    if (!billTitle && billOptions.length > 0) {
      const top = [...billOptions].sort(
        (a, b) => b.defaultingUnits - a.defaultingUnits
      )[0]
      setBillTitle(top.title)
    }
  }, [open, billOptions, billTitle, defaultBillTitle])

  const selected = billOptions.find((b) => b.title === billTitle)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!billTitle) {
      toast.error('Pick a bill first.')
      return
    }
    if (!channels.email && !channels.whatsapp && !channels.sms) {
      toast.error('Pick at least one channel.')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/admin/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_title: billTitle,
          channels,
          custom_message: custom.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data?.detail || data?.error || 'Failed to send')
      }
      if (data.recipients === 0) {
        toast.info(data.message ?? 'Nothing to send.')
      } else {
        const parts: string[] = []
        if (data.result.emailSent) parts.push(`${data.result.emailSent} emails sent`)
        if (data.result.whatsappSimulated)
          parts.push(`${data.result.whatsappSimulated} WhatsApp queued`)
        if (data.result.smsSimulated)
          parts.push(`${data.result.smsSimulated} SMS queued`)
        toast.success(parts.join(' · ') || 'Sent.')
      }
      onOpenChange(false)
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
              Remind defaulters
            </p>
            <DialogTitle>Send a reminder.</DialogTitle>
            <DialogDescription>
              Pick a bill and the channels to use. Email goes live via Resend.
              WhatsApp and SMS are queued for the live launch.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {/* Bill picker */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
                Which bill
              </Label>
              {billOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground border border-dashed border-border rounded-md px-3 py-4 text-center">
                  No outstanding bills. Nothing to chase.
                </p>
              ) : (
                <div className="max-h-44 overflow-y-auto border border-border rounded-md divide-y divide-border">
                  {billOptions.map((b) => {
                    const checked = b.title === billTitle
                    return (
                      <label
                        key={b.title}
                        className={cn(
                          'flex items-center justify-between gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                          checked ? 'bg-accent/30' : 'hover:bg-accent/20'
                        )}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block text-sm font-medium truncate">
                            {b.title}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {b.defaultingUnits} defaulting{' '}
                            {b.defaultingUnits === 1 ? 'unit' : 'units'}
                          </span>
                        </span>
                        <span
                          className={cn(
                            'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                            checked
                              ? 'bg-primary border-primary text-primary-foreground'
                              : 'bg-card border-border'
                          )}
                        >
                          {checked && (
                            <Check className="h-2.5 w-2.5" strokeWidth={3} />
                          )}
                        </span>
                        <input
                          type="radio"
                          name="bill_title"
                          value={b.title}
                          checked={checked}
                          onChange={() => setBillTitle(b.title)}
                          className="sr-only"
                        />
                      </label>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Channels */}
            <div className="space-y-2">
              <Label className="text-xs tracking-wider uppercase font-semibold text-muted-foreground">
                Send via
              </Label>
              <div className="grid grid-cols-3 gap-2">
                <ChannelToggle
                  Icon={Mail}
                  label="Email"
                  status="Live"
                  selected={channels.email}
                  onToggle={() =>
                    setChannels((c) => ({ ...c, email: !c.email }))
                  }
                />
                <ChannelToggle
                  Icon={MessageCircle}
                  label="WhatsApp"
                  status="Queued"
                  selected={channels.whatsapp}
                  onToggle={() =>
                    setChannels((c) => ({ ...c, whatsapp: !c.whatsapp }))
                  }
                />
                <ChannelToggle
                  Icon={Phone}
                  label="SMS"
                  status="Queued"
                  selected={channels.sms}
                  onToggle={() =>
                    setChannels((c) => ({ ...c, sms: !c.sms }))
                  }
                />
              </div>
            </div>

            {/* Custom message */}
            <div className="space-y-2">
              <Label
                htmlFor="notify-custom"
                className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
              >
                Add a note
                <span className="ml-1 text-muted-foreground/60 normal-case tracking-normal font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                id="notify-custom"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder={DEFAULT_MESSAGE}
                rows={2}
                maxLength={500}
              />
            </div>

            {selected && (
              <p className="text-xs text-muted-foreground">
                {selected.defaultingUnits}{' '}
                {selected.defaultingUnits === 1
                  ? 'unit will be reminded'
                  : 'units will be reminded'}
                . Only residents with the picked channel on file receive the
                message.
              </p>
            )}
          </DialogBody>

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={submitting}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              type="submit"
              disabled={submitting || billOptions.length === 0}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? 'Sending…' : 'Send reminder'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ChannelToggle({
  Icon,
  label,
  status,
  selected,
  onToggle,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  status: 'Live' | 'Queued'
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'relative text-left rounded-md border px-3 py-3 transition-colors',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border bg-card hover:bg-accent/30'
      )}
    >
      <Icon className="h-4 w-4 mb-2" />
      <p className="text-sm font-medium leading-none">{label}</p>
      <p
        className={cn(
          'text-[10px] mt-1 tracking-wider uppercase font-semibold',
          status === 'Live' ? 'text-emerald-600' : 'text-muted-foreground'
        )}
      >
        {status}
      </p>
      {selected && (
        <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="h-2.5 w-2.5" strokeWidth={3} />
        </span>
      )}
    </button>
  )
}
