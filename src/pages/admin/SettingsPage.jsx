import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import ConfirmDialog from '../../components/ConfirmDialog'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

function ShieldIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
      />
    </svg>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [topics, setTopics] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showAdd, setShowAdd] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('restricted_topics')
      .select('*')
      .order('created_at', { ascending: true })
    if (error) setError(error.message)
    setTopics(data ?? [])
    setLoading(false)
  }

  async function handleAdd(e) {
    e.preventDefault()
    if (!newLabel.trim()) return
    setAdding(true)
    setError(null)
    const { error } = await supabase.from('restricted_topics').insert({
      label: newLabel.trim(),
      description: newDescription.trim() || null,
      created_by: user.id,
    })
    if (error) {
      setError(error.message)
    } else {
      setNewLabel('')
      setNewDescription('')
      setShowAdd(false)
      load()
    }
    setAdding(false)
  }

  async function toggleActive(topic) {
    await supabase.from('restricted_topics').update({ is_active: !topic.is_active }).eq('id', topic.id)
    load()
  }

  function startEdit(topic) {
    setEditingId(topic.id)
    setEditLabel(topic.label)
    setEditDescription(topic.description || '')
  }

  async function saveEdit(id) {
    setSaving(true)
    const { error } = await supabase
      .from('restricted_topics')
      .update({ label: editLabel.trim(), description: editDescription.trim() || null })
      .eq('id', id)
    if (error) {
      setError(error.message)
    } else {
      setEditingId(null)
      load()
    }
    setSaving(false)
  }

  async function confirmDelete() {
    setDeleting(true)
    const { error } = await supabase.from('restricted_topics').delete().eq('id', deleteTarget.id)
    if (error) setError(error.message)
    setDeleting(false)
    setDeleteTarget(null)
    load()
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <Link to="/admin" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700">
        ← All projects
      </Link>
      <h1 className="mb-1 text-2xl font-semibold tracking-tight text-slate-900">Settings</h1>
      <p className="mb-6 text-sm text-slate-500">Configuration that applies across every project.</p>

      <section>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <ShieldIcon className="h-4 w-4 text-accent-600" />
              Restricted topics
            </h2>
            <p className="mt-1 max-w-lg text-xs text-slate-500">
              Topics the AI assistant should decline to discuss, even if relevant context exists —
              e.g. budget figures, personal conversations, client PII. Injected into every answer's
              system prompt automatically. Disable a topic to keep it without enforcing it.
            </p>
          </div>
          <Button variant={showAdd ? 'secondary' : 'primary'} size="sm" onClick={() => setShowAdd((s) => !s)}>
            {showAdd ? 'Cancel' : '+ Add topic'}
          </Button>
        </div>

        {showAdd && (
          <form
            onSubmit={handleAdd}
            className="mb-4 space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <input
              required
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Short label, e.g. 'Vendor contract terms'"
              className={inputClass}
            />
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              placeholder="Optional: more detail for your own reference (not shown to the AI)"
              className={inputClass}
            />
            <Button type="submit" size="sm" disabled={adding || !newLabel.trim()}>
              {adding ? 'Adding…' : 'Add topic'}
            </Button>
          </form>
        )}

        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}

        {loading ? (
          <div className="py-10 text-center text-sm text-slate-400">
            <Spinner label="Loading…" />
          </div>
        ) : topics.length === 0 ? (
          <EmptyState
            icon={ShieldIcon}
            title="No restricted topics"
            description="Add one above — the assistant won't have any topic restrictions until you do."
          />
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {topics.map((topic) =>
              editingId === topic.id ? (
                <li key={topic.id} className="space-y-2 p-4">
                  <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} className={inputClass} />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    className={inputClass}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => saveEdit(topic.id)} disabled={saving || !editLabel.trim()}>
                      {saving ? 'Saving…' : 'Save'}
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>
                      Cancel
                    </Button>
                  </div>
                </li>
              ) : (
                <li key={topic.id} className="flex items-start justify-between gap-3 p-4">
                  <div className={`min-w-0 flex-1 ${!topic.is_active ? 'opacity-50' : ''}`}>
                    <p className="text-sm font-medium text-slate-800">{topic.label}</p>
                    {topic.description && (
                      <p className="mt-0.5 text-xs text-slate-500">{topic.description}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => toggleActive(topic)}
                      className={`text-xs font-medium ${
                        topic.is_active ? 'text-slate-400 hover:text-slate-600' : 'text-accent-600 hover:text-accent-700'
                      }`}
                    >
                      {topic.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => startEdit(topic)} className="text-xs text-slate-400 hover:text-slate-600">
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget(topic)}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete restricted topic?"
        message={deleteTarget && `Remove "${deleteTarget.label}" from the restricted topics list?`}
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
