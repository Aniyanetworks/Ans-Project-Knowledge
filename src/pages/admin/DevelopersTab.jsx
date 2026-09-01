import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

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

  if (loading) return <p className="text-sm text-slate-500">Loading…</p>

  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      {error && <p className="p-4 text-sm text-red-600">{error}</p>}
      {developers.length === 0 ? (
        <p className="p-4 text-sm text-slate-500">
          No developer accounts yet. Developers appear here once they sign up (default role is "developer").
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {developers.map((dev) => {
            const hasAccess = accessUserIds.has(dev.id)
            return (
              <li key={dev.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{dev.full_name || dev.email}</p>
                  <p className="text-xs text-slate-500">{dev.email}</p>
                </div>
                <button
                  onClick={() => toggleAccess(dev.id, hasAccess)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                    hasAccess
                      ? 'border border-slate-300 text-slate-600 hover:bg-slate-50'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {hasAccess ? 'Revoke access' : 'Grant access'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
