import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import ChatPanel from '../../components/ChatPanel'

export default function ProjectChat() {
  const { projectId } = useParams()
  const [project, setProject] = useState(null)

  useEffect(() => {
    supabase.from('projects').select('*').eq('id', projectId).single().then(({ data }) => setProject(data))
  }, [projectId])

  return (
    <div className="mx-auto flex h-[calc(100vh-64px)] max-w-4xl flex-col px-6 py-6">
      <Link to="/" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-700">
        ← Your projects
      </Link>
      <h1 className="mb-4 text-xl font-semibold text-slate-900">{project?.name ?? '…'}</h1>
      <ChatPanel projectId={projectId} heightClassName="flex-1" />
    </div>
  )
}
