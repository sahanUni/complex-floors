import { test, expect, type APIRequestContext, type Page, type Request } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
const SEED_FILE_ID = 4
const SEED_PROJECT_NAME = 'Riverside Residential Complex'
const SEED_FILE_NAME = 'ground-floor-plan.pdf'

interface AnnotationRecord {
  id: number
  file_id: number
  page: number
  x0: number
  y0: number
  x1: number
  y1: number
}

async function openSeedViewer(page: Page) {
  await page.goto('/')
  await page.getByText(SEED_PROJECT_NAME).first().click()
  await page.getByRole('button', { name: new RegExp(SEED_FILE_NAME.replace('.', '\\.')) }).click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
}

async function waitForOverlay(page: Page) {
  await expect(page.locator('[data-testid="pdf-viewer"] .react-pdf__Page__canvas').first()).toBeVisible({ timeout: 12000 })
  const svg = page.locator('[data-testid="pdf-viewer"] svg').first()
  await expect(svg).toBeVisible({ timeout: 5000 })
  return svg
}

async function createAnnotation(request: APIRequestContext, fileId = SEED_FILE_ID, page = 1): Promise<AnnotationRecord> {
  const res = await request.post(`${API}/files/${fileId}/annotations`, {
    data: { page, x0: 120, y0: 500, x1: 260, y1: 680 },
  })
  expect(res.status()).toBe(201)
  return await res.json()
}

