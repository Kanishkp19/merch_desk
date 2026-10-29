import type { Metadata } from 'next'
import { StudioView } from '@/components/views/StudioView'

export const metadata: Metadata = {
  title: 'Studio — MerchDesk',
  description: 'Agent taste research, scored collection, approval-gated concept images.',
}

export default function StudioPage() {
  return <StudioView />
}
