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
        className="inline-flex items-center gap-1 text-xs font-medium text-accent-700 hover:underline"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          stroke="currentColor"
          className={`h-3 w-3 transition-transform ${open ? 'rotate-90' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
        {open ? 'Hide' : 'Show'} {sources.length} source{sources.length > 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="mt-2 space-y-1.5">
          {sources.map((s, i) => (
            <li key={s.chunk_id ?? i} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs">
              <div className="mb-1 flex items-center gap-2 font-medium text-slate-700">
                <span className="rounded bg-accent-100 px-1.5 py-0.5 text-[10px] font-semibold text-accent-700">
                  {i + 1}
                </span>
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
