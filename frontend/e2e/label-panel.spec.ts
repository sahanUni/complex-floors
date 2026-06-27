import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

function validPdf(): Buffer {
  const obj1 = '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n'
  const obj2 = '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n'
  const obj3 = '3 0 obj<</Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R/Resources<<>> /Contents 4 0 R>>endobj\n'
  const content = 'BT /F1 12 Tf 72 720 Td (Test Page) Tj ET'
  const obj4 = `4 0 obj<</Length ${content.length}>>\nstream\n${content}\nendstream\nendobj\n`
  const header = '%PDF-1.4\n'
  const parts = [obj1, obj2, obj3, obj4]
  const offsets: number[] = []
  let body = ''
  for (const p of parts) {
    offsets.push(Buffer.byteLength(header) + Buffer.byteLength(body))
    body += p
  }
  const xrefPos = Buffer.byteLength(header) + Buffer.byteLength(body)
  let xref = 'xref\n0 5\n0000000000 65535 f \n'
  for (const o of offsets) xref += `${String(o).padStart(10, '0')} 00000 n \n`
  const trailer = `trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`
  return Buffer.from(header + body + xref + trailer)
}

let PROJ_ID = 0
const FILE_NAME = 'lp-test.pdf'

test.beforeAll(async ({ request }) => {
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `Label Panel Test ${Date.now()}` },
  })
  PROJ_ID = (await projRes.json()).id

  await request.post(`${API}/projects/${PROJ_ID}/files`, {
    multipart: { files: { name: FILE_NAME, mimeType: 'application/pdf', buffer: validPdf() } },
  })
})

test.afterAll(async ({ request }) => {
  if (PROJ_ID) await request.delete(`${API}/projects/${PROJ_ID}`)
})

async function openViewer(page: any) {
  await page.goto(`/projects/${PROJ_ID}`)
  await page.getByRole('button', { name: new RegExp(FILE_NAME) }).click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
}

async function waitForCanvas(page: any) {
  const canvas = page.locator('[data-testid="pdf-viewer"] .react-pdf__Page__canvas').first()
  await expect(canvas).toBeVisible({ timeout: 12000 })
  return canvas
}

async function waitForSvg(page: any) {
  const svg = page.locator('[data-testid="pdf-viewer"] svg').first()
  await expect(svg).toBeVisible({ timeout: 5000 })
  return svg
}

async function drawBox(page: any, svg: any, x1f: number, y1f: number, x2f: number, y2f: number) {
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG bounding box not found')
  await page.mouse.move(box.x + box.width * x1f, box.y + box.height * y1f)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * x2f, box.y + box.height * y2f, { steps: 5 })
  await page.mouse.up()
}

// 7.1
test('Label panel appears after drawing a box', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await expect(panel.getByLabel('Category')).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Confirm' })).toBeVisible()
  await expect(panel.getByRole('button', { name: 'Cancel' })).toBeVisible()
})

// 7.2
test('Floor Plan category shows level code dropdown', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('floor-plan')
  await expect(panel.getByLabel('Level code')).toBeVisible()
  await expect(panel.getByLabel('Display name')).toBeVisible()
})

// 7.3
test('Non-floor-plan category shows free text label input', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('elevation')
  await expect(panel.getByLabel('Label')).toBeVisible()
  await expect(panel.getByLabel('Level code')).toHaveCount(0)
})

// 7.4
test('Note field available for all categories', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await expect(panel.getByLabel('Note')).toBeVisible()
})

// 7.5
test('Cancel discards the drawn box', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })

  const postRequests: string[] = []
  page.on('request', (req: any) => {
    if (req.method() === 'POST') postRequests.push(req.url())
  })

  await panel.getByRole('button', { name: 'Cancel' }).click()
  await expect(panel).toHaveCount(0, { timeout: 3000 })
  await expect(page.getByTestId('pending-annotation-rect')).toHaveCount(0)
  expect(postRequests.filter((u) => u.includes('/annotations')).length).toBe(0)
})

// 7.6
test('Confirm saves annotation and triggers extraction', async ({ page, request }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.15, 0.15, 0.45, 0.45)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('floor-plan')
  await panel.getByLabel('Level code').selectOption('L01')
  await panel.getByRole('button', { name: 'Confirm' }).click()

  await expect(panel).toHaveCount(0, { timeout: 12000 })

  const res = await request.get(`${API}/projects/${PROJ_ID}/extractions`)
  expect(res.status()).toBe(200)
  const extractions = await res.json()
  expect(Array.isArray(extractions)).toBe(true)
  expect(extractions.length).toBeGreaterThan(0)
  expect(extractions.some((e: any) => e.category === 'floor-plan' && e.label_code === 'L01')).toBe(true)
})

// 7.7
test('Confirm requires category selection', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByRole('button', { name: 'Confirm' }).click()
  await expect(panel.getByRole('alert')).toBeVisible()
  await expect(panel).toBeVisible()
})

// 7.8
test('Confirm requires level code for Floor Plan', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('floor-plan')
  await panel.getByRole('button', { name: 'Confirm' }).click()
  await expect(panel.getByRole('alert')).toBeVisible()
  await expect(panel).toBeVisible()
})

// new: spec scenario "label input required for non-floor-plan"
test('Confirm requires label text for non-floor-plan category', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.1, 0.1, 0.4, 0.4)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('elevation')
  await panel.getByRole('button', { name: 'Confirm' }).click()
  await expect(panel.getByRole('alert')).toBeVisible()
  await expect(panel).toBeVisible()
})

// 7.21
test('Confirmed annotation persists on overlay', async ({ page }) => {
  await openViewer(page)
  await waitForCanvas(page)
  const svg = await waitForSvg(page)
  await drawBox(page, svg, 0.2, 0.2, 0.5, 0.5)

  const panel = page.getByTestId('label-panel')
  await expect(panel).toBeVisible({ timeout: 5000 })
  await panel.getByLabel('Category').selectOption('floor-plan')
  await panel.getByLabel('Level code').selectOption('L02')
  await panel.getByRole('button', { name: 'Confirm' }).click()

  await expect(panel).toHaveCount(0, { timeout: 12000 })
  await expect(page.getByTestId('annotation-rect').last()).toBeVisible({ timeout: 5000 })
})
