'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowRight,
  Banknote,
  Check,
  Globe,
  Mail,
  MessageCircle,
  Phone,
} from 'lucide-react'

import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Logo, LogoMark } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { cn, formatNaira } from '@/lib/utils'

type RoleView = 'resident' | 'admin'

/* ============================================================
   Feature spotlights for the left panel.
   Accent colors used inside (theme independent because the
   panel itself is locked to dark forest):
     gold-500    = editorial italic emphasis
     emerald-300 = positive / success indicator
   ============================================================ */

interface Spotlight {
  id: string
  headline: string
  italic: string
  body: string
  visual: React.ReactNode
}

function ChannelsVisual() {
  const rows = [
    { Icon: Globe, label: 'Web', amount: 7000 },
    { Icon: Phone, label: 'USSD', amount: 5000 },
    { Icon: Banknote, label: 'Cash at gate', amount: 3000 },
  ]
  return (
    <div className="rounded-lg border border-bone-50/15 bg-bone-50/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] tracking-eyebrow font-semibold text-bone-50/55">
          May 2026 Security Levy
        </p>
        <p className="text-[10px] font-mono text-bone-50/45">House 12</p>
      </div>
      <ul className="space-y-3">
        {rows.map(({ Icon, label, amount }) => (
          <li key={label} className="flex items-center gap-3 text-sm">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-bone-50/10">
              <Icon className="h-3.5 w-3.5 text-bone-50/75" />
            </span>
            <span className="text-bone-50/80 flex-1">{label}</span>
            <span className="font-display text-bone-50 nums-tabular">
              {formatNaira(amount)}
            </span>
          </li>
        ))}
      </ul>
      <div className="hairline-t border-bone-50/15 mt-4 pt-3 flex items-center justify-between">
        <span className="text-xs text-emerald-300 flex items-center gap-1.5 font-medium">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
          Reconciled
        </span>
        <span className="font-display text-xl tracking-tighter text-bone-50 nums-tabular">
          {formatNaira(15000)}
        </span>
      </div>
    </div>
  )
}

