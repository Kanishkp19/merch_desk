'use client'

import React from 'react'
import { Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { views } from '@/lib/routes'
import { useAppNavigate } from '@/lib/navigate'

import { useStudio } from '@/lib/state/StudioProvider'
import { imageFileExtension } from '@/lib/image/format'

export function ExportBar() {
  const navigate = useAppNavigate()
  const studio = useStudio()
  const approvedImages = studio.state.products.filter((p) => p.image.dataUrl && !p.image.outdated)

  const downloadAll = () => {
    for (const p of approvedImages) {
      if (!p.image.dataUrl) continue
      const a = document.createElement('a')
      a.href = p.image.dataUrl
      a.download = `merchdesk-${p.id}.${imageFileExtension(p.image.dataUrl)}`
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
  }

  return (
    <section aria-label="Export" className="bg-paper-2 border-2 border-ink rounded-md shadow-hard p-4 md:p-5">
      <h3 className="font-display text-xl uppercase mb-1">Export</h3>
      <p className="text-sm text-ink-2 mb-4">Hand your collection to a printer — or to your future self.</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="dark" onClick={() => navigate(views.lineSheet)}>
          <FileText className="h-4 w-4" aria-hidden /> Open line sheet
        </Button>
        <Button variant="secondary" onClick={downloadAll} disabled={approvedImages.length === 0}>
          <Download className="h-4 w-4" aria-hidden />
          Download all approved images {approvedImages.length > 0 && `(${approvedImages.length})`}
        </Button>
      </div>
      <p className="text-xs text-mute mt-3">Concept images are AI-generated and not final designs.</p>
    </section>
  )
}
