'use client'

import { useState } from 'react'

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

export default function ProjectList({ projects }: { projects: Project[] }) {
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(false)

  async function selectProject(id: number) {
    if (selectedId === id) {
      setSelectedId(null)
      setFiles([])
      return
    }
    setSelectedId(id)
    setLoading(true)
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects/${id}/files`)
    const data: ProjectFile[] = await res.json()
    setFiles(data)
    setLoading(false)
  }

  return (
    <div>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {projects.map((p) => (
          <li
            key={p.id}
            style={{
              marginBottom: '1rem',
              border: '1px solid #ddd',
              borderRadius: '6px',
              padding: '1rem',
              cursor: 'pointer',
              background: selectedId === p.id ? '#f0f7ff' : '#fff',
            }}
            onClick={() => selectProject(p.id)}
          >
            <strong>{p.name}</strong>
            <p style={{ margin: '0.25rem 0 0', color: '#555', fontSize: '0.9rem' }}>
              {p.description}
            </p>

            {selectedId === p.id && (
              <div style={{ marginTop: '1rem' }}>
                {loading ? (
                  <p style={{ color: '#888' }}>Loading files…</p>
                ) : files.length === 0 ? (
                  <p style={{ color: '#888' }}>No files.</p>
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
                      {files.map((f) => (
                        <tr key={f.id} style={{ borderBottom: '1px solid #eee' }}>
                          <td style={{ padding: '0.4rem 0.6rem' }}>{f.filename}</td>
                          <td style={{ padding: '0.4rem 0.6rem' }}>
                            {FILE_TYPE_LABELS[f.file_type] ?? f.file_type}
                          </td>
                          <td style={{ padding: '0.4rem 0.6rem', textTransform: 'capitalize' }}>
                            {f.status}
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
    </div>
  )
}
