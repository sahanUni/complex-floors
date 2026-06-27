'use client'

import { useEffect, useRef, useState } from 'react'
import LabelPanel, { type ExtractionLabel } from './LabelPanel'

interface Annotation {
  id: number
  file_id: number
  page: number
  x0: number
  y0: number
  x1: number
  y1: number
}

type PendingAnnotation = Omit<Annotation, 'id' | 'file_id'> & {
  rect: { x: number; y: number; width: number; height: number }
}

interface PageDimensions {
  widthPt: number
  heightPt: number
  widthPx: number
  heightPx: number
}

interface Props {
  fileId: number
  page: number
  dimensions: PageDimensions | null
  mode: 'draw' | 'select'
}

export default function AnnotationLayer({ fileId, page, dimensions, mode }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const [pending, setPending] = useState<PendingAnnotation | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmError, setConfirmError] = useState('')
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}/annotations`)
      .then((r) => r.json())
      .then((data: Annotation[]) => setAnnotations(data.filter((a) => a.page === page)))
      .catch(() => {})
  }, [fileId, page])

  if (!dimensions) return null

  const { widthPt, heightPt, widthPx, heightPx } = dimensions

  // Convert PDF-point coords to screen-pixel coords for display
  // PDF origin: bottom-left; screen origin: top-left — flip Y
  function ptToScreen(xPt: number, yPt: number) {
    return {
      x: (xPt / widthPt) * widthPx,
      y: ((heightPt - yPt) / heightPt) * heightPx,
    }
  }

  // Convert screen-pixel coords to PDF-point coords
  function screenToPt(xPx: number, yPx: number) {
    return {
      x: (xPx / widthPx) * widthPt,
      y: heightPt - (yPx / heightPx) * heightPt,
    }
  }

  function getRelativeCoords(e: React.MouseEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  function getRectBounds(ann: Annotation) {
    const tl = ptToScreen(ann.x0, ann.y1)
    const br = ptToScreen(ann.x1, ann.y0)
    return {
      x: tl.x,
      y: tl.y,
      width: br.x - tl.x,
      height: br.y - tl.y,
    }
  }

  function findAnnotationAt(pos: { x: number; y: number }) {
    return [...annotations].reverse().find((ann) => {
      const rect = getRectBounds(ann)
      return (
        pos.x >= rect.x &&
        pos.x <= rect.x + rect.width &&
        pos.y >= rect.y &&
        pos.y <= rect.y + rect.height
      )
    })
  }

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== 'draw') return
    const pos = getRelativeCoords(e)
    setDrawing(pos)
    setCursor(pos)
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing) return
    setCursor(getRelativeCoords(e))
  }

  async function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== 'draw' || !drawing) return
    const end = getRelativeCoords(e)

    const startPt = screenToPt(drawing.x, drawing.y)
    const endPt = screenToPt(end.x, end.y)

    const x0 = Math.min(startPt.x, endPt.x)
    const x1 = Math.max(startPt.x, endPt.x)
    const y0 = Math.min(startPt.y, endPt.y)
    const y1 = Math.max(startPt.y, endPt.y)

    setDrawing(null)
    setCursor(null)

    if (Math.abs(x1 - x0) < 2 && Math.abs(y1 - y0) < 2) return

    const rect = {
      x: Math.min(drawing.x, end.x),
      y: Math.min(drawing.y, end.y),
      width: Math.abs(end.x - drawing.x),
      height: Math.abs(end.y - drawing.y),
    }
    setPending({ page, x0, y0, x1, y1, rect })
    setConfirmError('')
  }

  async function confirmPending(label: ExtractionLabel) {
    if (!pending) return
    setConfirming(true)
    setConfirmError('')
    let createdId: number | null = null
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            page: pending.page,
            x0: pending.x0,
            y0: pending.y0,
            x1: pending.x1,
            y1: pending.y1,
          }),
        }
      )
      if (!res.ok) throw new Error('Could not save annotation')
      const ann: Annotation = await res.json()
      createdId = ann.id

      const extractRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/annotations/${ann.id}/extract`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(label),
        }
      )
      if (!extractRes.ok) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/annotations/${ann.id}`, {
          method: 'DELETE',
        }).catch(() => {})
        throw new Error('Could not extract region')
      }

      setAnnotations((prev) => [...prev, ann])
      setPending(null)
    } catch (err) {
      if (createdId !== null) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/annotations/${createdId}`, {
          method: 'DELETE',
        }).catch(() => {})
      }
      setConfirmError(err instanceof Error ? err.message : 'Could not confirm annotation')
    } finally {
      setConfirming(false)
    }
  }

  function cancelPending() {
    if (confirming) return
    setPending(null)
    setConfirmError('')
  }

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (mode !== 'select') return
    const ann = findAnnotationAt(getRelativeCoords(e))
    setSelectedId(ann?.id ?? null)
  }

  async function handleDelete(e: React.MouseEvent, annotationId: number) {
    e.preventDefault()
    e.stopPropagation()
    if (!window.confirm('Delete this annotation?')) return

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/annotations/${annotationId}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setAnnotations((prev) => prev.filter((ann) => ann.id !== annotationId))
        setSelectedId(null)
      }
    } catch {}
  }

  const liveRect =
    drawing && cursor
      ? {
          x: Math.min(drawing.x, cursor.x),
          y: Math.min(drawing.y, cursor.y),
          w: Math.abs(cursor.x - drawing.x),
          h: Math.abs(cursor.y - drawing.y),
        }
      : null

  return (
    <svg
      ref={svgRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: widthPx,
        height: heightPx,
        cursor: mode === 'draw' ? 'crosshair' : 'pointer',
        userSelect: 'none',
        zIndex: 100,
        pointerEvents: 'all',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onMouseLeave={() => { if (drawing) { setDrawing(null); setCursor(null) } }}
    >
      {annotations.map((ann) => {
        const rect = getRectBounds(ann)
        const selected = selectedId === ann.id
        return (
          <g key={ann.id}>
            <rect
              data-testid="annotation-rect"
              data-annotation-id={ann.id}
              data-selected={selected ? 'true' : 'false'}
              x={rect.x}
              y={rect.y}
              width={rect.width}
              height={rect.height}
              fill="rgba(59,130,246,0.15)"
              stroke={selected ? '#dc2626' : '#3b82f6'}
              strokeWidth={selected ? 2.5 : 1.5}
            />
            {selected && (
              <foreignObject
                x={Math.max(0, Math.min(rect.x + rect.width - 16, widthPx - 20))}
                y={Math.max(0, rect.y - 10)}
                width={24}
                height={24}
              >
                <button
                  aria-label="Delete annotation"
                  data-testid="delete-annotation"
                  onClick={(e) => handleDelete(e, ann.id)}
                  style={{
                    width: 20,
                    height: 20,
                    border: '1px solid #dc2626',
                    borderRadius: 10,
                    background: '#fff',
                    color: '#dc2626',
                    cursor: 'pointer',
                    lineHeight: '16px',
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  ×
                </button>
              </foreignObject>
            )}
          </g>
        )
      })}
      {liveRect && (
        <rect
          x={liveRect.x}
          y={liveRect.y}
          width={liveRect.w}
          height={liveRect.h}
          fill="rgba(59,130,246,0.1)"
          stroke="#3b82f6"
          strokeWidth={1.5}
          strokeDasharray="4"
        />
      )}
      {pending && (
        <>
          <rect
            data-testid="pending-annotation-rect"
            x={pending.rect.x}
            y={pending.rect.y}
            width={pending.rect.width}
            height={pending.rect.height}
            fill="rgba(59,130,246,0.1)"
            stroke="#2563eb"
            strokeWidth={1.5}
            strokeDasharray="4"
          />
          <foreignObject
            x={Math.max(
              8,
              pending.rect.x + pending.rect.width + 276 > widthPx
                ? pending.rect.x - 276
                : pending.rect.x + pending.rect.width + 8
            )}
            y={Math.max(8, Math.min(pending.rect.y, heightPx - 340))}
            width={268}
            height={332}
          >
            <LabelPanel
              busy={confirming}
              error={confirmError}
              onCancel={cancelPending}
              onConfirm={confirmPending}
            />
          </foreignObject>
        </>
      )}
    </svg>
  )
}
