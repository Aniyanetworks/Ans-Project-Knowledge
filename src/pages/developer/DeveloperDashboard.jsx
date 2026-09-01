import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function DeveloperDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    setLoading(true)
    // RLS already scopes this to projects the developer has access to.
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', 'active')
      .order('name')
    if (!error) setProjects(data ?? [])
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Your projects</h1>

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-500">
          You don't have access to any projects yet. Ask an admin to grant you access.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/projects/${p.id}`}
              className="rounded-lg border border-slate-200 bg-white p-5 hover:border-purple-300 hover:shadow-sm"
            >
              <p className="mb-2 font-medium text-slate-900">{p.name}</p>
              <p className="line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
