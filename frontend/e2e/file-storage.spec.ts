import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

test('Stream existing PDF file', async ({ request }) => {
  const res = await request.get(`${API}/files/1`)
  expect(res.status()).toBe(200)
  const contentType = res.headers()['content-type']
  expect(contentType).toContain('application/pdf')
})

test('Request for non-existent file record', async ({ request }) => {
  const res = await request.get(`${API}/files/999`)
  expect(res.status()).toBe(404)
})

test('File record exists but file missing from disk', async ({ request }) => {
  // Get a real file record first
  const filesRes = await request.get(`${API}/projects/2/files`)
  expect(filesRes.status()).toBe(200)
  const files = await filesRes.json()
  expect(files.length).toBeGreaterThan(0)

  const fileId = files[0].id
  const filename = files[0].filename

  // Temporarily rename the file on disk to simulate missing
  const uploadRoot = path.join(__dirname, '..', '..', 'backend', 'uploads', '2')
  const filePath = path.join(uploadRoot, filename)
  const tempPath = filePath + '.bak'

  let renamed = false
  try {
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, tempPath)
      renamed = true
    }

    const res = await request.get(`${API}/files/${fileId}`)
    expect(res.status()).toBe(404)
  } finally {
    if (renamed && fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, filePath)
    }
  }
})
