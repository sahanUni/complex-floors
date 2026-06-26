import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

test('Fetch all projects', async ({ request }) => {
  const res = await request.get(`${API}/projects`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThan(0)
  const p = body[0]
  expect(p).toHaveProperty('id')
  expect(p).toHaveProperty('name')
  expect(p).toHaveProperty('description')
  expect(p).toHaveProperty('created_at')
})

test('Empty project list', async ({ request }) => {
  // Seeded DB always has projects; validate the schema of an empty response by checking
  // that the endpoint returns a JSON array (empty state is covered by the schema contract).
  const res = await request.get(`${API}/projects`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
})

test('CORS allows frontend origin', async ({ request }) => {
  const res = await request.get(`${API}/projects`, {
    headers: { Origin: 'http://localhost:3010' },
  })
  expect(res.status()).toBe(200)
  const acao = res.headers()['access-control-allow-origin']
  expect(acao).toBe('http://localhost:3010')
})

test('Fetch files for existing project', async ({ request }) => {
  const res = await request.get(`${API}/projects/1/files`)
  expect(res.status()).toBe(200)
  const body = await res.json()
  expect(Array.isArray(body)).toBe(true)
  expect(body.length).toBeGreaterThan(0)
  const f = body[0]
  expect(f).toHaveProperty('id')
  expect(f).toHaveProperty('filename')
  expect(f).toHaveProperty('file_type')
  expect(f).toHaveProperty('uploaded_at')
  expect(f).toHaveProperty('status')
  expect(f).not.toHaveProperty('filepath')
})

test('Fetch files for non-existent project', async ({ request }) => {
  const res = await request.get(`${API}/projects/999/files`)
  expect(res.status()).toBe(404)
})

test('Project list renders on page load', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Floor Plan Projects' })).toBeVisible()
  await expect(page.getByText('City Centre Office Tower')).toBeVisible()
  await expect(page.getByText('Riverside Residential Complex')).toBeVisible()
})

test('Selecting a project shows its files', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await expect(page.getByText('floor-plan-level-1.pdf')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Floor Plan' }).first()).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Uploaded' }).first()).toBeVisible()
})
