import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  )
}

export default function DevelopersTab({ projectId }) {
  const { user } = useAuth()
  const [developers, setDevelopers] = useState([])
  const [accessUserIds, setAccessUserIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    setLoading(true)
    const [{ data: devs, error: devErr }, { data: access, error: accessErr }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('role', 'developer').order('email'),
      supabase.from('project_access').select('user_id').eq('project_id', projectId),
    ])
    if (devErr) setError(devErr.message)
    if (accessErr) setError(accessErr.message)
    setDevelopers(devs ?? [])
    setAccessUserIds(new Set((access ?? []).map((a) => a.user_id)))
    setLoading(false)
  }

  async function toggleAccess(devId, hasAccess) {
    if (hasAccess) {
      await supabase.from('project_access').delete().eq('project_id', projectId).eq('user_id', devId)
    } else {
      await supabase
        .from('project_access')
        .insert({ project_id: projectId, user_id: devId, granted_by: user.id })
    }
    load()
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        <Spinner label="Loading…" />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      {developers.length === 0 ? (
        <EmptyState
          icon={UsersIcon}
          title="No developer accounts yet"
          description='Developers appear here once they sign up (default role is "developer").'
        />
      ) : (
        <ul className="divide-y divide-slate-100">
          {developers.map((dev) => {
            const hasAccess = accessUserIds.has(dev.id)
            return (
              <li key={dev.id} className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                    {(dev.full_name || dev.email).charAt(0).toUpperCase()}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-slate-800">{dev.full_name || dev.email}</p>
                    <p className="text-xs text-slate-500">{dev.email}</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant={hasAccess ? 'secondary' : 'primary'}
                  onClick={() => toggleAccess(dev.id, hasAccess)}
                >
                  {hasAccess ? 'Revoke access' : 'Grant access'}
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
