import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

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

  async function deleteProject(project) {
    const confirmed = window.confirm(
      `Delete "${project.name}"? This permanently removes all its documents, chunks, and Q&A history. This cannot be undone.`
    )
    if (!confirmed) return
    setDeletingId(project.id)
    setError(null)
    const { error } = await supabase.from('projects').delete().eq('id', project.id)
    if (error) setError(error.message)
    setDeletingId(null)
    loadProjects()
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Projects</h1>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
        >
          {showForm ? 'Cancel' : '+ New project'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="mb-8 space-y-3 rounded-lg border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create project'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects yet.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) =>
            editingId === p.id ? (
              <div key={p.id} className="space-y-3 rounded-lg border border-purple-300 bg-white p-5">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(p.id)}
                    disabled={saving || !editName.trim()}
                    className="rounded-md bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div key={p.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mb-2 flex items-start justify-between">
                  <Link to={`/admin/projects/${p.id}`} className="font-medium text-slate-900 hover:text-purple-700">
                    {p.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
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
                    className="text-sm font-medium text-purple-700 hover:underline"
                  >
                    Open →
                  </Link>
                  <button onClick={() => startEdit(p)} className="text-xs text-slate-400 hover:text-slate-600">
                    Edit
                  </button>
                  <button
                    onClick={() => toggleArchive(p)}
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    {p.status === 'active' ? 'Archive' : 'Unarchive'}
                  </button>
                  <button
                    onClick={() => deleteProject(p)}
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
      )}
    </div>
  )
}
