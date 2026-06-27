'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import UploadModal from './UploadModal'

interface Project {
  id: number
  name: string
  description: string
  created_at: string
}

export default function ProjectList({ initialProjects }: { initialProjects: Project[] }) {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>(initialProjects)
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [uploadFor, setUploadFor] = useState<number | null>(null)

  // Create project form state
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [creating, setCreating] = useState(false)

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
    }
    setConfirmDelete(null)
  }

  function handleUploaded() {
    setUploadFor(null)
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
              background: '#fff',
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
              onClick={() => router.push(`/projects/${p.id}`)}
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
          </li>
        ))}
      </ul>

      {uploadFor !== null && (
        <UploadModal
          projectId={uploadFor}
          onClose={() => setUploadFor(null)}
          onUploaded={handleUploaded}
        />
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
