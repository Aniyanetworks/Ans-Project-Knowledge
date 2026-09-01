import { useState } from 'react'

/**
 * sources: [{ document_id, chunk_id, filename, speaker, timestamp, snippet, similarity }]
 */
export default function SourceCitations({ sources }) {
  const [open, setOpen] = useState(false)
  if (!sources || sources.length === 0) return null

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-medium text-purple-700 hover:underline"
      >
        {open ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="mt-2 space-y-2">
          {sources.map((s, i) => (
            <li key={s.chunk_id ?? i} className="rounded-md border border-slate-200 bg-slate-50 p-2 text-xs">
              <div className="mb-1 flex items-center gap-2 font-medium text-slate-700">
                <span>{s.filename ?? 'Untitled source'}</span>
                {s.speaker && <span className="text-slate-400">· {s.speaker}</span>}
                {s.timestamp && <span className="text-slate-400">· {s.timestamp}</span>}
              </div>
              {s.snippet && <p className="text-slate-500">{s.snippet}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
