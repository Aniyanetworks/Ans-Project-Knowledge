import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Button from './ui/Button'
import ChangePasswordForm from './ChangePasswordForm'

function ChangePasswordModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm animate-fade-in rounded-xl bg-white p-5 shadow-2xl shadow-slate-900/20"
        onClick={(e) => e.stopPropagation()}
      >
        <ChangePasswordForm />
        <Button variant="secondary" size="sm" className="mt-3" onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  )
}

export default function Navbar() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [showPasswordModal, setShowPasswordModal] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const initial = (profile?.full_name || profile?.email || '?').trim().charAt(0).toUpperCase()

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 text-sm font-bold text-white shadow-sm">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-slate-900">
            Project Knowledge
          </span>
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <span className="rounded-full bg-accent-100 px-2.5 py-1 text-xs font-medium text-accent-700">
              Admin
            </span>
          )}
          <div className="hidden items-center gap-2 sm:flex">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[11px] font-semibold text-slate-600">
              {initial}
            </span>
            <span className="text-sm text-slate-500">{profile?.email}</span>
          </div>
          {!isAdmin && (
            <button
              onClick={() => setShowPasswordModal(true)}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Change password
            </button>
          )}
          <Button variant="secondary" size="sm" onClick={handleSignOut}>
            Sign out
          </Button>
        </div>
      </div>
      {showPasswordModal && <ChangePasswordModal onClose={() => setShowPasswordModal(false)} />}
    </header>
  )
}
