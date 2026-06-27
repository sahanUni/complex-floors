'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'

const PdfViewer = dynamic(() => import('../../PdfViewer'), { ssr: false })

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

interface Extraction {
  id: number
  annotation_id: number
  file_id: number
  category: string
  label_code: string
  label_display: string | null
  note: string | null
  status: string
  extracted_at: string
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

const CATEGORY_LABELS: Record<string, string> = {
  'floor-plan': 'Floor Plan',
  elevation: 'Elevation View',
  'cross-section': 'Cross Section',
  specification: 'Specification',
  schedule: 'Schedule',
  other: 'Other',
}

interface Props {
  project: Project
  files: ProjectFile[]
  extractions: Extraction[]
  apiUrl: string
}

export default function ProjectDetailsClient({ project, files, extractions, apiUrl }: Props) {
  const [viewFileId, setViewFileId] = useState<number | null>(null)
  const extractionsByFile = files.map((file) => ({
    file,
    extractions: extractions.filter((extraction) => extraction.file_id === file.id),
  }))

  return (
    <>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0 }}>{project.name}</h1>
        {project.description && (
          <p style={{ color: '#555', margin: '0.5rem 0 0' }}>{project.description}</p>
        )}
      </header>

      <section style={{ marginBottom: '2rem' }}>
        <h2 style={sectionHeading}>Documents</h2>
        {files.length === 0 ? (
          <p style={emptyStyle}>No documents uploaded yet.</p>
        ) : (
          <div style={{ border: '1px solid #ddd', borderRadius: 6, overflow: 'hidden' }}>
            {files.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setViewFileId(file.id)}
                style={documentRow}
              >
                <span style={{ fontWeight: 600, color: '#2563eb', textDecoration: 'underline' }}>
                  {file.filename}
                </span>
                <span>{FILE_TYPE_LABELS[file.file_type] ?? file.file_type}</span>
                <span>{STATUS_LABELS[file.status] ?? file.status}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={sectionHeading}>Extracted Regions</h2>
        {extractions.length === 0 ? (
          <p style={emptyStyle}>No extractions exist yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {extractionsByFile.map(({ file, extractions: fileExtractions }) =>
              fileExtractions.length > 0 ? (
                <div key={file.id}>
                  <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem' }}>{file.filename}</h3>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))' }}>
                    {fileExtractions.map((extraction) => (
                      <article
                        key={extraction.id}
                        style={{ border: '1px solid #ddd', borderRadius: 6, padding: '0.75rem', background: '#fff' }}
                      >
                        <object
                          data={`${apiUrl}/extractions/${extraction.id}`}
                          type="image/svg+xml"
                          aria-label={`${extraction.label_code} extracted region`}
                          style={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#f8fafc', border: '1px solid #e5e7eb' }}
                        >
                          {extraction.label_code}
                        </object>
                        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', lineHeight: 1.5 }}>
                          <strong>{CATEGORY_LABELS[extraction.category] ?? extraction.category}</strong>
                          <div>{extraction.label_code}{extraction.label_display ? ` - ${extraction.label_display}` : ''}</div>
                          {extraction.note && <div style={{ color: '#555' }}>{extraction.note}</div>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </section>

      {viewFileId !== null && (
        <PdfViewer fileId={viewFileId} onClose={() => setViewFileId(null)} />
      )}
    </>
  )
}

const sectionHeading: React.CSSProperties = {
  margin: '0 0 0.75rem',
  fontSize: '1.1rem',
}

const emptyStyle: React.CSSProperties = {
  margin: 0,
  color: '#777',
}

const documentRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'minmax(180px, 1fr) 140px 120px',
  gap: '1rem',
  width: '100%',
  padding: '0.75rem 1rem',
  border: 0,
  borderBottom: '1px solid #eee',
  background: '#fff',
  cursor: 'pointer',
  textAlign: 'left',
  font: 'inherit',
}
