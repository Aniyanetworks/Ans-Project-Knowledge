import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(undefined)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // Tracks whose profile is currently loaded/loading, so routes that read
  // `profile`/`isAdmin` never see a stale (e.g. null) value for the new user
  // after sign-in — without this, onAuthStateChange updates `session`
  // synchronously but `profile` only resolves after an async fetch, so a
  // redirect decision made in that gap (e.g. admin vs developer home route)
  // would use the previous user's (or no) profile.
  const loadedForUserId = useRef(null)

  useEffect(() => {
    let mounted = true

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      setSession(session)
      if (session) loadProfile(session.user.id)
      else setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) {
        if (loadedForUserId.current === session.user.id) return // e.g. token refresh — profile already loaded
        setLoading(true)
        loadProfile(session.user.id)
      } else {
        loadedForUserId.current = null
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (error) console.error('Failed to load profile', error)
    loadedForUserId.current = userId
    setProfile(data ?? null)
    setLoading(false)
  }

  async function signInWithPassword(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  async function signInWithMagicLink(email) {
    const { error } = await supabase.auth.signInWithOtp({ email })
    if (error) throw error
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  /** Changes the CURRENT user's own password — works client-side, no service role needed. */
  async function changeOwnPassword(newPassword) {
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) throw error
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    isAdmin: profile?.role === 'admin',
    loading,
    signInWithPassword,
    signInWithMagicLink,
    signOut,
    changeOwnPassword,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
