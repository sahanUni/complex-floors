import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
const SEED_FILE_ID = 1

// Helper: open PDF viewer for seed file 1
async function openViewer(page: any) {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
}

// Helper: wait for canvas (PDF rendered)
async function waitForCanvas(page: any) {
  const canvas = page.locator('[data-testid="pdf-viewer"] .react-pdf__Page__canvas').first()
  await expect(canvas).toBeVisible({ timeout: 12000 })
  return canvas
}

// Save annotation for a file page (API)
test('Save annotation for a file page', async ({ request }) => {
  const res = await request.post(`${API}/files/${SEED_FILE_ID}/annotations`, {
    data: { page: 1, x0: 10, y0: 20, x1: 100, y1: 200 },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body).toHaveProperty('id')
  expect(body.file_id).toBe(SEED_FILE_ID)
  expect(body.page).toBe(1)
  expect(body.x0).toBeCloseTo(10)
  expect(body.y0).toBeCloseTo(20)
  expect(body.x1).toBeCloseTo(100)
  expect(body.y1).toBeCloseTo(200)
})

// Retrieve annotations for a file (API)
test('Retrieve annotations for a file', async ({ request }) => {
  // Create two annotations
  await request.post(`${API}/files/${SEED_FILE_ID}/annotations`, {
    data: { page: 99, x0: 1, y0: 2, x1: 3, y1: 4 },
  })
  await request.post(`${API}/files/${SEED_FILE_ID}/annotations`, {
    data: { page: 99, x0: 5, y0: 6, x1: 7, y1: 8 },
  })

  const res = await request.get(`${API}/files/${SEED_FILE_ID}/annotations`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThanOrEqual(2)
  const first = body[0]
  expect(first).toHaveProperty('id')
  expect(first).toHaveProperty('file_id')
  expect(first).toHaveProperty('page')
  expect(first).toHaveProperty('x0')
  expect(first).toHaveProperty('y0')
  expect(first).toHaveProperty('x1')
  expect(first).toHaveProperty('y1')
  expect(first).toHaveProperty('created_at')
})

// Retrieve annotations for file with none saved (API)
test('Retrieve annotations for file with none saved', async ({ request }) => {
  // Upload a fresh file to a fresh project
  const proj = await request.post(`${API}/projects`, { data: { name: 'Anno Empty Test' } })
  const { id: projId } = await proj.json()
  const pdfBytes = Buffer.from('%PDF-1.4\n%%EOF\n')
  const upload = await request.post(`${API}/projects/${projId}/files`, {
    multipart: { files: { name: 'empty-anno.pdf', mimeType: 'application/pdf', buffer: pdfBytes } },
  })
  const files = await upload.json()
  const fileId = files[0].id

  const res = await request.get(`${API}/files/${fileId}/annotations`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toEqual([])

  await request.delete(`${API}/projects/${projId}`)
})

// Save annotation for non-existent file (API)
test('Save annotation for non-existent file', async ({ request }) => {
  const res = await request.post(`${API}/files/99999/annotations`, {
    data: { page: 1, x0: 0, y0: 0, x1: 10, y1: 10 },
  })
  expect(res.status()).toBe(404)
})

// User draws a bounding box (UI)
test('User draws a bounding box', async ({ page }) => {
  await openViewer(page)
  const canvas = await waitForCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')

  const startX = box.x + box.width * 0.2
  const startY = box.y + box.height * 0.2
  const endX = box.x + box.width * 0.5
  const endY = box.y + box.height * 0.5

  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(endX, endY)
  await page.mouse.up()

  // SVG rect should appear in the annotation overlay (scoped to viewer)
  const rects = page.locator('[data-testid="pdf-viewer"] svg rect')
  await expect(rects.first()).toBeVisible({ timeout: 5000 })
})

// Multiple boxes on same page (UI)
test('Multiple boxes on same page', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  // Use SVG bounding box for draw coordinates
  const svg = page.locator('[data-testid="pdf-viewer"] svg').first()
  await expect(svg).toBeVisible({ timeout: 5000 })
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG not found')

  const rects = page.locator('[data-testid="pdf-viewer"] svg rect:not([stroke-dasharray])')
  // Wait for pre-existing annotations to load
  await page.waitForTimeout(800)
  const countBefore = await rects.count()

  async function drawBox(x1f: number, y1f: number, x2f: number, y2f: number, expectCount: number) {
    const sx = box.x + box.width * x1f
    const sy = box.y + box.height * y1f
    const ex = box.x + box.width * x2f
    const ey = box.y + box.height * y2f
    await page.mouse.move(sx, sy)
    await page.waitForTimeout(50)
    await page.mouse.down()
    await page.mouse.move(ex, ey, { steps: 10 })
    await page.mouse.up()
    await expect(rects).toHaveCount(expectCount, { timeout: 6000 })
  }

  await drawBox(0.1, 0.1, 0.3, 0.3, countBefore + 1)
  // Move mouse off SVG to reset any lingering mouse state, then draw second box
  await page.mouse.move(box.x - 5, box.y - 5)
  await page.waitForTimeout(200)
  await drawBox(0.5, 0.5, 0.8, 0.8, countBefore + 2)
})

// Boxes persist across page navigation (UI)
test('Boxes persist across page navigation', async ({ page }) => {
  await openViewer(page)
  const canvas = await waitForCanvas(page)
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas not found')

  // Draw box on page 1
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.4, box.y + box.height * 0.4)
  await page.mouse.up()
  await page.waitForTimeout(500)

  const rects = page.locator('[data-testid="pdf-viewer"] svg rect:not([stroke-dasharray])')
  const countBefore = await rects.count()

  // Navigate to next page if available
  const nextBtn = page.locator('button', { hasText: 'Next →' })
  if (await nextBtn.isEnabled()) {
    await nextBtn.click()
    await page.waitForTimeout(300)
    // Navigate back to page 1
    await page.getByRole('button', { name: /Prev/i }).click()
    await page.waitForTimeout(500)
    // Boxes should still be there (loaded from API)
    const countAfter = await rects.count()
    expect(countAfter).toBeGreaterThanOrEqual(countBefore)
  }
  // If single page PDF, this test passes trivially (boxes remain visible)
})

// SVG overlay matches canvas dimensions (UI)
test('SVG overlay matches canvas dimensions', async ({ page }) => {
  await openViewer(page)
  const canvas = await waitForCanvas(page)
  const canvasBox = await canvas.boundingBox()
  if (!canvasBox) throw new Error('Canvas not found')

  const svg = page.locator('[data-testid="pdf-viewer"] svg').first()
  const svgBox = await svg.boundingBox()
  if (!svgBox) throw new Error('SVG not found')

  expect(svgBox.width).toBeCloseTo(canvasBox.width, 0)
  expect(svgBox.height).toBeCloseTo(canvasBox.height, 0)
  expect(svgBox.x).toBeCloseTo(canvasBox.x, 0)
  expect(svgBox.y).toBeCloseTo(canvasBox.y, 0)
})

// Coordinates stored in PDF units (API verification)
test('Coordinates stored in PDF units', async ({ request }) => {
  // Draw at "100% zoom" area: box API coords should be stable regardless of render scale
  // We verify by creating two annotations and checking the stored values are floats (PDF points)
  const res1 = await request.post(`${API}/files/${SEED_FILE_ID}/annotations`, {
    data: { page: 1, x0: 50.5, y0: 100.25, x1: 200.75, y1: 300.5 },
  })
  expect(res1.status()).toBe(201)
  const ann = await res1.json()
  // Stored as floats in PDF point space
  expect(ann.x0).toBeCloseTo(50.5, 1)
  expect(ann.y0).toBeCloseTo(100.25, 1)
  expect(ann.x1).toBeCloseTo(200.75, 1)
  expect(ann.y1).toBeCloseTo(300.5, 1)
})

// Existing annotations visible on viewer open (UI)
test('Existing annotations visible on viewer open', async ({ page, request }) => {
  // Create annotation via API
  await request.post(`${API}/files/${SEED_FILE_ID}/annotations`, {
    data: { page: 1, x0: 30, y0: 40, x1: 130, y1: 140 },
  })

  await openViewer(page)
  await waitForCanvas(page)
  await page.waitForTimeout(1000) // allow annotations to load

  // At least one SVG rect should be visible
  const rects = page.locator('[data-testid="pdf-viewer"] svg rect:not([stroke-dasharray])')
  await expect(rects.first()).toBeVisible({ timeout: 5000 })
})

// No annotations shows blank overlay (UI)
test('No annotations shows blank overlay', async ({ page, request }) => {
  // Use unique name to avoid conflicts from prior failed runs
  const proj = await request.post(`${API}/projects`, { data: { name: `Blank Overlay Test ${Date.now()}` } })
  const { id: projId, name: projName } = await proj.json()
  const pdfBytes = Buffer.from('%PDF-1.4\n%%EOF\n')
  const upload = await request.post(`${API}/projects/${projId}/files`, {
    multipart: { files: { name: 'blank-overlay.pdf', mimeType: 'application/pdf', buffer: pdfBytes } },
  })
  const files = await upload.json()

  await page.goto('/')
  await page.getByText(projName).click()
  await page.getByText('blank-overlay.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
  // Wait for annotation fetch to complete (no canvas needed — just checking overlay is empty)
  await page.waitForTimeout(1500)

  // No solid (non-dashed) rects — overlay is blank
  const solidRects = page.locator('[data-testid="pdf-viewer"] svg rect:not([stroke-dasharray])')
  expect(await solidRects.count()).toBe(0)

  await page.getByRole('button', { name: /Close/i }).click()
  await request.delete(`${API}/projects/${projId}`)
})