function twoPagePdf() {
  const objects = [
    '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n',
    '2 0 obj<</Type /Pages /Kids [3 0 R 4 0 R] /Count 2>>endobj\n',
    '3 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources<<>> /Contents 5 0 R>>endobj\n',
    '4 0 obj<</Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources<<>> /Contents 6 0 R>>endobj\n',
    '5 0 obj<</Length 0>>\nstream\n\nendstream\nendobj\n',
    '6 0 obj<</Length 0>>\nstream\n\nendstream\nendobj\n',
  ]

  let pdf = '%PDF-1.4\n'
  const offsets: number[] = []
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf))
    pdf += object
  }

  const xrefPosition = Buffer.byteLength(pdf)
  pdf += 'xref\n0 7\n0000000000 65535 f \n'
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`
  }
  pdf += `trailer\n<</Size 7 /Root 1 0 R>>\nstartxref\n${xrefPosition}\n%%EOF\n`
  return Buffer.from(pdf)
}

test('Delete existing annotation', async ({ request }) => {
  const ann = await createAnnotation(request)

  const res = await request.delete(`${API}/annotations/${ann.id}`)
  expect(res.status()).toBe(204)

  const annotations = await (await request.get(`${API}/files/${SEED_FILE_ID}/annotations`)).json()
  expect(annotations.some((item: AnnotationRecord) => item.id === ann.id)).toBe(false)
})

test('Delete non-existent annotation', async ({ request }) => {
  const res = await request.delete(`${API}/annotations/2147483647`)
  expect(res.status()).toBe(404)
})

test('Draw mode is active by default', async ({ page }) => {
  await openSeedViewer(page)
  const svg = await waitForOverlay(page)

  await expect(page.getByRole('button', { name: 'Draw' })).toHaveAttribute('aria-pressed', 'true')
  await expect(svg).toHaveCSS('cursor', 'crosshair')
})

test('User switches to Select mode', async ({ page }) => {
  await openSeedViewer(page)
  const svg = await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()

  await expect(page.getByRole('button', { name: 'Select' })).toHaveAttribute('aria-pressed', 'true')
  await expect(svg).toHaveCSS('cursor', 'pointer')
})

test('User switches back to Draw mode', async ({ page }) => {
  await openSeedViewer(page)
  const svg = await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()
  await page.getByRole('button', { name: 'Draw' }).click()

  await expect(page.getByRole('button', { name: 'Draw' })).toHaveAttribute('aria-pressed', 'true')
  await expect(svg).toHaveCSS('cursor', 'crosshair')
})

test('Drawing is disabled in Select mode', async ({ page }) => {
  await openSeedViewer(page)
  const svg = await waitForOverlay(page)
  await page.waitForTimeout(500)
  const rects = page.getByTestId('annotation-rect')
  const countBefore = await rects.count()
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG not found')

  await page.getByRole('button', { name: 'Select' }).click()
  await page.mouse.move(box.x + box.width * 0.15, box.y + box.height * 0.15)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.45, box.y + box.height * 0.45)
  await page.mouse.up()

  await expect(rects).toHaveCount(countBefore)
})

test('Clicking a rect in Select mode selects it', async ({ page, request }) => {
  const ann = await createAnnotation(request)
  await openSeedViewer(page)
  await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()
  const rect = page.locator(`[data-annotation-id="${ann.id}"]`)
  await expect(rect).toBeVisible({ timeout: 5000 })
  await rect.click()

  await expect(rect).toHaveAttribute('data-selected', 'true')
  await expect(page.getByTestId('delete-annotation')).toBeVisible()

  await request.delete(`${API}/annotations/${ann.id}`)
})

test('Clicking outside deselects', async ({ page, request }) => {
  const ann = await createAnnotation(request)
  await openSeedViewer(page)
  const svg = await waitForOverlay(page)
  const box = await svg.boundingBox()
  if (!box) throw new Error('SVG not found')

  await page.getByRole('button', { name: 'Select' }).click()
  const rect = page.locator(`[data-annotation-id="${ann.id}"]`)
  await rect.click()
  await expect(page.getByTestId('delete-annotation')).toBeVisible()

  await page.mouse.click(box.x + box.width * 0.95, box.y + box.height * 0.05)

  await expect(rect).toHaveAttribute('data-selected', 'false')
  await expect(page.getByTestId('delete-annotation')).toBeHidden()

  await request.delete(`${API}/annotations/${ann.id}`)
})

test('Delete button triggers confirmation dialog', async ({ page, request }) => {
  const ann = await createAnnotation(request)
  await openSeedViewer(page)
  await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()
  await page.locator(`[data-annotation-id="${ann.id}"]`).click()
  let dialogMessage = ''
  page.once('dialog', async (dialog) => {
    dialogMessage = dialog.message()
    await dialog.dismiss()
  })
  await page.getByTestId('delete-annotation').click()

  expect(dialogMessage).toBe('Delete this annotation?')

  await request.delete(`${API}/annotations/${ann.id}`)
})

test('Confirming deletion removes the annotation', async ({ page, request }) => {
  const ann = await createAnnotation(request)
  await openSeedViewer(page)
  await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()
  const rect = page.locator(`[data-annotation-id="${ann.id}"]`)
  await rect.click()

  page.once('dialog', (dialog) => dialog.accept())
  const deleteRequest = page.waitForRequest((req: Request) => req.method() === 'DELETE' && req.url().endsWith(`/annotations/${ann.id}`))
  await page.getByTestId('delete-annotation').click()
  await deleteRequest

  await expect(rect).toHaveCount(0)
  await expect(page.getByTestId('delete-annotation')).toBeHidden()
})

test('Cancelling deletion keeps the annotation', async ({ page, request }) => {
  const ann = await createAnnotation(request)
  const deleteRequests: string[] = []
  page.on('request', (req: Request) => {
    if (req.method() === 'DELETE' && req.url().endsWith(`/annotations/${ann.id}`)) {
      deleteRequests.push(req.url())
    }
  })
  await openSeedViewer(page)
  await waitForOverlay(page)

  await page.getByRole('button', { name: 'Select' }).click()
  const rect = page.locator(`[data-annotation-id="${ann.id}"]`)
  await rect.click()
  page.once('dialog', (dialog) => dialog.dismiss())
  await page.getByTestId('delete-annotation').click()
  await page.waitForTimeout(300)

  await expect(rect).toBeVisible()
  await expect(rect).toHaveAttribute('data-selected', 'true')
  expect(deleteRequests).toHaveLength(0)

  await request.delete(`${API}/annotations/${ann.id}`)
})

test('Switching page clears selection', async ({ page, request }) => {
  const project = await request.post(`${API}/projects`, { data: { name: `Page Clear ${Date.now()}` } })
  const { id: projectId, name: projectName } = await project.json()
  const upload = await request.post(`${API}/projects/${projectId}/files`, {
    multipart: { files: { name: 'two-page.pdf', mimeType: 'application/pdf', buffer: twoPagePdf() } },
  })
  const [file] = await upload.json()
  const ann = await createAnnotation(request, file.id, 1)

  await page.goto('/')
  await page.getByText(projectName).click()
  await page.getByText('two-page.pdf').click()
  await waitForOverlay(page)
  await expect(page.getByText(/Page 1 of 2/i)).toBeVisible({ timeout: 12000 })

  await page.getByRole('button', { name: 'Select' }).click()
  await page.locator(`[data-annotation-id="${ann.id}"]`).click()
  await expect(page.getByTestId('delete-annotation')).toBeVisible()

  await page.locator('button', { hasText: 'Next →' }).click()
  await expect(page.getByText(/Page 2 of 2/i)).toBeVisible()
  await expect(page.getByTestId('delete-annotation')).toBeHidden()

  await page.getByRole('button', { name: /Prev/i }).click()
  await expect(page.getByText(/Page 1 of 2/i)).toBeVisible()
  await expect(page.getByTestId('delete-annotation')).toBeHidden()

  await request.delete(`${API}/projects/${projectId}`)
})
