import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { inviteDeveloper, deleteDeveloperAccount, resetUserPassword } from '../../lib/api'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ConfirmDialog'

const inputClass =
  'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm shadow-sm transition-shadow focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/30'

function UsersIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.5} stroke="currentColor" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z"
      />
    </svg>
  )
}

/** A random 12-char temp password with mixed case, digits, and one symbol. */
function generatePassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(9))
  const base = btoa(String.fromCharCode(...bytes)).replace(/[+/=]/g, 'x')
  return base.slice(0, 12) + '!A1'
}

function ResetPasswordModal({ developer, onClose, onDone }) {
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (password.trim().length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await resetUserPassword({ userId: developer.id, password: password.trim() })
      setSuccess(true)
      onDone?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-in rounded-xl bg-white p-5 shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-1 text-base font-semibold text-slate-900">Reset password</h2>
        <p className="mb-4 text-sm text-slate-500">
          For <strong>{developer.full_name || developer.email}</strong> — sets it directly, no email sent.
        </p>
        {success ? (
          <>
            <p className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              Password updated to <strong>{password.trim()}</strong> — copy this now, it won't be shown again.
            </p>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New password (min. 8 characters)"
                className={inputClass}
              />
              <Button type="button" variant="secondary" size="sm" onClick={() => setPassword(generatePassword())}>
                Generate
              </Button>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={saving || !password}>
                {saving ? 'Saving…' : 'Update password'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function DevelopersTab({ projectId }) {
  const { user } = useAuth()
  const [developers, setDevelopers] = useState([])
  const [accessUserIds, setAccessUserIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [showInvite, setShowInvite] = useState(false)
  const [inviteMode, setInviteMode] = useState('link') // 'link' | 'password'
  const [inviteEmail, setInviteEmail] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteError, setInviteError] = useState(null)
  const [inviteSuccess, setInviteSuccess] = useState(null)

  const [resetTarget, setResetTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState(null)

  useEffect(() => {
    load()
  }, [projectId])

  async function load() {
    setLoading(true)
    const [{ data: devs, error: devErr }, { data: access, error: accessErr }] = await Promise.all([
      supabase.from('profiles').select('id, email, full_name').eq('role', 'developer').order('email'),
      supabase.from('project_access').select('user_id').eq('project_id', projectId),
    ])
    if (devErr) setError(devErr.message)
    if (accessErr) setError(accessErr.message)
    setDevelopers(devs ?? [])
    setAccessUserIds(new Set((access ?? []).map((a) => a.user_id)))
    setLoading(false)
  }

  async function toggleAccess(devId, hasAccess) {
    if (hasAccess) {
      await supabase.from('project_access').delete().eq('project_id', projectId).eq('user_id', devId)
    } else {
      await supabase
        .from('project_access')
        .insert({ project_id: projectId, user_id: devId, granted_by: user.id })
    }
    load()
  }

  async function handleInvite(e) {
    e.preventDefault()
    const email = inviteEmail.trim()
    if (!email) return
    if (inviteMode === 'password' && invitePassword.trim().length < 8) {
      setInviteError('Password must be at least 8 characters.')
      return
    }
    setInviting(true)
    setInviteError(null)
    setInviteSuccess(null)
    try {
      const result = await inviteDeveloper({
        email,
        password: inviteMode === 'password' ? invitePassword.trim() : undefined,
        invitedBy: user.id,
      })
      // Grant access to this project immediately — the account already has a
      // `profiles` row via the signup trigger, even before an email invite is accepted.
      await supabase
        .from('project_access')
        .insert({ project_id: projectId, user_id: result.user_id, granted_by: user.id })

      setInviteSuccess(
        inviteMode === 'password'
          ? `Created ${result.email} and granted access. Password: ${invitePassword.trim()} — copy this now, it won't be shown again.`
          : `Invited ${result.email} and granted access to this project.`
      )
      setInviteEmail('')
      setInvitePassword('')
      load()
    } catch (err) {
      setInviteError(err.message)
    } finally {
      setInviting(false)
    }
  }

  async function confirmDeleteAccount() {
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteDeveloperAccount(deleteTarget.id)
      setDeleteTarget(null)
      load()
    } catch (err) {
      setDeleteError(err.message)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="py-10 text-center text-sm text-slate-400">
        <Spinner label="Loading…" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Grant or revoke access to this project.</p>
        <Button
          variant={showInvite ? 'secondary' : 'primary'}
          size="sm"
          onClick={() => {
            setShowInvite((s) => !s)
            setInviteError(null)
          }}
        >
          {showInvite ? 'Cancel' : '+ Invite developer'}
        </Button>
      </div>

      {showInvite && (
        <form onSubmit={handleInvite} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setInviteMode('link')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                inviteMode === 'link' ? 'bg-accent-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Send invite email
            </button>
            <button
              type="button"
              onClick={() => setInviteMode('password')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                inviteMode === 'password' ? 'bg-accent-600 text-white' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Set password directly
            </button>
          </div>

          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="developer@company.com"
                className={inputClass}
              />
              {inviteMode === 'password' && (
                <div className="flex gap-2">
                  <input
                    value={invitePassword}
                    onChange={(e) => setInvitePassword(e.target.value)}
                    placeholder="Temporary password (min. 8 characters)"
                    className={inputClass}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setInvitePassword(generatePassword())}
                  >
                    Generate
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-400">
                {inviteMode === 'password'
                  ? 'Account is created and usable immediately — no email sent. Share this password with them yourself.'
                  : "Sends an invite email with a sign-in link — no password to share."}
                {' '}
                Either way, access to this project is granted right away.
              </p>
              {inviteError && <p className="text-sm text-red-600">{inviteError}</p>}
            </div>
            <Button type="submit" size="sm" disabled={inviting || !inviteEmail.trim()}>
              {inviting ? 'Working…' : inviteMode === 'password' ? 'Create account' : 'Send invite'}
            </Button>
          </div>
        </form>
      )}

      {inviteSuccess && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{inviteSuccess}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {error && <p className="p-4 text-sm text-red-600">{error}</p>}
        {developers.length === 0 ? (
          <EmptyState
            icon={UsersIcon}
            title="No developer accounts yet"
            description="Invite one above, or they'll appear here once they sign up."
          />
        ) : (
          <ul className="divide-y divide-slate-100">
            {developers.map((dev) => {
              const hasAccess = accessUserIds.has(dev.id)
              return (
                <li key={dev.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">
                      {(dev.full_name || dev.email).charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{dev.full_name || dev.email}</p>
                      <p className="truncate text-xs text-slate-500">{dev.email}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <button
                      onClick={() => setResetTarget(dev)}
                      className="text-xs text-slate-400 hover:text-slate-600"
                    >
                      Reset password
                    </button>
                    <button
                      onClick={() => {
                        setDeleteTarget(dev)
                        setDeleteError(null)
                      }}
                      className="text-xs text-red-400 hover:text-red-600"
                    >
                      Delete account
                    </button>
                    <Button
                      size="sm"
                      variant={hasAccess ? 'secondary' : 'primary'}
                      onClick={() => toggleAccess(dev.id, hasAccess)}
                    >
                      {hasAccess ? 'Revoke access' : 'Grant access'}
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {resetTarget && (
        <ResetPasswordModal
          developer={resetTarget}
          onClose={() => setResetTarget(null)}
          onDone={() => {}}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete developer account?"
        message={
          deleteTarget &&
          `Permanently delete "${deleteTarget.full_name || deleteTarget.email}"'s account? This removes their access to every project (not just this one) and their Q&A history. This cannot be undone.`
        }
        confirmLabel="Delete account"
        danger
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDeleteAccount}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
