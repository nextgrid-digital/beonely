import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isRecruiterRegistrationMetadata } from '@/lib/auth/registration-intent'
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
  const profileLoadId = useRef(0)

  const fetchProfileForUser = useCallback(async (authUser: User) => {
    const uid = authUser.id
    const sb = getSupabaseBrowserClient()
    const { data: rec, error } = await sb
      .from('recruiters')
      .select('*')
      .eq('user_id', uid)
      .maybeSingle()
    if (error) {
      throw error
    }
    if (rec) {
      const isActiveAdmin = rec.role === 'admin' && !rec.disabled
      const row: ProfileRow = {
        id: uid,
        email: rec.email,
        role: isActiveAdmin ? 'admin' : 'recruiter',
        created_at: rec.created_at,
        updated_at: rec.created_at,
        recruiter_row_id: rec.id,
      }
      return row
    }
    if (isRecruiterRegistrationMetadata(authUser)) {
      const row: ProfileRow = {
        id: uid,
        email: authUser.email ?? '',
        role: 'recruiter',
        created_at: authUser.created_at ?? '',
        updated_at: authUser.updated_at ?? authUser.created_at ?? '',
        recruiter_row_id: null,
      }
      return row
    }
    const candidate: ProfileRow = {
      id: uid,
      email: authUser.email ?? '',
      role: 'candidate',
      created_at: authUser.created_at ?? '',
      updated_at: authUser.updated_at ?? authUser.created_at ?? '',
      recruiter_row_id: null,
    }
    return candidate
  }, [])

  const refreshProfile = useCallback(async (): Promise<ProfileRow | null> => {
    if (!configured || !session?.user) {
      setProfile(null)
      return null
    }
    try {
      const row = await fetchProfileForUser(session.user)
      setProfile(row)
      return row
    } catch (error) {
      setProfile(null)
      throw error
    }
  }, [configured, fetchProfileForUser, session])

  useEffect(() => {
    if (!configured) return
    const sb = getSupabaseBrowserClient()

    const loadProfile = (next: Session) => {
      const loadId = ++profileLoadId.current
      setLoading(true)
      void fetchProfileForUser(next.user)
        .then((row) => {
          if (profileLoadId.current === loadId) setProfile(row)
        })
        .catch(() => {
          if (profileLoadId.current === loadId) setProfile(null)
        })
        .finally(() => {
          if (profileLoadId.current === loadId) setLoading(false)
        })
    }

    void sb.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (data.session) {
        loadProfile(data.session)
      } else {
        profileLoadId.current += 1
        setProfile(null)
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      if (next) {
        loadProfile(next)
      } else {
        profileLoadId.current += 1
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [configured, fetchProfileForUser])

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

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}
