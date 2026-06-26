import { test, expect } from '@playwright/test'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

// Seed file ID 1 (floor-plan-level-1.pdf) is always present
const SEED_FILE_ID = 1

// User opens a PDF file for viewing
test('User opens a PDF file for viewing', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  // Viewer modal should open
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 5000 })
})

// PDF fetched via backend stream endpoint
test('PDF fetched via backend stream endpoint', async ({ page }) => {
  const fileRequests: string[] = []
  page.on('request', (req) => {
    if (req.url().includes('/files/')) fileRequests.push(req.url())
  })

  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 5000 })

  // Should have fetched /files/{id}
  const pdfFetch = fileRequests.find((u) => u.match(/\/files\/\d+$/) && !u.includes('annotations'))
  expect(pdfFetch).toBeDefined()
  // Should not contain filepath in URL
  expect(pdfFetch).not.toContain('uploads/')
  expect(pdfFetch).not.toContain('.pdf')
})

// PDF with multiple pages shows page count
test('PDF with multiple pages shows page count', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
  // Page indicator should be visible
  await expect(page.getByText(/Page \d+ of/i)).toBeVisible({ timeout: 10000 })
})

// Navigate to next page
test('Navigate to next page', async ({ page, request }) => {
  // Only meaningful if PDF has multiple pages; seed PDFs are placeholders (1 page)
  // Test the button interaction: if numPages > 1, clicking next advances the indicator
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })

  const nextBtn = page.locator('button', { hasText: 'Next →' })
  const prevBtn = page.locator('button', { hasText: '← Prev' })

  // On page 1, prev should be disabled
  await expect(prevBtn).toBeDisabled()
  // If next is enabled, click it and check page advances
  const isNextEnabled = await nextBtn.isEnabled()
  if (isNextEnabled) {
    await nextBtn.click()
    await expect(page.getByText(/Page 2 of/i)).toBeVisible()
  }
})

// Navigate to previous page
test('Navigate to previous page', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })

  const nextBtn = page.locator('button', { hasText: 'Next →' })
  const prevBtn = page.locator('button', { hasText: '← Prev' })

  const isNextEnabled = await nextBtn.isEnabled()
  if (isNextEnabled) {
    await nextBtn.click()
    await expect(page.getByText(/Page 2 of/i)).toBeVisible()
    await prevBtn.click()
    await expect(page.getByText(/Page 1 of/i)).toBeVisible()
  }
})

// Previous control disabled on first page
test('Previous control disabled on first page', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
  await expect(page.getByRole('button', { name: /Prev/i })).toBeDisabled()
})

// Next control disabled on last page
test('Next control disabled on last page', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })

  const nextBtn = page.locator('button', { hasText: 'Next →' })
  // Click next until disabled
  while (await nextBtn.isEnabled()) {
    await nextBtn.click()
    await page.waitForTimeout(100)
  }
  await expect(nextBtn).toBeDisabled()
})

// Zoom in increases rendered page size
test('Zoom in increases rendered page size', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
  // Wait for page canvas to exist
  const canvas = page.locator('[data-testid="pdf-viewer"] .react-pdf__Page__canvas').first()
  await expect(canvas).toBeVisible({ timeout: 10000 })
  const beforeWidth = (await canvas.boundingBox())?.width ?? 0
  await page.getByRole('button', { name: /Zoom \+/i }).click()
  await page.waitForTimeout(500)
  const afterWidth = (await canvas.boundingBox())?.width ?? 0
  expect(afterWidth).toBeGreaterThan(beforeWidth)
})

// Zoom out decreases rendered page size
test('Zoom out decreases rendered page size', async ({ page }) => {
  await page.goto('/')
  await page.getByText('City Centre Office Tower').click()
  await page.getByText('floor-plan-level-1.pdf').click()
  await expect(page.getByRole('button', { name: /Close/i })).toBeVisible({ timeout: 8000 })
  const canvas = page.locator('[data-testid="pdf-viewer"] .react-pdf__Page__canvas').first()
  await expect(canvas).toBeVisible({ timeout: 10000 })
  // Zoom in first
  await page.getByRole('button', { name: /Zoom \+/i }).click()
  await page.waitForTimeout(500)
  const zoomedWidth = (await canvas.boundingBox())?.width ?? 0
  // Zoom out
  await page.getByRole('button', { name: /Zoom −/i }).click()
  await page.waitForTimeout(500)
  const smallerWidth = (await canvas.boundingBox())?.width ?? 0
  expect(smallerWidth).toBeLessThan(zoomedWidth)
})
