import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import { getPostAuthPath } from '@/lib/auth/post-auth-path'
import {
  signInCardDescription,
  type SignInIntent,
} from '@/lib/auth/sign-in-intent'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { AuthModal } from '@/features/auth/auth-modal'

const POST_JOB_MODAL_TITLE = 'Post a job'
const POST_JOB_MODAL_DESCRIPTION =
  'Sign in or create a recruiter account. After that you will open the new listing page to enter details and save a draft.'

const DEFAULT_SIGN_IN_TITLE = 'Sign in'
const DEFAULT_SIGN_IN_DESCRIPTION =
  'Enter your email and password to access your account.'

type OpenAuthOpts = {
  title?: string
  description?: string
  signUpIntent?: SignInIntent
}

type PublicSiteAuthContextValue = {
  requireAuthForPostJob: () => void
  openCandidateAuthModal: () => void
}

const PublicSiteAuthContext = createContext<PublicSiteAuthContextValue | null>(
  null
)

const publicSiteAuthFallback: PublicSiteAuthContextValue = {
  requireAuthForPostJob: () => {
    const dest = '/recruiter/jobs/new'
    window.location.assign(`/sign-in?redirect=${encodeURIComponent(dest)}`)
  },
  openCandidateAuthModal: () => {
    window.location.assign('/sign-in')
  },
}

export function usePublicSiteAuth(): PublicSiteAuthContextValue {
  const ctx = useContext(PublicSiteAuthContext)
  if (!ctx) {
    if (import.meta.env.DEV) {
      throw new Error(
        'usePublicSiteAuth must be used within PublicSiteAuthProvider'
      )
    }
    return publicSiteAuthFallback
  }
  return ctx
}

export function PublicSiteAuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const { user, loading } = useAuth()
  const [signInOpen, setSignInOpen] = useState(false)
  const [signInTitle, setSignInTitle] = useState(DEFAULT_SIGN_IN_TITLE)
  const [signInDescription, setSignInDescription] = useState(
    DEFAULT_SIGN_IN_DESCRIPTION
  )
  const [modalSignUpIntent, setModalSignUpIntent] = useState<
    SignInIntent | undefined
  >('recruiter')
  const [authModalKey, setAuthModalKey] = useState(0)
  const pendingAfterSignInRef = useRef<(() => void) | null>(null)

  const openAuthModal = useCallback((opts?: OpenAuthOpts) => {
    setSignInTitle(opts?.title ?? DEFAULT_SIGN_IN_TITLE)
    setSignInDescription(opts?.description ?? DEFAULT_SIGN_IN_DESCRIPTION)
    setModalSignUpIntent(opts?.signUpIntent ?? 'recruiter')
    setAuthModalKey((k) => k + 1)
    setSignInOpen(true)
  }, [])

  const handleAuthComplete = useCallback(
    (profile: ProfileRow | null) => {
      const fn = pendingAfterSignInRef.current
      pendingAfterSignInRef.current = null
      if (fn) {
        fn()
        return
      }
      void navigate({ to: getPostAuthPath(profile) })
    },
    [navigate]
  )

  const requireAuthForPostJob = useCallback(() => {
    if (loading) return
    if (user) {
      void navigate({ to: '/recruiter/jobs/new' })
      return
    }
    pendingAfterSignInRef.current = () => {
      void navigate({ to: '/recruiter/jobs/new' })
    }
    openAuthModal({
      title: POST_JOB_MODAL_TITLE,
      description: POST_JOB_MODAL_DESCRIPTION,
      signUpIntent: 'recruiter',
    })
  }, [loading, user, navigate, openAuthModal])

  const openCandidateAuthModal = useCallback(() => {
    if (loading) return
    pendingAfterSignInRef.current = null
    openAuthModal({
      title: DEFAULT_SIGN_IN_TITLE,
      description: signInCardDescription('candidate'),
      signUpIntent: 'candidate',
    })
  }, [loading, openAuthModal])

  const value: PublicSiteAuthContextValue = {
    requireAuthForPostJob,
    openCandidateAuthModal,
  }

  return (
    <PublicSiteAuthContext.Provider value={value}>
      {children}
      <AuthModal
        key={authModalKey}
        open={signInOpen}
        onOpenChange={(open) => {
          setSignInOpen(open)
          if (!open) pendingAfterSignInRef.current = null
        }}
        title={signInTitle}
        description={signInDescription}
        signUpIntent={modalSignUpIntent}
        onAuthComplete={handleAuthComplete}
      />
    </PublicSiteAuthContext.Provider>
  )
}
