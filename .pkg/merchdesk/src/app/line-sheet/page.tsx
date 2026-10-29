import type { Metadata } from 'next'
import { LineSheetView } from '@/components/views/LineSheetView'

export const metadata: Metadata = {
  title: 'Line sheet — MerchDesk',
  description: 'Printable one-page concept line sheet.',
}

export default function LineSheetPage() {
  return <LineSheetView />
}
