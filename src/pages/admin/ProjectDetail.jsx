import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import DocumentsTab from './DocumentsTab'
import DevelopersTab from './DevelopersTab'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/ui/Button'
import ChatPanel from '../../components/ChatPanel'

const TABS = ['Transcripts', 'Images', 'Developers', 'Test']
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

export default function ProjectDetail() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('Transcripts')

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  useEffect(() => {
    loadProject()
  }, [projectId])

  function loadProject() {
    supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
      .then(({ data }) => setProject(data))
  }

  function startEdit() {
    setEditName(project.name)
    setEditDescription(project.description || '')
    setError(null)
    setIsEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('projects')
      .update({ name: editName, description: editDescription })
      .eq('id', projectId)
    if (error) {
      setError(error.message)
    } else {
      setIsEditing(false)
      loadProject()
    }
    setSaving(false)
  }

  async function confirmDelete() {
    setDeleting(true)
    const { error } = await supabase.from('projects').delete().eq('id', projectId)
    if (error) {
      setError(error.message)
      setDeleting(false)
      setConfirmingDelete(false)
    } else {
      navigate('/admin')
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/admin" className="mb-4 inline-block text-sm text-slate-500 hover:text-slate-700">
        ← All projects
      </Link>

      {isEditing ? (
        <div className="mb-6 space-y-3 rounded-xl border border-accent-300 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              className={inputClass}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} disabled={saving || !editName.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="mb-1 text-2xl font-semibold text-slate-900">{project?.name ?? '…'}</h1>
            <p className="text-sm text-slate-500">{project?.description}</p>
          </div>
          {project && (
            <div className="flex shrink-0 gap-3 pt-1">
              <button onClick={startEdit} className="text-sm text-slate-400 hover:text-slate-600">
                Edit
              </button>
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting}
                className="text-sm text-red-400 hover:text-red-600 disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      )}

      {!isEditing && error && <p className="mb-4 text-sm text-red-600">{error}</p>}

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

      {tab === 'Transcripts' && <DocumentsTab projectId={projectId} kind="transcripts" />}
      {tab === 'Images' && <DocumentsTab projectId={projectId} kind="images" />}
      {tab === 'Developers' && <DevelopersTab projectId={projectId} />}
      {tab === 'Test' && (
        <>
          <p className="mb-4 text-xs text-slate-400">
            Ask questions here to test retrieval and answer quality — this doesn't affect what
            developers see; it's your own Q&A history for this project.
          </p>
          <ChatPanel projectId={projectId} heightClassName="h-[600px]" />
        </>
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete project?"
        message={
          project &&
          `Delete "${project.name}"? This permanently removes all its documents, chunks, and Q&A history. This cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  )
}
