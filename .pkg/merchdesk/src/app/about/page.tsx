import type { Metadata } from 'next'
import { AboutView } from '@/components/views/AboutView'

export const metadata: Metadata = {
  title: 'How it works — MerchDesk',
  description: 'How MerchDesk turns audience affinity into makeable merch — honestly.',
}

export default function AboutPage() {
  return <AboutView />
}
