import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
  const { session, signInWithPassword, signInWithMagicLink } = useAuth()
  const [mode, setMode] = useState('password') // 'password' | 'magic-link'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (session) return <Navigate to="/" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'password') {
        await signInWithPassword(email, password)
      } else {
        await signInWithMagicLink(email)
        setMagicLinkSent(true)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-slate-900">Project Knowledge</h1>
        <p className="mb-6 text-sm text-slate-500">Sign in to continue</p>

        {magicLinkSent ? (
          <p className="text-sm text-green-700">
            Check <strong>{email}</strong> for a magic sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                placeholder="you@company.com"
              />
            </div>

            {mode === 'password' && (
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
            >
              {submitting ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
            </button>

            <button
              type="button"
              onClick={() => setMode(mode === 'password' ? 'magic-link' : 'password')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700"
            >
              {mode === 'password' ? 'Use a magic link instead' : 'Use a password instead'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
