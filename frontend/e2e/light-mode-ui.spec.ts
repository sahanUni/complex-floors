import { test, expect } from '@playwright/test'

// Light theme on dark-OS system
test('Light theme on dark-OS system', async ({ browser }) => {
  const context = await browser.newContext({
    colorScheme: 'dark',
  })
  const page = await context.newPage()
  await page.goto('/')
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  )
  // Should be white/light, not dark
  expect(bg).not.toBe('rgb(10, 10, 10)')
  expect(bg).not.toBe('rgb(0, 0, 0)')
  await context.close()
})

// Light theme on light-OS system
test('Light theme on light-OS system', async ({ browser }) => {
  const context = await browser.newContext({
    colorScheme: 'light',
  })
  const page = await context.newPage()
  await page.goto('/')
  const bg = await page.evaluate(() =>
    getComputedStyle(document.body).backgroundColor
  )
  expect(bg).not.toBe('rgb(10, 10, 10)')
  expect(bg).not.toBe('rgb(0, 0, 0)')
  await context.close()
})

// No dark media query override
test('No dark media query override', async ({ page }) => {
  await page.goto('/')
  const hasDarkQuery = await page.evaluate(() => {
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(sheet.cssRules)) {
          if (
            rule instanceof CSSMediaRule &&
            rule.conditionText.includes('prefers-color-scheme: dark')
          ) {
            return true
          }
        }
      } catch {
        // cross-origin stylesheet
      }
    }
    return false
  })
  expect(hasDarkQuery).toBe(false)
})
