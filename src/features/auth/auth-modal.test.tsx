import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { DirectionProvider } from '@/context/direction-provider'
import { AuthModal } from '@/features/auth/auth-modal'

async function renderAuth(ui: ReactElement) {
  return render(<DirectionProvider>{ui}</DirectionProvider>)
}

const refreshProfile = vi.fn()

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: null,
    loading: false,
    configured: true,
    refreshProfile,
    signOut: vi.fn(),
  }),
}))

vi.mock('@/features/auth/sign-in/components/user-auth-form', () => ({
  UserAuthForm: ({
    onSuccess,
    defaultEmail,
  }: {
    onSuccess?: () => void | Promise<void>
    defaultEmail?: string
  }) => (
    <div>
      {defaultEmail ? (
        <span data-testid='default-email'>{defaultEmail}</span>
      ) : null}
      <button
        type='button'
        data-testid='user-auth-success'
        onClick={() => void onSuccess?.()}
      >
        Finish sign-in
      </button>
    </div>
  ),
}))

vi.mock('@/features/auth/sign-up/components/sign-up-form', () => ({
  SignUpForm: ({
    onSuccess,
    intent,
  }: {
    onSuccess?: (info: {
      email: string
      hasSession: boolean
    }) => void | Promise<void>
    intent?: string
  }) => (
    <div data-testid='signup-form' data-intent={intent ?? ''}>
      <button
        type='button'
        data-testid='signup-no-session'
        onClick={() =>
          void onSuccess?.({ email: 'next@example.com', hasSession: false })
        }
      >
        Sign up no session
      </button>
      <button
        type='button'
        data-testid='signup-with-session'
        onClick={() =>
          void onSuccess?.({ email: 'sess@example.com', hasSession: true })
        }
      >
        Sign up with session
      </button>
    </div>
  ),
}))

describe('AuthModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    refreshProfile.mockResolvedValue(null)
  })

  it('calls onAuthComplete and closes after stub sign-in', async () => {
    const onOpenChange = vi.fn()
    const onAuthComplete = vi.fn()
    const screen = await renderAuth(
      <AuthModal
        open
        onOpenChange={onOpenChange}
        onAuthComplete={onAuthComplete}
        defaultTab='signIn'
      />
    )
    await userEvent.click(screen.getByTestId('user-auth-success'))
    await vi.waitFor(() => expect(refreshProfile).toHaveBeenCalled())
    expect(onAuthComplete).toHaveBeenCalledWith(null)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('passes signUpIntent to sign-up tab', async () => {
    const screen = await renderAuth(
      <AuthModal
        open
        onOpenChange={vi.fn()}
        signUpIntent='candidate'
        defaultTab='signUp'
      />
    )
    await expect
      .element(screen.getByTestId('signup-form'))
      .toHaveAttribute('data-intent', 'candidate')
  })

  it('prefills email after sign-up without session', async () => {
    const screen = await renderAuth(
      <AuthModal open onOpenChange={vi.fn()} defaultTab='signUp' />
    )
    await userEvent.click(screen.getByTestId('signup-no-session'))
    await expect
      .element(screen.getByTestId('default-email'))
      .toHaveTextContent('next@example.com')
  })

  it('completes immediately when sign-up returns a session', async () => {
    const profile: ProfileRow = {
      id: 'p1',
      email: 'sess@example.com',
      role: 'candidate',
      created_at: '',
      updated_at: '',
      recruiter_row_id: null,
    }
    refreshProfile.mockResolvedValue(profile)
    const onOpenChange = vi.fn()
    const onAuthComplete = vi.fn()
    const screen = await renderAuth(
      <AuthModal
        open
        onOpenChange={onOpenChange}
        onAuthComplete={onAuthComplete}
        defaultTab='signUp'
      />
    )
    await userEvent.click(screen.getByTestId('signup-with-session'))
    await vi.waitFor(() => expect(refreshProfile).toHaveBeenCalled())
    expect(onAuthComplete).toHaveBeenCalledWith(profile)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