function HouseholdVisual() {
  return (
    <div className="rounded-lg border border-bone-50/15 bg-bone-50/[0.04] p-5">
      <p className="text-[10px] tracking-eyebrow font-semibold text-bone-50/55 mb-4">
        Adebayo household, House 12
      </p>
      <div className="flex items-center gap-4">
        <div className="flex -space-x-2">
          {[
            { initials: 'KA', label: 'Kunle' },
            { initials: 'FA', label: 'Funke' },
            { initials: 'MA', label: 'Mama' },
          ].map((m) => (
            <span
              key={m.initials}
              title={m.label}
              className="h-10 w-10 rounded-full bg-bone-50/15 border-2 border-forest-800 flex items-center justify-center text-[11px] font-semibold tracking-wider text-bone-50"
            >
              {m.initials}
            </span>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-3 gap-1 items-center">
          <span className="h-px bg-bone-50/20" />
          <span className="h-px bg-bone-50/40" />
          <ArrowRight className="h-3.5 w-3.5 text-bone-50/55 ml-auto" />
        </div>
        <div className="flex-1 rounded-md border border-bone-50/15 bg-forest-700 px-3 py-2.5 min-w-0">
          <p className="text-[10px] tracking-wider uppercase text-bone-50/55 mb-0.5">
            One bill
          </p>
          <p className="text-sm font-medium text-bone-50 truncate">
            May Security Levy
          </p>
          <p className="text-[11px] text-emerald-300 mt-0.5 flex items-center gap-1 font-medium">
            <Check className="h-3 w-3" strokeWidth={3} />
            Paid in full
          </p>
        </div>
      </div>
    </div>
  )
}

function ReceiptsVisual() {
  return (
    <div className="rounded-lg border border-bone-50/15 bg-bone-50/[0.04] p-5">
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[10px] tracking-eyebrow font-semibold text-bone-50/55">
          Receipt
        </p>
        <p className="text-[10px] font-mono text-bone-50/55">
          UTP-RCPT-0023
        </p>
      </div>
      <p className="font-display text-4xl tracking-tighter mb-4 text-bone-50 nums-tabular">
        {formatNaira(15000)}
      </p>
      <ul className="space-y-2">
        {[
          { Icon: Mail, label: 'Emailed to resident' },
          { Icon: MessageCircle, label: 'Sent in WhatsApp chat' },
          { Icon: Check, label: 'Saved to dashboard' },
        ].map(({ Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-2.5 text-xs text-bone-50/80"
          >
            <Icon className="h-3.5 w-3.5 text-emerald-300" strokeWidth={2.5} />
            <span>{label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const SPOTLIGHTS: Spotlight[] = [
  {
    id: 'channels',
    headline: 'Four channels.',
    italic: 'One ledger.',
    body: 'Web, USSD, WhatsApp, and cash at the gate all land in the same ledger inside seconds. Same row format, same totals, no spreadsheet.',
    visual: <ChannelsVisual />,
  },
  {
    id: 'household',
    headline: 'Many payers.',
    italic: 'One bill.',
    body: 'A husband, a wife, the grandma upstairs. Three payments, three days, one reconciled levy. The estate financial secretary never has to do the math.',
    visual: <HouseholdVisual />,
  },
  {
    id: 'receipts',
    headline: 'Receipts that',
    italic: 'send themselves.',
    body: 'The moment a payment lands, the resident gets it on email, in WhatsApp if that is how they paid, and saved to the dashboard for life.',
    visual: <ReceiptsVisual />,
  },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [roleView, setRoleView] = useState<RoleView>('admin')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sIndex, setSIndex] = useState(0)
  const [hovering, setHovering] = useState(false)

  // If a dashboard layout bounced us back because the role didn't match,
  // surface that to the user and pre-select the OTHER tab.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const need = params.get('need')
    if (need === 'admin' || need === 'resident') {
      setErrorMsg(
        `Your account does not have ${need} access. Try the other tab, or ask your estate admin to grant it.`
      )
      setRoleView(need === 'admin' ? 'resident' : 'admin')
    }
  }, [])

  useEffect(() => {
    if (hovering) return
    const id = setInterval(() => {
      setSIndex((i) => (i + 1) % SPOTLIGHTS.length)
    }, 3000)
    return () => clearInterval(id)
  }, [hovering])

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setErrorMsg(null)
      setLoading(true)

      // Safety valve. If anything hangs (Supabase auth lock contention, network
      // latency, etc.), surface it after 15 seconds instead of spinning forever.
      const timeoutId = setTimeout(() => {
        setLoading(false)
        setErrorMsg(
          'Login is taking too long. Refresh the page and try again.'
        )
      }, 15000)

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error || !data.user) {
          setErrorMsg(error?.message ?? 'Invalid email or password.')
          return
        }

        // Don't do a redundant members lookup here. AuthContext fetches every
        // member row tied to this auth user, and the dashboard layouts gate
        // access by role. If you click Admin but only have a resident row,
        // /admin will bounce you back to /login?need=admin and the effect
        // above shows the right message.
        router.push(roleView === 'admin' ? '/admin' : '/resident')
      } catch (err) {
        console.error(err)
        setErrorMsg('Something went wrong. Try again.')
      } finally {
        clearTimeout(timeoutId)
        setLoading(false)
      }
    },
    [email, password, roleView, router]
  )

  const active = SPOTLIGHTS[sIndex]

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <aside
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        className="relative bg-forest-800 text-bone-50 lg:w-[55%] flex flex-col"
      >
        <div className="relative flex-1 flex flex-col p-8 sm:p-12 lg:p-14 xl:p-20">
          <header className="flex items-start justify-between gap-6 mb-12 lg:mb-16">
            <div className="flex items-center gap-3 text-bone-50">
              <LogoMark size={40} fg="#F7F3EA" bg="#0F2A1E" />
              <div className="flex flex-col leading-none gap-1">
                <span className="font-display text-2xl tracking-tighter">
                  Utili<span className="italic text-gold-500">Pay</span>
                </span>
                <span className="text-[10px] tracking-eyebrow font-semibold text-bone-50/55">
                  Estate operations, made simple.
                </span>
              </div>
            </div>
            <p className="hidden lg:block text-[10px] tracking-eyebrow font-semibold text-bone-50/45 text-right max-w-[12rem]">
              Built for African residential estates
            </p>
          </header>

          <div className="mb-10 lg:mb-12 max-w-xl">
            <p className="text-[10px] tracking-eyebrow font-semibold text-bone-50/55 mb-5">
              How UtiliPay runs your estate
            </p>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-[44px] leading-[1.05] tracking-tighter">
              {active.headline}{' '}
              <span className="italic text-gold-500">{active.italic}</span>
            </h2>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-xl">
            <div key={active.id} className="animate-fade-in">
              {active.visual}
              <p className="mt-5 text-sm sm:text-base text-bone-50/75 leading-relaxed">
                {active.body}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Choose feature"
              className="flex items-center gap-2 mt-8"
            >
              {SPOTLIGHTS.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === sIndex}
                  aria-label={s.id}
                  onClick={() => setSIndex(idx)}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-300',
                    idx === sIndex
                      ? 'w-8 bg-bone-50'
                      : 'w-1.5 bg-bone-50/30 hover:bg-bone-50/60'
                  )}
                />
              ))}
            </div>
          </div>

          <div className="mt-10 lg:mt-14 hairline-t border-bone-50/10 pt-5 flex items-center justify-between text-[11px] text-bone-50/55">
            <span>© {new Date().getFullYear()} UtiliPay</span>
            <span className="hidden sm:inline">
              Parkfield Estate · Lekki Phase 1
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background text-foreground flex flex-col">
        <div className="flex items-center justify-between p-5 sm:px-8">
          <Link
            href="/"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to home
          </Link>
          <ThemeToggle />
        </div>

        <div className="lg:hidden px-5 sm:px-8 pb-2">
          <Logo size={32} />
        </div>

        <div className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
          <div className="w-full max-w-md">
            <div className="mb-9">
              <p className="text-[10px] tracking-eyebrow font-semibold text-primary mb-3">
                Welcome back
              </p>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] tracking-tighter mb-3">
                Sign in to{' '}
                <span className="italic text-primary">your estate.</span>
              </h1>
              <p className="text-sm text-muted-foreground">
                One login, two roles. Use the tab that fits how you are signing
                in today: admin or resident.
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Sign in as"
              className="grid grid-cols-2 gap-1 p-1 bg-muted rounded-md mb-7"
            >
              {(['resident', 'admin'] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  role="tab"
                  aria-selected={roleView === role}
                  onClick={() => {
                    if (role !== roleView) {
                      setRoleView(role)
                      setErrorMsg(null)
                    }
                  }}
                  className={cn(
                    'relative py-2.5 px-3 text-sm font-medium rounded-sm transition-all capitalize',
                    roleView === role
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {role}
                  {roleView === role && (
                    <span className="absolute -bottom-px left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-primary" />
                  )}
                </button>
              ))}
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {errorMsg && (
                <div
                  role="alert"
                  className="text-sm bg-destructive/10 text-destructive border border-destructive/25 rounded-md px-3.5 py-3 leading-snug"
                >
                  {errorMsg}
                </div>
              )}

              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
                >
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@parkfield.demo"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-xs tracking-wider uppercase font-semibold text-muted-foreground"
                  >
                    Password
                  </Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot?
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="w-full group mt-2"
              >
                {loading ? (
                  'Signing in…'
                ) : (
                  <>
                    Sign in as {roleView}
                    <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </Button>
            </form>

            <div className="mt-8 hairline-t pt-6">
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Do not have an account?{' '}
                <span className="text-foreground">
                  Ask your estate admin to add you.
                </span>{' '}
                We will send you a link by email.
              </p>
            </div>
          </div>
        </div>

        <footer className="hairline-t">
          <div className="px-5 sm:px-8 py-4 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>© {new Date().getFullYear()} UtiliPay</span>
            <span className="hidden sm:inline">
              Estate operations, made simple.
            </span>
          </div>
        </footer>
      </main>
    </div>
  )
}
