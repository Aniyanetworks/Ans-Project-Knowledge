import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import ChatPanel from '../../components/ChatPanel'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/ui/Button'
import DocumentsTab from '../admin/DocumentsTab'
import DevelopersTab from '../admin/DevelopersTab'

// Owners (the developer who created the project) also manage its content and
// who else can see it; developers who were only granted access just chat.
const OWNER_TABS = ['Chat', 'Transcripts', 'Images', 'Developers']
const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

export default function ProjectChat() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [project, setProject] = useState(null)
  const [tab, setTab] = useState('Chat')

  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState(null)

  const isOwner = !!project && project.created_by === user?.id

  useEffect(() => {
    setTab('Chat')
    loadProject()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  function loadProject() {
    supabase.from('projects').select('*').eq('id', projectId).single().then(({ data }) => setProject(data))
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
      navigate('/')
    }
  }

  const showChat = !isOwner || tab === 'Chat'

  return (
    <div
      className={`mx-auto flex h-[calc(100vh-64px)] flex-col px-6 py-6 ${isOwner ? 'max-w-6xl' : 'max-w-4xl'}`}
    >
      <Link to="/" className="mb-2 inline-block text-sm text-slate-500 hover:text-slate-700">
        ← Your projects
      </Link>

      {isEditing ? (
        <div className="mb-4 space-y-3 rounded-xl border border-accent-300 bg-white p-5 shadow-sm">
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
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-slate-900">{project?.name ?? '…'}</h1>
            {isOwner && project.description && (
              <p className="mt-0.5 text-sm text-slate-500">{project.description}</p>
            )}
          </div>
          {isOwner && (
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

      {isOwner && (
        <div className="mb-4 flex gap-1 border-b border-slate-200">
          {OWNER_TABS.map((t) => (
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
      )}

      {showChat ? (
        <ChatPanel projectId={projectId} heightClassName="flex-1" />
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto pb-6">
          {tab === 'Transcripts' && <DocumentsTab projectId={projectId} kind="transcripts" />}
          {tab === 'Images' && <DocumentsTab projectId={projectId} kind="images" />}
          {tab === 'Developers' && <DevelopersTab projectId={projectId} canManageAccounts={false} />}
        </div>
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
