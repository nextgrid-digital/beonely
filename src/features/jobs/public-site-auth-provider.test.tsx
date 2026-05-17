import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import {
  PublicSiteAuthProvider,
  usePublicSiteAuth,
} from '@/features/jobs/public-site-auth-provider'

const navigate = vi.fn()

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}))

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    profile: null,
  }),
}))

vi.mock('@/features/auth/auth-modal', () => ({
  AuthModal: () => null,
}))

function HookProbe() {
  const auth = usePublicSiteAuth()
  return (
    <button type='button' onClick={auth.requireAuthForPostJob}>
      Post job probe
    </button>
  )
}

describe('usePublicSiteAuth', () => {
  it('works when wrapped in PublicSiteAuthProvider', async () => {
    const screen = await render(
      <PublicSiteAuthProvider>
        <HookProbe />
      </PublicSiteAuthProvider>
    )
    await expect.element(screen.getByRole('button', { name: /Post job probe/i })).toBeInTheDocument()
  })

  it('returns production fallback without provider instead of throwing', async () => {
    vi.stubEnv('DEV', false)
    const screen = await render(<HookProbe />)
    await expect
      .element(screen.getByRole('button', { name: /Post job probe/i }))
      .toBeInTheDocument()
    vi.unstubAllEnvs()
  })
})
