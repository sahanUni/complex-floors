import Link from 'next/link'
import ProjectDetailsClient from './ProjectDetailsClient'

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

export default async function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const projectId = Number(id)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8010'

  const [projectRes, filesRes, extractionsRes] = await Promise.all([
    fetch(`${apiUrl}/projects/${projectId}`, { cache: 'no-store' }),
    fetch(`${apiUrl}/projects/${projectId}/files`, { cache: 'no-store' }),
    fetch(`${apiUrl}/projects/${projectId}/extractions`, { cache: 'no-store' }),
  ])

  if (!Number.isInteger(projectId) || projectRes.status === 404 || filesRes.status === 404 || extractionsRes.status === 404) {
    return (
      <main style={pageStyle}>
        <Link href="/" style={backLink}>Back to projects</Link>
        <h1>Project not found</h1>
        <p style={{ color: '#555' }}>No project exists for id {id}.</p>
      </main>
    )
  }

  const [project, files, extractions]: [Project, ProjectFile[], Extraction[]] = await Promise.all([
    projectRes.json(),
    filesRes.json(),
    extractionsRes.json(),
  ])

  return (
    <main style={pageStyle}>
      <Link href="/" style={backLink}>Back to projects</Link>
      <ProjectDetailsClient
        project={project}
        files={files}
        extractions={extractions}
        apiUrl={apiUrl}
      />
    </main>
  )
}

const pageStyle: React.CSSProperties = {
  fontFamily: 'sans-serif',
  padding: '2rem',
  maxWidth: 1000,
  margin: '0 auto',
}

const backLink: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '1rem',
  color: '#2563eb',
}
