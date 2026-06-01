import Link from 'next/link'
import { ArrowRight, Phone, Wallet, MessageCircle, Receipt } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Logo, LogoMark } from '@/components/brand/logo'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { formatNaira } from '@/lib/utils'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bone-grain">
      {/* =========================================================
          HEADER
         ========================================================= */}
      <header className="hairline-b">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" aria-label="UtiliPay home">
            <Logo size={26} />
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button size="sm" className="hidden sm:inline-flex">
                Open dashboard
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* =========================================================
          HERO
         ========================================================= */}
      <section>
        <div className="container max-w-5xl pt-16 md:pt-24 lg:pt-32 pb-16 md:pb-20">
          <div className="flex items-center gap-2 mb-8">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
            <span className="text-xs tracking-eyebrow text-muted-foreground font-medium">
              Built for African residential estates
            </span>
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[88px] leading-[1.02] tracking-tightest mb-8 max-w-4xl animate-fade-in-up">
            Estate operations,{' '}
            <span className="italic text-primary">made simple.</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mb-10 animate-fade-in-up [animation-delay:120ms]">
            Collect estate dues, security levies, and utility bills from every
            resident — through the web, USSD, WhatsApp, or cash at the gate.
            All reconciled, all receipted, all on one ledger.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up [animation-delay:200ms]">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto group">
                Open the dashboard
                <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="w-full sm:w-auto">
                See the resident view
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          DEMO LEDGER — a "designed object" the eye lingers on
         ========================================================= */}
      <section className="hairline-t hairline-b">
        <div className="container max-w-5xl py-16 md:py-20">
          <div className="grid lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-start">
            <div>
              <p className="text-xs tracking-eyebrow text-muted-foreground font-medium mb-4">
                Today on a single bill
              </p>
              <h2 className="font-display text-4xl md:text-5xl leading-tight tracking-tighter mb-6">
                One household.{' '}
                <span className="italic text-primary">Three payers.</span>{' '}
                One receipt.
              </h2>
              <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-8">
                A flat has a husband, a wife, sometimes a tenant. They split the
                security levy three ways — three different days, three different
                channels. Every other fintech assumes one payer per invoice.
                UtiliPay reconciles automatically.
              </p>
              <div className="flex flex-col gap-3 text-sm">
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground tracking-eyebrow text-xs w-20 shrink-0">
                    Bill
                  </span>
                  <span className="font-medium">
                    May 2026 Security Levy — House 12
                  </span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-muted-foreground tracking-eyebrow text-xs w-20 shrink-0">
                    Total
                  </span>
                  <span className="font-medium nums-tabular">
                    {formatNaira(15000)}
                  </span>
                </div>
              </div>
            </div>

            {/* The "designed object" — a ledger card */}
            <div className="rounded-lg border border-border bg-card overflow-hidden shadow-[0_1px_0_0_hsl(var(--border)),0_24px_48px_-24px_hsl(var(--foreground)/0.08)] dark:shadow-none">
              <div className="px-6 py-5 hairline-b flex items-baseline justify-between">
                <div>
                  <p className="text-xs tracking-eyebrow text-muted-foreground font-medium mb-1">
                    Adebayo household
                  </p>
                  <p className="font-display text-2xl tracking-tighter">
                    House 12
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-semibold uppercase tracking-wider">
                  Paid
                </span>
              </div>
              <ul className="divide-y divide-border">
                {[
                  {
                    name: 'Mr. Kunle Adebayo',
                    channel: 'Web',
                    icon: Wallet,
                    amount: 7000,
                    when: '3 days ago',
                  },
                  {
                    name: 'Mrs. Funke Adebayo',
                    channel: 'WhatsApp',
                    icon: MessageCircle,
                    amount: 5000,
                    when: '2 days ago',
                  },
                  {
                    name: 'Mama Modupe Adebayo',
                    channel: 'Cash at gate',
                    icon: Phone,
                    amount: 3000,
                    when: 'Yesterday',
                  },
                ].map((row) => {
                  const Icon = row.icon
                  return (
                    <li
                      key={row.name}
                      className="px-6 py-4 flex items-center gap-4"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {row.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {row.channel} · {row.when}
                        </p>
                      </div>
                      <p className="font-display text-lg tracking-tighter nums-tabular">
                        {formatNaira(row.amount)}
                      </p>
                    </li>
                  )
                })}
              </ul>
              <div className="px-6 py-4 bg-accent/40 flex items-baseline justify-between">
                <span className="text-xs tracking-eyebrow text-muted-foreground font-semibold">
                  Reconciled total
                </span>
                <span className="font-display text-xl tracking-tighter nums-tabular text-primary">
                  {formatNaira(15000)} / {formatNaira(15000)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          THREE CHANNELS
         ========================================================= */}
      <section className="hairline-b">
        <div className="container max-w-5xl py-16 md:py-24">
          <p className="text-xs tracking-eyebrow text-muted-foreground font-medium mb-4">
            Meet residents where they are
          </p>
          <h2 className="font-display text-4xl md:text-5xl leading-tight tracking-tighter mb-12 max-w-2xl">
            Four payment channels.{' '}
            <span className="italic text-primary">One ledger.</span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-border rounded-lg overflow-hidden">
            {[
              {
                icon: Wallet,
                label: 'Web',
                detail:
                  'Korapay checkout — card, bank, mobile money. Most residents.',
              },
              {
                icon: Phone,
                label: 'USSD',
                detail:
                  'For residents without a smartphone. Dial *737*000*REF# from any phone.',
              },
              {
                icon: MessageCircle,
                label: 'WhatsApp',
                detail:
                  'For residents who basically only use WhatsApp. Chat-driven payment in seconds.',
              },
              {
                icon: Receipt,
                label: 'Cash at the gate',
                detail:
                  'Admin logs cash collected at the gate, with a photo of the slip if needed. Same ledger as digital.',
              },
            ].map((channel) => {
              const Icon = channel.icon
              return (
                <div
                  key={channel.label}
                  className="bg-background p-6 lg:p-8 flex flex-col"
                >
                  <Icon className="h-5 w-5 text-primary mb-6" />
                  <h3 className="font-display text-2xl tracking-tighter mb-2">
                    {channel.label}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {channel.detail}
                  </p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* =========================================================
          MUM'S QUOTE
         ========================================================= */}
      <section className="bg-primary text-primary-foreground">
        <div className="container max-w-4xl py-20 md:py-28">
          <p className="text-xs tracking-eyebrow text-primary-foreground/60 font-medium mb-6">
            How it started
          </p>
          <blockquote className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.15] tracking-tighter mb-8">
            "My mum runs our estate. She used to call me every Sunday to help
            her collate payment screenshots into Excel.{' '}
            <span className="italic">
              I built UtiliPay so she wouldn't have to.
            </span>
            "
          </blockquote>
          <p className="text-sm text-primary-foreground/70">
            — Ayinachiso · Computer Science, Covenant University
          </p>
        </div>
      </section>

      {/* =========================================================
          FOOTER
         ========================================================= */}
      <footer className="hairline-t mt-auto">
        <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark size={22} className="text-primary" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} UtiliPay · Estate operations, made
              simple.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link href="/login" className="hover:text-foreground transition-colors">
              Sign in
            </Link>
            <span className="opacity-40">·</span>
            <span>Built for the Korapay hackathon</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
