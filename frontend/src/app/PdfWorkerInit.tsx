'use client'

import { useEffect } from 'react'
import { pdfjs } from 'react-pdf'

export default function PdfWorkerInit() {
  useEffect(() => {
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  }, [])
  return null
}
