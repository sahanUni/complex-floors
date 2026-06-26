'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import UploadModal from './UploadModal'

const PdfViewer = dynamic(() => import('./PdfViewer'), { ssr: false })

interface Project {
  id: number
  name: string
  description: string
  created_at: string
}

interface ProjectFile {
  id: number
  filename: string
  file_type: string
  uploaded_at: string
  status: string
}

const FILE_TYPE_LABELS: Record<string, string> = {
  'floor-plan': 'Floor Plan',
  elevation: 'Elevation',
  section: 'Section',
  spec: 'Specification',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Uploaded',
}

export default function ProjectList({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [files, setFiles] = useState<Record<number, ProjectFile[]>>({})
  const [loading, setLoading] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [uploadFor, setUploadFor] = useState<number | null>(null)
  const [viewFileId, setViewFileId] = useState<number | null>(null)

  // Create project form state
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

  async function selectProject(id: number) {
    if (selectedId === id) {
      setSelectedId(null)
      return
    }
    setSelectedId(id)
    if (files[id]) return
    setLoading(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/files`)
    const data: ProjectFile[] = await res.json()
    setFiles((prev) => (prev[id] ? prev : { ...prev, [id]: data }))
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!createName.trim()) return
    setCreating(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: createName.trim(), description: createDesc.trim() }),
      })
      if (res.ok) {
        const project: Project = await res.json()
        setProjects((prev) => [...prev, project])
        setCreateName('')
        setCreateDesc('')
      }
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id: number) {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== id))
      setFiles((prev) => { const n = { ...prev }; delete n[id]; return n })
      if (selectedId === id) setSelectedId(null)
    }
    setConfirmDelete(null)
  }

  function handleUploaded(projectId: number, uploaded: ProjectFile[]) {
    setFiles((prev) => ({
      ...prev,
      [projectId]: [...(prev[projectId] ?? []), ...uploaded],
    }))
  }

  return (
    <div>
      {/* Create Project Form */}
      <form
        onSubmit={handleCreate}
        style={{
          marginBottom: '1.5rem',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          padding: '1rem',
          background: '#f9fafb',
        }}
      >
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 600 }}>New Project</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Project name *"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Description"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            style={{ ...inputStyle, flex: 2 }}
          />
          <button
            type="submit"
            disabled={!createName.trim() || creating}
            style={{
              padding: '0.4rem 1rem',
              background: createName.trim() ? '#1a1a1a' : '#ccc',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: createName.trim() ? 'pointer' : 'default',
              fontSize: '0.875rem',
            }}
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>

      {/* Project List */}
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projects.map((p) => (
          <li
            key={p.id}
            style={{
              marginBottom: '1rem',
              border: '1px solid #ddd',
              borderRadius: 6,
              background: selectedId === p.id ? '#f0f7ff' : '#fff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '1rem',
                cursor: 'pointer',
              }}
              onClick={() => selectProject(p.id)}
            >
              <div style={{ flex: 1 }}>
                <strong>{p.name}</strong>
                <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9rem' }}>
                  {p.description}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setUploadFor(p.id)
                  if (selectedId !== p.id) selectProject(p.id)
                }}
                style={actionBtn}
              >
                Upload
              </button>
              {confirmDelete === p.id ? (
                <>
                  <span style={{ fontSize: '0.8rem', color: '#c00' }}>Delete?</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...actionBtn, color: '#c00', borderColor: '#c00' }}>Yes</button>
                  <button onClick={(e) => { e.stopPropagation(); setConfirmDelete(null) }} style={actionBtn}>No</button>
                </>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelete(p.id) }}
                  style={{ ...actionBtn, color: '#c00', borderColor: '#fca5a5' }}
                >
                  Delete
                </button>
              )}
            </div>

            {selectedId === p.id && (
              <div style={{ padding: '0 1rem 1rem' }}>
                {loading ? (
                  <p style={{ color: '#888' }}>Loading files…</p>
                ) : !files[p.id] || files[p.id].length === 0 ? (
                  <p style={{ color: '#888' }}>No files. Upload PDFs above.</p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'left', borderBottom: '1px solid #ccc' }}>
                        <th style={{ padding: '0.4rem 0.6rem' }}>File</th>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Type</th>
                        <th style={{ padding: '0.4rem 0.6rem' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(files[p.id] ?? []).map((f) => (
                        <tr
                          key={f.id}
                          style={{ borderBottom: '1px solid #eee', cursor: 'pointer' }}
                          onClick={() => setViewFileId(f.id)}
                          title="Click to view PDF"
                        >
                          <td style={{ padding: '0.4rem 0.6rem', color: '#2563eb', textDecoration: 'underline' }}>
                            {f.filename}
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            {FILE_TYPE_LABELS[f.file_type] ?? f.file_type}
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            {STATUS_LABELS[f.status] ?? f.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {uploadFor !== null && (
        <UploadModal
          projectId={uploadFor}
          onClose={() => setUploadFor(null)}
          onUploaded={(uploaded) => handleUploaded(uploadFor, uploaded)}
        />
      )}

      {viewFileId !== null && (
        <PdfViewer fileId={viewFileId} onClose={() => setViewFileId(null)} />
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  flex: 1,
  padding: '0.4rem 0.6rem',
  border: '1px solid #d1d5db',
  borderRadius: 4,
  fontSize: '0.875rem',
  minWidth: 120,
}

const actionBtn: React.CSSProperties = {
  padding: '0.25rem 0.6rem',
  fontSize: '0.8rem',
  border: '1px solid #ccc',
  borderRadius: 4,
  background: '#fff',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
}
