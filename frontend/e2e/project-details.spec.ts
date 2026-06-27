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
let PROJ_NAME = ''
let PROJ_WITH_EXTRACTIONS_ID = 0

test.beforeAll(async ({ request }) => {
  // Project for navigation tests (7.14, 7.19, 7.20, 7.18)
  PROJ_NAME = `PD Nav Test ${Date.now()}`
  const projRes = await request.post(`${API}/projects`, { data: { name: PROJ_NAME, description: 'test' } })
  PROJ_ID = (await projRes.json()).id

  const uploadRes = await request.post(`${API}/projects/${PROJ_ID}/files`, {
    multipart: { files: { name: 'nav-test.pdf', mimeType: 'application/pdf', buffer: validPdf() } },
  })
  const [file] = await uploadRes.json()

  // Project for 7.15 (extractions test) — same project, add an extraction
  const annRes = await request.post(`${API}/files/${file.id}/annotations`, {
    data: { page: 1, x0: 50, y0: 50, x1: 400, y1: 600 },
  })
  const ann = await annRes.json()
  await request.post(`${API}/annotations/${ann.id}/extract`, {
    data: { category: 'floor-plan', label_code: 'L01', label_display: 'Ground Floor' },
  })
  PROJ_WITH_EXTRACTIONS_ID = PROJ_ID
})

test.afterAll(async ({ request }) => {
  if (PROJ_ID) await request.delete(`${API}/projects/${PROJ_ID}`)
})

// 7.14
test('Project Details page renders on navigation', async ({ page }) => {
  await page.goto('/')
  await page.getByText(PROJ_NAME).click()
  await expect(page).toHaveURL(/\/projects\/\d+/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /nav-test\.pdf/ })).toBeVisible()
})

// 7.15
test('Extracted SVGs displayed grouped by source file', async ({ page }) => {
  await page.goto(`/projects/${PROJ_WITH_EXTRACTIONS_ID}`)
  await expect(page.getByRole('button', { name: /nav-test\.pdf/ })).toBeVisible()
  await expect(page.getByText('L01 - Ground Floor')).toBeVisible()
  const svgObj = page.locator('object[type="image/svg+xml"]')
  await expect(svgObj.first()).toBeAttached({ timeout: 5000 })
})

// 7.16
test('Project with no extractions shows empty state', async ({ page, request }) => {
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `Empty Extractions ${Date.now()}` },
  })
  const { id: projId } = await projRes.json()

  await request.post(`${API}/projects/${projId}/files`, {
    multipart: { files: { name: 'empty.pdf', mimeType: 'application/pdf', buffer: validPdf() } },
  })

  await page.goto(`/projects/${projId}`)
  await expect(page.getByText('No extractions exist yet.')).toBeVisible()

  await request.delete(`${API}/projects/${projId}`)
})

// 7.17
test('Non-existent project shows not found state', async ({ page }) => {
  await page.goto('/projects/999999')
  await expect(page.getByText(/not found/i).first()).toBeVisible()
})

// 7.18
test('Back navigation returns to project list', async ({ page }) => {
  await page.goto(`/projects/${PROJ_ID}`)
  await page.getByText('Back to projects').click()
  await expect(page).toHaveURL('/')
  await expect(page.getByRole('heading', { name: 'Floor Plan Projects' })).toBeVisible()
})

// 7.19
test('Clicking a project navigates to its details page', async ({ page }) => {
  await page.goto('/')
  await page.getByText(PROJ_NAME).click()
  await expect(page).toHaveURL(/\/projects\/\d+/)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

// new: GET /projects/{id} direct API coverage
test('GET /projects/{id} returns project object', async ({ request }) => {
  const res = await request.get(`${API}/projects/${PROJ_ID}`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toHaveProperty('id', PROJ_ID)
  expect(body).toHaveProperty('name')
  expect(body).toHaveProperty('created_at')
})

test('GET /projects/{id} returns 404 for unknown project', async ({ request }) => {
  const res = await request.get(`${API}/projects/999999`)
  expect(res.status()).toBe(404)
})

// 7.20
test('Project list does not expand inline', async ({ page }) => {
  await page.goto('/')
  await page.getByText(PROJ_NAME).click()
  await expect(page).toHaveURL(/\/projects\/\d+/)
  await expect(page.getByRole('heading', { name: 'Floor Plan Projects' })).not.toBeVisible()
})
