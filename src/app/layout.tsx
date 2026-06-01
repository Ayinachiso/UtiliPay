import type { Metadata } from 'next'
import { Inter, Instrument_Serif } from 'next/font/google'

import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const display = Instrument_Serif({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-display',
  weight: '400',
})

export const metadata: Metadata = {
  title: 'UtiliPay — Estate operations, made simple',
  description:
    'Collect estate dues, security levies, and utility bills from every resident — through web, USSD, WhatsApp, or cash at the gate. All reconciled, all receipted, all on one ledger.',
}

/**
 * Inline boot script — runs before React hydrates to set the correct theme
 * class on <html>, preventing a flash of the wrong theme on first paint.
 */
const themeBootScript = `
(function() {
  try {
    var stored = localStorage.getItem('utilipay-theme');
    var theme = (stored === 'dark' || stored === 'light')
      ? stored
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
  } catch (e) {}
})();
`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(inter.variable, display.variable)}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="font-sans bg-background text-foreground antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  )
}
