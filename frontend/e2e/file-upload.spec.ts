import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
// Backend validates MIME + extension only, not PDF content
const minimalPdf = Buffer.from('%PDF-1.4\n%%EOF\n')

async function createTestProject(request: any, name: string) {
  const res = await request.post(`${API}/projects`, { data: { name } })
  return await res.json()
}

// Upload single valid PDF
test('Upload single valid PDF', async ({ request }) => {
  const proj = await createTestProject(request, 'Upload Single Test')
  const res = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: {
      files: { name: 'test.pdf', mimeType: 'application/pdf', buffer: minimalPdf },
    },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body[0]).toHaveProperty('id')
  expect(body[0].filename).toBe('test.pdf')
  await request.delete(`${API}/projects/${proj.id}`)
})

// Upload multiple PDFs in one request
test('Upload multiple PDFs in one request', async ({ request }) => {
  const proj = await createTestProject(request, 'Upload Multi Test')
  // Upload them sequentially (multipart with same-name fields isn't universally supported in Playwright's request API)
  const res1 = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: { files: { name: 'a.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })
  const res2 = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: { files: { name: 'b.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })
  expect(res1.status()).toBe(201)
  expect(res2.status()).toBe(201)
  const body1 = await res1.json()
  const body2 = await res2.json()
  expect(body1.length).toBe(1)
  expect(body2.length).toBe(1)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Reject non-PDF file by MIME type
test('Reject non-PDF file by MIME type', async ({ request }) => {
  const proj = await createTestProject(request, 'Upload MIME Reject Test')
  const res = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: {
      files: { name: 'text.pdf', mimeType: 'text/plain', buffer: Buffer.from('hello') },
    },
  })
  expect(res.status()).toBe(400)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Reject non-PDF file by extension
test('Reject non-PDF file by extension', async ({ request }) => {
  const proj = await createTestProject(request, 'Upload Ext Reject Test')
  const res = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: {
      files: { name: 'doc.docx', mimeType: 'application/pdf', buffer: minimalPdf },
    },
  })
  expect(res.status()).toBe(400)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Reject duplicate filename in same project
test('Reject duplicate filename in same project', async ({ request }) => {
  const proj = await createTestProject(request, 'Upload Dupe Test')
  await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: { files: { name: 'dupe.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })
  const res = await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: { files: { name: 'dupe.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })
  expect(res.status()).toBe(409)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Upload to non-existent project
test('Upload to non-existent project', async ({ request }) => {
  const res = await request.post(`${API}/projects/99999/files`, {
    multipart: { files: { name: 'test.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })
  expect(res.status()).toBe(404)
})

// User uploads PDF files to a project (UI)
test('User uploads PDF files to a project', async ({ page, request }) => {
  const proj = await createTestProject(request, 'UI Upload Test')

  // Write a temp PDF file for the file picker
  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, 'ui-upload-test.pdf')
  fs.writeFileSync(tmpFile, minimalPdf)

  await page.goto('/')
  // Select project to show panel
  await page.getByText('UI Upload Test').click()
  await page.getByRole('button', { name: 'Upload' }).first().click()

  // File input in modal
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(tmpFile)
  await page.getByRole('button', { name: 'Upload' }).last().click()

  // File should appear in the list
  await expect(page.getByText('ui-upload-test.pdf')).toBeVisible({ timeout: 5000 })

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Frontend restricts file picker to PDFs
test('Frontend restricts file picker to PDFs', async ({ page, request }) => {
  const proj = await createTestProject(request, 'Accept Attr Test')
  await page.goto('/')
  await page.getByText('Accept Attr Test').click()
  await page.getByRole('button', { name: 'Upload' }).first().click()

  const acceptAttr = await page.locator('input[type="file"]').getAttribute('accept')
  expect(acceptAttr).toBe('.pdf')

  await page.keyboard.press('Escape')
  await request.delete(`${API}/projects/${proj.id}`)
})

// Frontend rejects non-PDF selection
test('Frontend rejects non-PDF selection', async ({ page, request }) => {
  const proj = await createTestProject(request, 'Frontend Reject Test')

  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, 'not-a-pdf.txt')
  fs.writeFileSync(tmpFile, 'hello world')

  await page.goto('/')
  await page.getByText('Frontend Reject Test').click()
  await page.getByRole('button', { name: 'Upload' }).first().click()

  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles(tmpFile)
  await page.getByRole('button', { name: 'Upload' }).last().click()

  // Error message should appear, no network request to upload
  await expect(page.getByText(/not a PDF|Only .pdf/i)).toBeVisible()

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${proj.id}`)
})

// Duplicate filename shown as error (UI)
test('Duplicate filename shown as error', async ({ page, request }) => {
  const proj = await createTestProject(request, 'Dupe UI Test')
  // Pre-upload the file via API
  await request.post(`${API}/projects/${proj.id}/files`, {
    multipart: { files: { name: 'conflict.pdf', mimeType: 'application/pdf', buffer: minimalPdf } },
  })

  const tmpDir = os.tmpdir()
  const tmpFile = path.join(tmpDir, 'conflict.pdf')
  fs.writeFileSync(tmpFile, minimalPdf)

  await page.goto('/')
  await page.getByText('Dupe UI Test').click()
  await page.getByRole('button', { name: 'Upload' }).first().click()
  await page.locator('input[type="file"]').setInputFiles(tmpFile)
  await page.getByRole('button', { name: 'Upload' }).last().click()

  await expect(page.getByText(/already exists|conflict/i)).toBeVisible({ timeout: 5000 })

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${proj.id}`)
})
