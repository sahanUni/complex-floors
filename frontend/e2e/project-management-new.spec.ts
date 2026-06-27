import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

// Create project with valid data
test('Create project with valid data', async ({ request }) => {
  const res = await request.post(`${API}/projects`, {
    data: { name: 'Test Project Valid', description: 'desc' },
  })
  expect(res.status()).toBe(201)
  const body = await res.json()
  expect(body).toHaveProperty('id')
  expect(body.name).toBe('Test Project Valid')
  // cleanup
  await request.delete(`${API}/projects/${body.id}`)
})

// Create project with missing name
test('Create project with missing name', async ({ request }) => {
  const res = await request.post(`${API}/projects`, {
    data: { description: 'no name' },
  })
  expect(res.status()).toBe(422)
})

// CORS allows POST from frontend origin
test('CORS allows POST from frontend origin', async ({ request }) => {
  const res = await request.post(`${API}/projects`, {
    headers: { Origin: 'http://localhost:3010' },
    data: { name: 'CORS Test POST' },
  })
  const acao = res.headers()['access-control-allow-origin']
  expect(acao).toBe('http://localhost:3010')
  if (res.status() === 201) {
    const body = await res.json()
    await request.delete(`${API}/projects/${body.id}`)
  }
})

// Delete existing project cascades all data
test('Delete existing project cascades all data', async ({ request }) => {
  // Create project
  const projRes = await request.post(`${API}/projects`, {
    data: { name: 'Cascade Delete Test' },
  })
  expect(projRes.status()).toBe(201)
  const proj = await projRes.json()
  const projectId = proj.id

  // Upload a minimal PDF
  const pdfBytes = Buffer.from('%PDF-1.4\n%%EOF\n')
  const uploadRes = await request.post(`${API}/projects/${projectId}/files`, {
    multipart: {
      files: {
        name: 'cascade-test.pdf',
        mimeType: 'application/pdf',
        buffer: pdfBytes,
      },
    },
  })
  expect(uploadRes.status()).toBe(201)
  const uploadedFiles = await uploadRes.json()
  const fileId = uploadedFiles[0].id

  // Create annotation
  const annRes = await request.post(`${API}/files/${fileId}/annotations`, {
    data: { page: 1, x0: 10, y0: 10, x1: 100, y1: 100 },
  })
  expect(annRes.status()).toBe(201)

  // Delete project
  const delRes = await request.delete(`${API}/projects/${projectId}`)
  expect(delRes.status()).toBe(200)

  // Verify cascade: project gone
  const projCheck = await request.get(`${API}/projects/${projectId}/files`)
  expect(projCheck.status()).toBe(404)

  // Verify file gone (will 404)
  const fileCheck = await request.get(`${API}/files/${fileId}`)
  expect(fileCheck.status()).toBe(404)

  // Verify annotations gone
  const annCheck = await request.get(`${API}/files/${fileId}/annotations`)
  expect(annCheck.status()).toBe(404)
})

// Delete non-existent project
test('Delete non-existent project', async ({ request }) => {
  const res = await request.delete(`${API}/projects/99999`)
  expect(res.status()).toBe(404)
})

// CORS allows DELETE from frontend origin
test('CORS allows DELETE from frontend origin', async ({ request }) => {
  // Create a project to delete
  const proj = await request.post(`${API}/projects`, { data: { name: 'CORS DELETE Test' } })
  const { id } = await proj.json()
  const res = await request.delete(`${API}/projects/${id}`, {
    headers: { Origin: 'http://localhost:3010' },
  })
  const acao = res.headers()['access-control-allow-origin']
  expect(acao).toBe('http://localhost:3010')
})

// User creates a project (UI)
test('User creates a project', async ({ page }) => {
  await page.goto('/')
  await page.getByPlaceholder('Project name *').fill('UI Created Project')
  await page.getByPlaceholder('Description').fill('Created via UI test')
  await page.getByRole('button', { name: 'Create' }).click()
  await expect(page.getByText('UI Created Project')).toBeVisible()
  // cleanup via API
  const projectsRes = await page.request.get(`${API}/projects`)
  const projects: Array<{ id: number; name: string }> = await projectsRes.json()
  const p = projects.find((pr) => pr.name === 'UI Created Project')
  if (p) await page.request.delete(`${API}/projects/${p.id}`)
})

// Create form requires name (UI)
test('Create form requires name', async ({ page }) => {
  await page.goto('/')
  const createBtn = page.getByRole('button', { name: 'Create' })
  await expect(createBtn).toBeDisabled()
  await page.getByPlaceholder('Project name *').fill('x')
  await expect(createBtn).toBeEnabled()
  await page.getByPlaceholder('Project name *').clear()
  await expect(createBtn).toBeDisabled()
})

// User deletes a project (UI)
test('User deletes a project', async ({ page, request }) => {
  // Create a project via API
  const projectName = `UI Delete Test ${Date.now()}`
  const res = await request.post(`${API}/projects`, { data: { name: projectName } })
  await res.json()

  await page.goto('/')
  await expect(page.getByText(projectName).first()).toBeVisible()
  // Click delete on the project row
  const row = page.locator('li').filter({ hasText: projectName })
  await row.getByRole('button', { name: 'Delete' }).click()
  // Confirm
  await row.getByRole('button', { name: 'Yes' }).click()
  await expect(page.getByText(projectName)).not.toBeVisible()
})

// Project list renders on page load (modified)
test('Project list renders on page load', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Floor Plan Projects' })).toBeVisible()
  await expect(page.getByText('Riverside Residential Complex')).toBeVisible()
  // Create control visible
  await expect(page.getByPlaceholder('Project name *')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create' })).toBeVisible()
  // Delete control per project
  const deleteButtons = page.getByRole('button', { name: 'Delete' })
  await expect(deleteButtons.first()).toBeVisible()
})

// Selecting a project navigates to its details page (updated)
test('Selecting a project shows its files', async ({ page }) => {
  await page.goto('/')
  await page.getByText('Riverside Residential Complex').first().click()
  await expect(page).toHaveURL(/\/projects\/\d+/)
  await expect(page.getByRole('button', { name: /ground-floor-plan\.pdf/ })).toBeVisible()
  await expect(page.getByText('Floor Plan').first()).toBeVisible()
  await expect(page.getByText('Uploaded').first()).toBeVisible()
})
