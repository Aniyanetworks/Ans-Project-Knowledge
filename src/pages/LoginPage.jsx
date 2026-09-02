import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from '../components/ui/Button'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm shadow-sm transition-shadow placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

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
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_60%,transparent_100%)]">
        <div className="absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-400/30 to-accent-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-700 text-lg font-bold text-white shadow-md shadow-accent-600/20">
            P
          </span>
          <h1 className="text-lg font-semibold text-slate-900">Project Knowledge</h1>
          <p className="mt-0.5 text-sm text-slate-500">Sign in to continue</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xl shadow-slate-200/60">
          {magicLinkSent ? (
            <p className="text-sm text-green-700">
              Check <strong>{email}</strong> for a magic sign-in link.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@company.com"
                />
              </div>

              {mode === 'password' && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </div>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
              )}

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? 'Signing in…' : mode === 'password' ? 'Sign in' : 'Send magic link'}
              </Button>

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
    </div>
  )
}
