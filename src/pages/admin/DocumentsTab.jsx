import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { getSignedUrl } from '../../lib/api'
import UploadWidget from '../../components/UploadWidget'
import StatusBadge from '../../components/StatusBadge'

/**
 * kind: 'transcripts' shows fathom/fireflies/tldv/manual documents
 *       'images' shows image documents (with thumbnail preview)
 */
export default function DocumentsTab({ projectId, kind }) {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [thumbnails, setThumbnails] = useState({})

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

  async function load() {
    setLoading(true)
    let query = supabase
      .from('documents')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })

    query = kind === 'images' ? query.eq('source_type', 'image') : query.neq('source_type', 'image')

    const { data, error } = await query
    if (!error) setDocuments(data ?? [])
    setLoading(false)

    if (kind === 'images') {
      const entries = await Promise.all(
        (data ?? [])
          .filter((d) => d.storage_path)
          .map(async (d) => [d.id, await getSignedUrl(d.storage_path).catch(() => null)])
      )
      setThumbnails(Object.fromEntries(entries))
    }
  }

  return (
    <div className="space-y-6">
      <UploadWidget projectId={projectId} onUploaded={load} />

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="text-sm text-slate-500">No {kind} uploaded yet.</p>
      ) : kind === 'images' ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {documents.map((doc) => (
            <div key={doc.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              {thumbnails[doc.id] ? (
                <img src={thumbnails[doc.id]} alt={doc.original_filename} className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 w-full items-center justify-center bg-slate-100 text-xs text-slate-400">
                  No preview
                </div>
              )}
              <div className="p-2">
                <p className="truncate text-xs font-medium text-slate-700">{doc.original_filename}</p>
                <StatusBadge status={doc.status} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">File</th>
                <th className="px-4 py-2">Source</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="px-4 py-2 font-medium text-slate-800">{doc.original_filename}</td>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
