import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import Button from './ui/Button'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

function KeyIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
      />
    </svg>
  )
}

export default function ChangePasswordForm() {
  const { changeOwnPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError("Passwords don't match.")
      return
    }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await changeOwnPassword(password)
      setSuccess(true)
      setPassword('')
      setConfirm('')
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <KeyIcon className="h-4 w-4 text-accent-600" />
        Change your password
      </h2>
      <form
        onSubmit={handleSubmit}
        className="max-w-sm space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min. 8 characters)"
          className={inputClass}
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className={inputClass}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {success && <p className="text-sm text-green-600">Password updated.</p>}
        <Button type="submit" size="sm" disabled={saving || !password || !confirm}>
          {saving ? 'Saving…' : 'Update password'}
        </Button>
      </form>
    </div>
  )
}
