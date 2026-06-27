import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

function validPdf(): Buffer {
  const obj1 = '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n'
  const obj2 = '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n'
  const obj3 = '3 0 obj<</Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R /Resources<<>> /Contents 4 0 R>>endobj\n'
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
  for (const o of offsets) {
    xref += `${String(o).padStart(10, '0')} 00000 n \n`
  }
  const trailer = `trailer\n<</Size 5 /Root 1 0 R>>\nstartxref\n${xrefPos}\n%%EOF\n`
  return Buffer.from(header + body + xref + trailer)
}

// 7.9
test('Fetch extractions for a project', async ({ request }) => {
  // Create a project with a real extraction so we can verify array shape
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `Extractions Shape Test ${Date.now()}` },
  })
  const { id: projId } = await projRes.json()

  const uploadRes = await request.post(`${API}/projects/${projId}/files`, {
    multipart: { files: { name: 'shape-test.pdf', mimeType: 'application/pdf', buffer: validPdf() } },
  })
  const [file] = await uploadRes.json()

  const annRes = await request.post(`${API}/files/${file.id}/annotations`, {
    data: { page: 1, x0: 50, y0: 50, x1: 400, y1: 600 },
  })
  const ann = await annRes.json()

  await request.post(`${API}/annotations/${ann.id}/extract`, {
    data: { category: 'specification', label_code: 'SPC-01' },
  })

  const res = await request.get(`${API}/projects/${projId}/extractions`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThan(0)
  const e = body[0]
  expect(e).toHaveProperty('id')
  expect(e).toHaveProperty('annotation_id')
  expect(e).toHaveProperty('file_id')
  expect(e).toHaveProperty('category')
  expect(e).toHaveProperty('label_code')
  expect(e).toHaveProperty('status')
  expect(e).toHaveProperty('extracted_at')

  await request.delete(`${API}/projects/${projId}`)
})

// 7.10
test('Fetch extractions for project with none', async ({ request }) => {
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `Extractions Empty ${Date.now()}` },
  })
  const { id: projId } = await projRes.json()

  const res = await request.get(`${API}/projects/${projId}/extractions`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(body).toEqual([])

  await request.delete(`${API}/projects/${projId}`)
})

// 7.11
test('Stream SVG for existing extraction', async ({ request }) => {
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `SVG Stream Test ${Date.now()}` },
  })
  const { id: projId } = await projRes.json()

  const uploadRes = await request.post(`${API}/projects/${projId}/files`, {
    multipart: {
      files: { name: 'stream-test.pdf', mimeType: 'application/pdf', buffer: validPdf() },
    },
  })
  const [file] = await uploadRes.json()

  const annRes = await request.post(`${API}/files/${file.id}/annotations`, {
    data: { page: 1, x0: 50, y0: 50, x1: 400, y1: 600 },
  })
  const ann = await annRes.json()

  const extractRes = await request.post(`${API}/annotations/${ann.id}/extract`, {
    data: { category: 'floor-plan', label_code: 'L01' },
  })
  expect(extractRes.status()).toBe(201)
  const extraction = await extractRes.json()

  const svgRes = await request.get(`${API}/extractions/${extraction.id}`)
  expect(svgRes.status()).toBe(200)
  expect(svgRes.headers()['content-type']).toContain('image/svg+xml')

  await request.delete(`${API}/projects/${projId}`)
})

// new: spec scenario "Extraction endpoint for non-existent annotation"
test('Extract on non-existent annotation returns 404', async ({ request }) => {
  const res = await request.post(`${API}/annotations/999999/extract`, {
    data: { category: 'other', label_code: 'X' },
  })
  expect(res.status()).toBe(404)
})

// 7.12
test('Stream SVG for non-existent extraction', async ({ request }) => {
  const res = await request.get(`${API}/extractions/999999`)
  expect(res.status()).toBe(404)
})

// 7.13
test('Project delete removes extraction records and SVG files', async ({ request }) => {
  const projRes = await request.post(`${API}/projects`, {
    data: { name: `Delete Cascade Test ${Date.now()}` },
  })
  const { id: projId } = await projRes.json()

  const uploadRes = await request.post(`${API}/projects/${projId}/files`, {
    multipart: {
      files: { name: 'cascade.pdf', mimeType: 'application/pdf', buffer: validPdf() },
    },
  })
  const [file] = await uploadRes.json()

  const annRes = await request.post(`${API}/files/${file.id}/annotations`, {
    data: { page: 1, x0: 50, y0: 50, x1: 400, y1: 600 },
  })
  const ann = await annRes.json()

  const extractRes = await request.post(`${API}/annotations/${ann.id}/extract`, {
    data: { category: 'elevation', label_code: 'Main Elevation' },
  })
  expect(extractRes.status()).toBe(201)

  const delRes = await request.delete(`${API}/projects/${projId}`)
  expect(delRes.status()).toBe(200)

  const check = await request.get(`${API}/projects/${projId}/extractions`)
  expect(check.status()).toBe(404)
})
