import { useRef, useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { uploadFileDocument, submitManualText } from '../lib/api'
import Button from './ui/Button'
import Spinner from './ui/Spinner'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

const SOURCE_TYPES = [
  { value: 'fathom', label: 'Fathom export' },
  { value: 'fireflies', label: 'Fireflies export' },
  { value: 'tldv', label: 'tl;dv export' },
  { value: 'manual', label: 'Manual paste' },
  { value: 'image', label: 'Image' },
]

function UploadIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
      />
    </svg>
  )
}

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
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <label className="mb-1 block text-sm font-medium text-slate-700">Source type</label>
        <select
          value={sourceType}
          onChange={(e) => setSourceType(e.target.value)}
          className={`max-w-xs ${inputClass}`}
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
            className={inputClass}
          />
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={6}
            placeholder="Paste transcript or chat log text here…"
            className={inputClass}
          />
          <Button onClick={handlePasteSubmit} disabled={busy || !pasteText.trim()}>
            {busy ? 'Submitting…' : 'Submit text'}
          </Button>
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
          className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
            dragOver ? 'border-accent-400 bg-accent-50' : 'border-slate-300 hover:border-slate-400'
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
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <UploadIcon className="h-4.5 w-4.5" />
          </div>
          <p className="text-sm text-slate-600">
            {busy ? <Spinner label="Uploading…" /> : 'Drag & drop files here, or click to browse'}
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
