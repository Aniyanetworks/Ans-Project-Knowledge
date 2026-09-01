import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileDocument, submitManualText } from '../lib/api'

const SOURCE_TYPES = [
  { value: 'fathom', label: 'Fathom export' },
  { value: 'fireflies', label: 'Fireflies export' },
  { value: 'tldv', label: 'tl;dv export' },
  { value: 'manual', label: 'Manual paste' },
  { value: 'image', label: 'Image' },
]

export default function UploadWidget({ projectId, onUploaded }) {
  const { user } = useAuth()
  const [sourceType, setSourceType] = useState('fathom')
  const [dragOver, setDragOver] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [pasteLabel, setPasteLabel] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef(null)

  const isManualPaste = sourceType === 'manual'

  async function handleFiles(files) {
    if (!files || files.length === 0) return
    setBusy(true)
    setError(null)
    try {
      for (const file of files) {
        await uploadFileDocument({ projectId, file, sourceType, userId: user.id })
      }
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handlePasteSubmit() {
    if (!pasteText.trim()) return
    setBusy(true)
    setError(null)
    try {
      await submitManualText({ projectId, text: pasteText, label: pasteLabel, userId: user.id })
      setPasteText('')
      setPasteLabel('')
      onUploaded?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Source type</label>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className="w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
        >
          {SOURCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </div>

      {isManualPaste ? (
        <div className="space-y-3">
          <input
            value={pasteLabel}
            onChange={(e) => setPasteLabel(e.target.value)}
            placeholder="Label (e.g. 'Slack thread — pricing decision')"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste transcript or chat log text here…"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          <button
            onClick={handlePasteSubmit}
            disabled={busy || !pasteText.trim()}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
          >
            {busy ? 'Submitting…' : 'Submit text'}
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            handleFiles(e.dataTransfer.files)
          }}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={sourceType === 'image' ? 'image/*' : undefined}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <p className="text-sm text-slate-600">
            {busy ? 'Uploading…' : 'Drag & drop files here, or click to browse'}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {sourceType === 'image' ? 'PNG, JPG, etc.' : 'JSON, TXT, VTT, or export files from ' + sourceType}
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  )
}
