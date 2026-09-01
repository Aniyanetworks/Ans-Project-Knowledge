import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

/**
 * Gates a route on auth + optionally on role.
 * requireRole: 'admin' | 'developer' | undefined (any authenticated role)
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { session, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (requireRole && role !== requireRole) {
    // Admins can still view developer routes; developers cannot view admin routes.
    if (!(requireRole === 'developer' && role === 'admin')) {
      return <Navigate to="/" replace />
    }
  }

  return children
}
