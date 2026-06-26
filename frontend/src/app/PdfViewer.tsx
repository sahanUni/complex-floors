'use client'

import { useEffect, useRef, useState } from 'react'
import { Document, Page, pdfjs } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import AnnotationLayer from './AnnotationLayer'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

interface PageDimensions {
  widthPt: number
  heightPt: number
  widthPx: number
  heightPx: number
}

interface Props {
  fileId: number
  onClose: () => void
}

type ViewerMode = 'draw' | 'select'

export default function PdfViewer({ fileId, onClose }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [dimensions, setDimensions] = useState<PageDimensions | null>(null)
  const [mode, setMode] = useState<ViewerMode>('draw')
  const blobRef = useRef<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}`)
      .then((r) => r.arrayBuffer())
      .then((buf) => {
        if (cancelled) return
        const blob = new Blob([buf], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        blobRef.current = url
        setBlobUrl(url)
      })
      .catch(() => {})
    return () => {
      cancelled = true
      if (blobRef.current) URL.revokeObjectURL(blobRef.current)
    }
  }, [fileId])

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages)
    setPage(1)
  }

  function onPageLoadSuccess(p: { width: number; height: number; originalWidth: number; originalHeight: number }) {
    setDimensions({
      widthPt: p.originalWidth,
      heightPt: p.originalHeight,
      widthPx: p.width,
      heightPx: p.height,
    })
  }

  return (
    <div data-testid="pdf-viewer" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '1rem',
        maxHeight: '95vh', overflow: 'auto', position: 'relative',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          <button onClick={onClose} style={btnStyle}>✕ Close</button>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} style={btnStyle}>← Prev</button>
          <span style={{ fontSize: '0.875rem' }}>Page {page} of {numPages || '…'}</span>
          <button onClick={() => setPage((p) => Math.min(numPages, p + 1))} disabled={page >= numPages} style={btnStyle}>Next →</button>
          <button onClick={() => setScale((s) => +(s + 0.25).toFixed(2))} style={btnStyle}>Zoom +</button>
          <button onClick={() => setScale((s) => +(Math.max(0.5, s - 0.25)).toFixed(2))} disabled={scale <= 0.5} style={btnStyle}>Zoom −</button>
          <span style={{ fontSize: '0.875rem', color: '#555' }}>{Math.round(scale * 100)}%</span>
          <span style={{ width: 1, height: 24, background: '#ddd' }} />
          <button
            type="button"
            aria-pressed={mode === 'draw'}
            onClick={() => setMode('draw')}
            style={toolBtnStyle(mode === 'draw')}
          >
            Draw
          </button>
          <button
            type="button"
            aria-pressed={mode === 'select'}
            onClick={() => setMode('select')}
            style={toolBtnStyle(mode === 'select')}
          >
            Select
          </button>
        </div>

        <div style={{ position: 'relative', display: 'inline-block' }}>
          {blobUrl && (
            <Document file={blobUrl} onLoadSuccess={onDocumentLoadSuccess}>
              <Page
                pageNumber={page}
                scale={scale}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer
                renderAnnotationLayer
              />
            </Document>
          )}
          {dimensions && (
            <AnnotationLayer
              key={`${fileId}-${page}`}
              fileId={fileId}
              page={page}
              dimensions={dimensions}
              mode={mode}
            />
          )}
        </div>
      </div>
    </div>
  )
}

const btnStyle: React.CSSProperties = {
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  cursor: 'pointer',
  background: '#f5f5f5',
}

function toolBtnStyle(active: boolean): React.CSSProperties {
  return {
    ...btnStyle,
    background: active ? '#111827' : '#f5f5f5',
    borderColor: active ? '#111827' : '#ccc',
    color: active ? '#fff' : '#111827',
  }
}
