import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { ProfileRow } from '@/lib/supabase/database.types'

type AuthContextValue = {
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  loading: boolean
  configured: boolean
  refreshProfile: () => Promise<ProfileRow | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const configured = getSupabaseConfigured()
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(configured)

  const refreshProfile = useCallback(async (): Promise<ProfileRow | null> => {
    if (!configured) {
      setProfile(null)
      return null
    }
    const uid = session?.user.id
    const authUser = session?.user
    if (!uid || !authUser) {
      setProfile(null)
      return null
    }
    const sb = getSupabaseBrowserClient()
    const { data: rec } = await sb
      .from('recruiters')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (rec) {
      const row: ProfileRow = {
        id: uid,
        email: rec.email,
        role: rec.role === 'admin' ? 'admin' : 'recruiter',
        created_at: rec.created_at,
        updated_at: rec.created_at,
      }
      setProfile(row)
      return row
    }
    const candidate: ProfileRow = {
      id: uid,
      email: authUser.email ?? '',
      role: 'candidate',
      created_at: authUser.created_at ?? '',
      updated_at: authUser.updated_at ?? authUser.created_at ?? '',
    }
    setProfile(candidate)
    return candidate
  }, [configured, session?.user])

  useEffect(() => {
    if (!configured) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sync configured flag
      setLoading(false)
      return
    }
    const sb = getSupabaseBrowserClient()

    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })

    return () => subscription.unsubscribe()
  }, [configured])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- profile follows session
    void refreshProfile()
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    if (!configured) return
    const sb = getSupabaseBrowserClient()
    await sb.auth.signOut()
    setProfile(null)
  }, [configured])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      configured,
      refreshProfile,
      signOut,
    }),
    [session, profile, loading, configured, refreshProfile, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth () {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
