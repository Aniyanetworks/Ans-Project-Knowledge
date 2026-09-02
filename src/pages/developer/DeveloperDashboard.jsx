import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function FolderIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0v6a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-6m-19.5 0-.5-3.5A2.25 2.25 0 0 1 4.25 6.75H8.5l2 2.25h7a2.25 2.25 0 0 1 2.25 2.25"
      />
    </svg>
  )
}

function ChatHintIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.75} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z"
      />
    </svg>
  )
}

/** Compact relative time (e.g. "3h ago", "2d ago"); falls back to a short date past ~4 weeks. */
function timeAgo(dateString) {
  const diffMs = Date.now() - new Date(dateString).getTime()
  const minutes = Math.round(diffMs / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 28) return `${days}d ago`
  return new Date(dateString).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function DeveloperDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [lastQuestions, setLastQuestions] = useState({}) // { [project_id]: { question, created_at } }
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [user])

  async function load() {
    setLoading(true)
    // RLS already scopes both queries to projects/history the developer has access to.
    const [{ data: projectRows, error }, { data: historyRows }] = await Promise.all([
      supabase.from('projects').select('*').eq('status', 'active').order('name'),
      supabase
        .from('qa_history')
        .select('project_id, question, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200),
    ])
    if (!error) setProjects(projectRows ?? [])

    // Rows are ordered newest-first, so the first occurrence per project is its latest.
    const latest = {}
    for (const row of historyRows ?? []) {
      if (!latest[row.project_id]) latest[row.project_id] = row
    }
    setLastQuestions(latest)
    setLoading(false)
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Your projects</h1>
      <p className="mb-6 text-sm text-slate-500">Projects you've been granted access to.</p>

      {loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          <Spinner label="Loading projects…" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={FolderIcon}
          title="No projects yet"
          description="You don't have access to any projects. Ask an admin to grant you access."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const last = lastQuestions[p.id]
            return (
              <Link
                key={p.id}
                to={`/projects/${p.id}`}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent-300 hover:shadow-md"
              >
                <p className="mb-1.5 font-medium text-slate-900 group-hover:text-accent-700">{p.name}</p>
                <p className="line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
                {last && (
                  <div className="mt-3 flex items-start gap-1.5 border-t border-slate-100 pt-3 text-xs text-slate-400">
                    <ChatHintIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span className="line-clamp-1 flex-1">{last.question}</span>
                    <span className="shrink-0">{timeAgo(last.created_at)}</span>
                  </div>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
