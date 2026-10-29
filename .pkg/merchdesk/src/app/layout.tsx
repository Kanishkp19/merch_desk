import type { Metadata } from 'next'
import { Archivo_Black, Space_Grotesk, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ToastProvider } from '@/components/ui/Toast'
import { StudioProvider } from '@/lib/state/StudioProvider'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { SiteFooter } from '@/components/layout/SiteFooter'

const archivo = Archivo_Black({ subsets: ['latin'], weight: '400', variable: '--font-archivo', display: 'swap' })
const grotesk = Space_Grotesk({ subsets: ['latin'], variable: '--font-grotesk', display: 'swap' })
const jbmono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jbmono', display: 'swap' })

export const metadata: Metadata = {
  title: 'MerchDesk — Merch your fans actually want.',
  description:
    'Describe your fans; a Qloo-powered agent researches what they gravitate toward and turns it into a launch-ready merch collection with honest numbers. Words first, AI images only after your approval.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${archivo.variable} ${grotesk.variable} ${jbmono.variable} min-h-screen flex flex-col antialiased`}>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-2 focus:left-2 focus:bg-acid focus:text-ink focus:font-display focus:text-sm focus:uppercase focus:px-4 focus:py-2 focus:border-2 focus:border-ink"
        >
          Skip to content
        </a>
        <ToastProvider>
          <StudioProvider>
            <SiteHeader />
            <div className="flex-1 flex flex-col">{children}</div>
            <SiteFooter />
          </StudioProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
