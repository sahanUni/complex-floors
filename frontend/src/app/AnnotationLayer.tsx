'use client'

import { useEffect, useRef, useState } from 'react'

interface Annotation {
  id: number
  file_id: number
  page: number
  x0: number
  y0: number
  x1: number
  y1: number
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
}

export default function AnnotationLayer({ fileId, page, dimensions }: Props) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [drawing, setDrawing] = useState<{ x: number; y: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
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

  function handleMouseDown(e: React.MouseEvent<SVGSVGElement>) {
    const pos = getRelativeCoords(e)
    setDrawing(pos)
    setCursor(pos)
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing) return
    setCursor(getRelativeCoords(e))
  }

  async function handleMouseUp(e: React.MouseEvent<SVGSVGElement>) {
    if (!drawing) return
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

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/files/${fileId}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ page, x0, y0, x1, y1 }),
        }
      )
      if (res.ok) {
        const ann: Annotation = await res.json()
        setAnnotations((prev) => [...prev, ann])
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
        cursor: 'crosshair',
        userSelect: 'none',
        zIndex: 100,
        pointerEvents: 'all',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => { setDrawing(null); setCursor(null) }}
    >
      {annotations.map((ann) => {
        const tl = ptToScreen(ann.x0, ann.y1)
        const br = ptToScreen(ann.x1, ann.y0)
        return (
          <rect
            key={ann.id}
            x={tl.x}
            y={tl.y}
            width={br.x - tl.x}
            height={br.y - tl.y}
            fill="rgba(59,130,246,0.15)"
            stroke="#3b82f6"
            strokeWidth={1.5}
          />
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
    </svg>
  )
}
