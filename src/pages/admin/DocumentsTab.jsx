import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getSignedUrl, updateManualText, deleteDocument } from '../../lib/api'
import UploadWidget from '../../components/UploadWidget'
import StatusBadge from '../../components/StatusBadge'
import ConfirmDialog from '../../components/ConfirmDialog'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

function DocumentIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
      />
    </svg>
  )
}

function RefreshIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  )
}

/**
 * kind: 'transcripts' shows fathom/fireflies/tldv/manual documents
 *       'images' shows image documents (with thumbnail preview)
 */
export default function DocumentsTab({ projectId, kind }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [thumbnails, setThumbnails] = useState({})

  const [viewingDoc, setViewingDoc] = useState(null)
  const [viewingUrl, setViewingUrl] = useState(null)

  const [editingDoc, setEditingDoc] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [editText, setEditText] = useState('')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState(null)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    load()
    const channel = supabase
      .channel(`documents-${projectId}-${kind}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'documents', filter: `project_id=eq.${projectId}` },
        () => load()
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, kind])

  async function load({ silent = false } = {}) {
    if (!silent) setLoading(true)
    let query = supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    query = kind === 'images' ? query.eq('source_type', 'image') : query.neq('source_type', 'image')

    const { data, error } = await query
    if (!error) setDocuments(data ?? [])
    if (!silent) setLoading(false)

    if (kind === 'images') {
      const entries = await Promise.all(
        (data ?? [])
          .filter((d) => d.storage_path)
          .map(async (d) => [d.id, await getSignedUrl(d.storage_path).catch(() => null)])
      )
      setThumbnails(Object.fromEntries(entries))
    }
  }

  async function handleRefresh() {
    setRefreshing(true)
    await load({ silent: true })
    setRefreshing(false)
  }

  async function handleView(doc) {
    if (doc.raw_text) {
      setViewingDoc(doc)
      setViewingUrl(null)
      return
    }
    if (doc.storage_path) {
      if (doc.source_type === 'image') {
        setViewingDoc(doc)
        setViewingUrl(thumbnails[doc.id] || (await getSignedUrl(doc.storage_path).catch(() => null)))
      } else {
        const url = await getSignedUrl(doc.storage_path).catch(() => null)
        if (url) window.open(url, '_blank', 'noopener')
      }
    }
  }

  function startEdit(doc) {
    setEditingDoc(doc)
    setEditLabel(doc.original_filename || '')
    setEditText(doc.raw_text || '')
    setEditError(null)
  }

  async function saveEdit() {
    setSaving(true)
    setEditError(null)
    try {
      await updateManualText({ documentId: editingDoc.id, text: editText, label: editLabel })
      setEditingDoc(null)
      load()
    } catch (err) {
      setEditError(err.message)
    } finally {
      setSaving(false)
    }
  }

  async function confirmDelete() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDocument({ documentId: deleteTarget.id, storagePath: deleteTarget.storage_path })
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <UploadWidget projectId={projectId} onUploaded={load} />

      <div className="flex items-center justify-end">
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh"
          aria-label="Refresh"
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <RefreshIcon className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-slate-400">
          <Spinner label="Loading…" />
        </div>
      ) : documents.length === 0 ? (
        <EmptyState icon={DocumentIcon} title={`No ${kind} uploaded yet`} description="Use the panel above to upload or paste content." />
      ) : kind === 'images' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
            >
              {thumbnails[doc.id] ? (
                <img
                  src={thumbnails[doc.id]}
                  alt={doc.original_filename}
                  onClick={() => handleView(doc)}
                  className="h-32 w-full cursor-pointer object-cover"
                />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                  No preview
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-xs font-medium text-slate-700">{doc.original_filename}</p>
                <StatusBadge status={doc.status} />
                <div className="mt-2 flex gap-2">
                  <button onClick={() => handleView(doc)} className="text-xs text-slate-400 hover:text-slate-600">
                    View
                  </button>
                  <button
                    onClick={() => setDeleteTarget(doc)}
                    className="ml-auto text-xs text-red-400 hover:text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Uploaded</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-2 font-medium">
                    <button
                      onClick={() => handleView(doc)}
                      className="text-left text-slate-800 hover:text-accent-700 hover:underline"
                    >
                      {doc.original_filename}
                    </button>
                  </td>
                  <td className="px-4 py-2 capitalize text-slate-500">{doc.source_type}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={doc.status} />
                    {doc.status === 'failed' && doc.error_message && (
                      <p className="mt-1 max-w-xs truncate text-xs text-red-500" title={doc.error_message}>
                        {doc.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-500">
                    {new Date(doc.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3">
                      <button onClick={() => handleView(doc)} className="text-xs text-slate-400 hover:text-slate-600">
                        View
                      </button>
                      {doc.raw_text && (
                        <button onClick={() => startEdit(doc)} className="text-xs text-slate-400 hover:text-slate-600">
                          Edit
                        </button>
                      )}
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="text-xs text-red-400 hover:text-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setViewingDoc(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl animate-fade-in overflow-auto rounded-xl bg-white p-5 shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <h2 className="text-sm font-semibold text-slate-900">{viewingDoc.original_filename}</h2>
              <button onClick={() => setViewingDoc(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            {viewingDoc.raw_text ? (
              <pre className="whitespace-pre-wrap text-sm text-slate-700">{viewingDoc.raw_text}</pre>
            ) : viewingUrl ? (
              <img src={viewingUrl} alt={viewingDoc.original_filename} className="w-full rounded" />
            ) : (
              <p className="text-sm text-slate-500">No preview available.</p>
            )}
          </div>
        </div>
      )}

      {editingDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4"
          onClick={() => setEditingDoc(null)}
        >
          <div
            className="w-full max-w-2xl animate-fade-in rounded-xl bg-white p-5 shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Edit pasted text</h2>
            <input
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              placeholder="Label"
              className={`mb-3 ${inputClass}`}
            />
            <textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={10} className={inputClass} />
            <p className="mt-2 text-xs text-slate-400">
              Saving re-embeds this document from scratch — existing chunks are cleared and status resets to pending.
            </p>
            {editError && <p className="mt-2 text-sm text-red-600">{editError}</p>}
            <div className="mt-4 flex gap-2">
              <Button onClick={saveEdit} disabled={saving || !editText.trim()}>
                {saving ? 'Saving…' : 'Save & re-embed'}
              </Button>
              <Button variant="secondary" onClick={() => setEditingDoc(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document?"
        message={
          deleteTarget &&
          `Delete "${deleteTarget.original_filename}"? This removes its file, chunks, and cannot be undone.`
        }
        confirmLabel="Delete"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => {
          setDeleteTarget(null)
          setDeleteError(null)
        }}
      />
    </div>
  )
}
