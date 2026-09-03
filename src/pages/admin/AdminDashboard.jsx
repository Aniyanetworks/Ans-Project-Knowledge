import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import RestrictedTopicsTab from './RestrictedTopicsTab'
import ChangePasswordForm from '../../components/ChangePasswordForm'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const TABS = ['Projects', 'Restricted Topics', 'Change Password']

function FolderPlusIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-19.5 0v6a2.25 2.25 0 0 0 2.25 2.25h15a2.25 2.25 0 0 0 2.25-2.25v-6m-19.5 0-.5-3.5A2.25 2.25 0 0 1 4.25 6.75H8.5l2 2.25h7a2.25 2.25 0 0 1 2.25 2.25M12 10.5v4.5m-2.25-2.25h4.5"
      />
    </svg>
  )
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [confirmTarget, setConfirmTarget] = useState(null)
  const [tab, setTab] = useState('Projects')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    setLoading(true)
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setProjects(data ?? [])
    setLoading(false)
  }

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    const { error } = await supabase.from('projects').insert({
      name,
      description,
      created_by: user.id,
    })
    if (error) {
      setError(error.message)
    } else {
      setName('')
      setDescription('')
      setShowForm(false)
      await loadProjects()
    }
    setCreating(false)
  }

  async function toggleArchive(project) {
    const nextStatus = project.status === 'active' ? 'archived' : 'active'
    await supabase.from('projects').update({ status: nextStatus }).eq('id', project.id)
    loadProjects()
  }

  function startEdit(project) {
    setEditingId(project.id)
    setEditName(project.name)
    setEditDescription(project.description || '')
    setError(null)
  }

  function cancelEdit() {
    setEditingId(null)
  }

  async function saveEdit(projectId) {
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('projects')
      .update({ name: editName, description: editDescription })
      .eq('id', projectId)
    if (error) {
      setError(error.message)
    } else {
      setEditingId(null)
      await loadProjects()
    }
    setSaving(false)
  }

  async function confirmDelete() {
    const project = confirmTarget
    if (!project) return
    setDeletingId(project.id)
    setError(null)
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) setError(error.message)
    setDeletingId(null)
    setConfirmTarget(null)
    loadProjects()
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Admin</h1>
          <p className="mt-0.5 text-sm text-slate-500">Manage projects and configuration that applies across all of them.</p>
        </div>
        {tab === 'Projects' && (
          <Button variant={showForm ? 'secondary' : 'primary'} onClick={() => setShowForm((s) => !s)}>
            {showForm ? 'Cancel' : '+ New project'}
          </Button>
        )}
      </div>

      <div className="mb-6 flex gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              tab === t
                ? 'border-accent-600 text-accent-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Restricted Topics' && <RestrictedTopicsTab />}

      {tab === 'Change Password' && <ChangePasswordForm />}

      {tab === 'Projects' && showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-8 space-y-3 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create project'}
          </Button>
        </form>
      )}

      {tab === 'Projects' && (loading ? (
        <div className="py-16 text-center text-sm text-slate-400">
          <Spinner label="Loading projects…" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState icon={FolderPlusIcon} title="No projects yet" description="Create your first project to get started." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="space-y-3 rounded-xl border border-accent-300 bg-white p-5 shadow-sm">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className={inputClass}
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => saveEdit(p.id)} disabled={saving || !editName.trim()}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                  <Button size="sm" variant="secondary" onClick={cancelEdit}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div
                key={p.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <Link
                    to={`/admin/projects/${p.id}`}
                    className="font-medium text-slate-900 hover:text-accent-700"
                  >
                    {p.name}
                  </Link>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {p.status}
                  </span>
                </div>
                <p className="mb-4 line-clamp-2 text-sm text-slate-500">{p.description || 'No description'}</p>
                <div className="flex items-center gap-3">
                  <Link
                    to={`/admin/projects/${p.id}`}
                    className="text-sm font-medium text-accent-700 hover:underline"
                  >
                    Open →
                  </Link>
                  <button onClick={() => startEdit(p)} className="text-xs text-slate-400 hover:text-slate-600">
                    Edit
                  </button>
                  <button onClick={() => toggleArchive(p)} className="text-xs text-slate-400 hover:text-slate-600">
                    {p.status === 'active' ? 'Archive' : 'Unarchive'}
                  </button>
                  <button
                    onClick={() => setConfirmTarget(p)}
                    disabled={deletingId === p.id}
                    className="ml-auto text-xs text-red-400 hover:text-red-600 disabled:opacity-50"
                  >
                    {deletingId === p.id ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      ))}

      <ConfirmDialog
        open={!!confirmTarget}
        title="Delete project?"
        message={
          confirmTarget &&
          `Delete "${confirmTarget.name}"? This permanently removes all its documents, chunks, and Q&A history. This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        busy={deletingId === confirmTarget?.id}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  )
}
