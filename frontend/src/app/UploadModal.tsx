'use client'

import { useRef, useState } from 'react'

interface ProjectFile {
  id: number
  filename: string
  file_type: string
  uploaded_at: string
  status: string
}

interface Props {
  projectId: number
  onClose: () => void
  onUploaded: (files: ProjectFile[]) => void
}

export default function UploadModal({ projectId, onClose, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  function validate(files: FileList): string | null {
    for (const f of Array.from(files)) {
      if (!f.name.toLowerCase().endsWith('.pdf') || f.type !== 'application/pdf') {
        return `"${f.name}" is not a PDF. Only .pdf files accepted.`
      }
    }
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const files = inputRef.current?.files
    if (!files || files.length === 0) {
      setError('Select at least one PDF file.')
      return
    }
    const validationError = validate(files)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setUploading(true)
    const form = new FormData()
    for (const f of Array.from(files)) form.append('files', f)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/projects/${projectId}/files`,
        { method: 'POST', body: form }
      )
      if (res.status === 409) {
        const data = await res.json()
        setError(data.detail || 'A file with that name already exists. Delete it first.')
        return
      }
      if (res.status === 400) {
        setError('Only PDF files are accepted.')
        return
      }
      if (!res.ok) {
        setError('Upload failed. Please try again.')
        return
      }
      const uploaded: ProjectFile[] = await res.json()
      onUploaded(uploaded)
      onClose()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 999,
    }}>
      <div style={{
        background: '#fff', borderRadius: 8, padding: '1.5rem',
        minWidth: 340, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
      }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1rem' }}>Upload PDF Files</h3>
        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf"
            multiple
            style={{ display: 'block', marginBottom: '0.75rem' }}
            onChange={() => setError(null)}
          />
          {error && (
            <p style={{ color: '#c00', fontSize: '0.85rem', margin: '0 0 0.75rem' }}>{error}</p>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={secondaryBtn} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" style={primaryBtn} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const primaryBtn: React.CSSProperties = {
  padding: '0.4rem 1rem', background: '#1a1a1a', color: '#fff',
  border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem',
}
const secondaryBtn: React.CSSProperties = {
  padding: '0.4rem 1rem', background: '#f5f5f5', color: '#333',
  border: '1px solid #ddd', borderRadius: 4, cursor: 'pointer', fontSize: '0.875rem',
}
