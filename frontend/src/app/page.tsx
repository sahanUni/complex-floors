import ProjectList from './ProjectList'

interface Project {
  id: number
  name: string
  description: string
  created_at: string
}

export default async function Home() {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/projects`)
  const projects: Project[] = await res.json()

  return (
    <main style={{ fontFamily: 'sans-serif', padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Floor Plan Projects</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        Select a project to view its drawing files.
      </p>
      <ProjectList projects={projects} />
    </main>
  )
}
