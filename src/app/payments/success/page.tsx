'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatNaira } from '@/lib/utils'

type ResolvedPayment = {
  paymentId: string
  amount: number
  billTitle: string
  channel: string
}

function SuccessInner() {
  const sp = useSearchParams()
  const router = useRouter()
  const reference = sp.get('ref')

  const [state, setState] = useState<
    | { kind: 'polling'; attempts: number }
    | { kind: 'success'; payment: ResolvedPayment }
    | { kind: 'timeout' }
    | { kind: 'error'; message: string }
  >({ kind: 'polling', attempts: 0 })

  useEffect(() => {
    if (!reference) {
      setState({ kind: 'error', message: 'No payment reference in the URL.' })
      return
    }

    let cancelled = false
    let attempts = 0
    const maxAttempts = 12 // ~36 seconds at 3s interval

    const tick = async () => {
      if (cancelled) return
      attempts += 1
      setState({ kind: 'polling', attempts })

      const { data, error } = await supabase
        .from('payments')
        .select('id, amount, channel, bill:bills(title)')
        .eq('reference', reference)
        .maybeSingle()

      if (error) {
        // Probably RLS — user is not in the right community.
        if (attempts >= maxAttempts) {
          setState({ kind: 'error', message: error.message })
        } else {
          setTimeout(tick, 3000)
        }
        return
      }

      if (data) {
        const bill = Array.isArray(data.bill) ? data.bill[0] : data.bill
        setState({
          kind: 'success',
          payment: {
            paymentId: data.id,
            amount: Number(data.amount),
            billTitle: bill?.title ?? 'your bill',
            channel: String(data.channel),
          },
        })
      } else if (attempts >= maxAttempts) {
        setState({ kind: 'timeout' })
      } else {
        setTimeout(tick, 3000)
      }
    }

    tick()
    return () => {
      cancelled = true
    }
  }, [reference])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {state.kind === 'polling' && (
            <>
              <div className="mx-auto mb-5 w-14 h-14 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <h1 className="font-display text-2xl font-bold mb-2">
                Confirming your payment…
              </h1>
              <p className="text-sm text-muted-foreground">
                We're waiting for Korapay's webhook ({state.attempts} of 12).
                This usually takes a few seconds.
              </p>
            </>
          )}

          {state.kind === 'success' && (
            <>
              <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="text-xs uppercase tracking-[0.15em] text-primary font-semibold mb-2">
                Payment confirmed
              </p>
              <h1 className="font-display text-3xl font-bold mb-2">
                {formatNaira(state.payment.amount)}
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                paid toward <strong>{state.payment.billTitle}</strong>. Your
                receipt is in your inbox.
              </p>
              <div className="flex flex-col gap-2">
                <Link href={`/receipts/${state.payment.paymentId}`} target="_blank">
                  <Button className="w-full">View receipt</Button>
                </Link>
                <Link href="/resident">
                  <Button variant="outline" className="w-full">
                    Back to dashboard
                  </Button>
                </Link>
              </div>
            </>
          )}

          {state.kind === 'timeout' && (
            <>
              <h1 className="font-display text-2xl font-bold mb-2">
                Hmm — still confirming.
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                Korapay's webhook hasn't reached us yet. If you completed
                payment, it will land in your dashboard shortly. If you cancelled,
                you can try again.
              </p>
              <div className="flex flex-col gap-2">
                <Link href="/resident">
                  <Button className="w-full">Back to dashboard</Button>
                </Link>
              </div>
            </>
          )}

          {state.kind === 'error' && (
            <>
              <h1 className="font-display text-2xl font-bold mb-2 text-destructive">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground mb-6">
                {state.message}
              </p>
              <Button onClick={() => router.push('/resident')} className="w-full">
                Back to dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessInner />
    </Suspense>
  )
}
