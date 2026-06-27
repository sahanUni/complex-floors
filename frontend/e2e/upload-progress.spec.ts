import { test, expect, type APIRequestContext, type Page } from '@playwright/test'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'
const minimalPdf = Buffer.from('%PDF-1.4\n%%EOF\n')

async function createTestProject(request: APIRequestContext, name: string) {
  const res = await request.post(`${API}/projects`, { data: { name } })
  return await res.json()
}

function writeTempPdf(filename: string) {
  const tmpFile = path.join(os.tmpdir(), filename)
  fs.writeFileSync(tmpFile, minimalPdf)
  return tmpFile
}

async function installMockUploadXhr(page: Page, options: {
  status?: number
  body?: unknown
  progressEvents?: Array<{ loaded: number; total: number; delay: number }>
  completeDelay?: number
}) {
  await page.addInitScript((opts) => {
    const OriginalXHR = window.XMLHttpRequest

    class MockUploadXHR {
      upload = new EventTarget()
      method = ''
      url = ''
      status = 0
      responseText = ''
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      open(method: string, url: string) {
        this.method = method
        this.url = url
      }

      setRequestHeader() {}

      send() {
        const isUpload = this.method === 'POST' && /\/projects\/\d+\/files$/.test(this.url)
        if (!isUpload) {
          const xhr = new OriginalXHR()
          xhr.open(this.method, this.url)
          xhr.send()
          return
        }

        for (const event of opts.progressEvents ?? []) {
          window.setTimeout(() => {
            this.upload.dispatchEvent(new ProgressEvent('progress', {
              loaded: event.loaded,
              total: event.total,
              lengthComputable: event.total > 0,
            }))
          }, event.delay)
        }

        window.setTimeout(() => {
          this.status = opts.status ?? 201
          this.responseText = JSON.stringify(opts.body ?? [])
          this.onload?.(new Event('load'))
        }, opts.completeDelay ?? 200)
      }
    }

    window.XMLHttpRequest = MockUploadXHR as typeof XMLHttpRequest
  }, options)
}

async function openUploadModal(page: Page, projectName: string, tmpFile: string) {
  await page.goto('/')
  const projectItem = page.getByRole('listitem').filter({ hasText: projectName })
  await expect(projectItem).toBeVisible()
  await projectItem.getByRole('button', { name: 'Upload' }).click()
  await page.locator('input[type="file"]').setInputFiles(tmpFile)
  await page.getByRole('button', { name: 'Upload' }).last().click()
}

test('Progress bar appears on upload start', async ({ page, request }) => {
  const project = await createTestProject(request, `Progress Start ${Date.now()}`)
  const tmpFile = writeTempPdf('progress-start.pdf')
  await installMockUploadXhr(page, {
    body: [{ id: 9001, filename: 'progress-start.pdf', file_type: 'floor-plan', uploaded_at: '', status: 'pending' }],
    completeDelay: 500,
  })

  await openUploadModal(page, project.name, tmpFile)

  await expect(page.getByTestId('upload-progress')).toBeVisible()
  await expect(page.getByRole('button', { name: /Uploading/i })).toBeDisabled()

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${project.id}`)
})

test('Progress bar updates as bytes are transferred', async ({ page, request }) => {
  const project = await createTestProject(request, `Progress Update ${Date.now()}`)
  const tmpFile = writeTempPdf('progress-update.pdf')
  await installMockUploadXhr(page, {
    body: [{ id: 9002, filename: 'progress-update.pdf', file_type: 'floor-plan', uploaded_at: '', status: 'pending' }],
    progressEvents: [{ loaded: 50, total: 100, delay: 100 }],
    completeDelay: 600,
  })

  await openUploadModal(page, project.name, tmpFile)

  await expect(page.getByTestId('upload-progress-value')).toHaveText('50%')
  await expect(page.getByTestId('upload-progress')).toHaveJSProperty('value', 50)

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${project.id}`)
})

test('Progress bar reaches 100% on completion', async ({ page, request }) => {
  const project = await createTestProject(request, `Progress Complete ${Date.now()}`)
  const tmpFile = writeTempPdf('progress-complete.pdf')
  await installMockUploadXhr(page, {
    body: [{ id: 9003, filename: 'progress-complete.pdf', file_type: 'floor-plan', uploaded_at: '', status: 'pending' }],
    progressEvents: [{ loaded: 100, total: 100, delay: 50 }],
    completeDelay: 100,
  })

  await openUploadModal(page, project.name, tmpFile)

  await expect(page.getByTestId('upload-progress-value')).toHaveText('100%')
  await expect(page.getByText('Upload PDF Files')).toBeHidden({ timeout: 2000 })

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${project.id}`)
})

test('Progress bar hidden on error', async ({ page, request }) => {
  const project = await createTestProject(request, `Progress Error ${Date.now()}`)
  const tmpFile = writeTempPdf('progress-error.pdf')
  await installMockUploadXhr(page, {
    status: 500,
    body: { detail: 'boom' },
    progressEvents: [{ loaded: 30, total: 100, delay: 50 }],
    completeDelay: 100,
  })

  await openUploadModal(page, project.name, tmpFile)

  await expect(page.getByText('Upload failed. Please try again.')).toBeVisible()
  await expect(page.getByTestId('upload-progress')).toBeHidden()

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${project.id}`)
})

test('Indeterminate fallback when total size unavailable', async ({ page, request }) => {
  const project = await createTestProject(request, `Progress Indeterminate ${Date.now()}`)
  const tmpFile = writeTempPdf('progress-indeterminate.pdf')
  await installMockUploadXhr(page, {
    body: [{ id: 9004, filename: 'progress-indeterminate.pdf', file_type: 'floor-plan', uploaded_at: '', status: 'pending' }],
    progressEvents: [{ loaded: 30, total: 0, delay: 50 }],
    completeDelay: 500,
  })

  await openUploadModal(page, project.name, tmpFile)

  await expect(page.getByTestId('upload-progress')).toBeVisible()
  await expect(page.getByTestId('upload-progress')).not.toHaveAttribute('value')

  fs.unlinkSync(tmpFile)
  await request.delete(`${API}/projects/${project.id}`)
})
