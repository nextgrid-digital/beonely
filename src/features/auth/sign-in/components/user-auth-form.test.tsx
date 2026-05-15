import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import type { ProfileRow } from '@/lib/supabase/database.types'
import { UserAuthForm } from './user-auth-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  passwordShort: 'Password must be at least 7 characters long.',
} as const

const navigate = vi.fn()

const mocks = vi.hoisted(() => ({
  refreshProfile: vi.fn().mockResolvedValue(null),
  getSupabaseConfigured: vi.fn(() => true),
  signInWithPassword: vi.fn().mockResolvedValue({ error: null }),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => mocks.getSupabaseConfigured(),
  getSupabaseBrowserClient: () => ({
    auth: { signInWithPassword: mocks.signInWithPassword },
  }),
}))

vi.mock('@/context/auth-provider', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/context/auth-provider')>()
  return {
    ...actual,
    useAuth: () => ({
      user: null,
      session: null,
      profile: null,
      loading: false,
      configured: true,
      refreshProfile: mocks.refreshProfile,
      signOut: vi.fn(),
    }),
  }
})

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    Link: ({
      children,
      to,
      className,
      ...rest
    }: {
      children?: React.ReactNode
      to: string
      className?: string
    }) => (
      <a href={to} className={className} {...rest}>
        {children}
      </a>
    ),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

function profileRow(role: ProfileRow['role']): ProfileRow {
  return {
    id: 'p1',
    email: 'u@example.com',
    role,
    created_at: '',
    updated_at: '',
    recruiter_row_id: null,
  }
}

describe('UserAuthForm', () => {
  describe('Rendering without redirectTo', () => {
    let screen: RenderResult
    let emailInput: Locator
    let passwordInput: Locator
    let signInButton: Locator
    let forgotPasswordLink: Locator

    beforeEach(async () => {
      vi.clearAllMocks()
      mocks.getSupabaseConfigured.mockReturnValue(true)
      mocks.refreshProfile.mockResolvedValue(null)
      mocks.signInWithPassword.mockResolvedValue({ error: null })
      screen = await render(<UserAuthForm />)
      emailInput = screen.getByRole('textbox', { name: /^Email$/i })
      passwordInput = screen.getByLabelText(/^Password$/i)
      signInButton = screen.getByRole('button', { name: /^Sign in$/i })
      forgotPasswordLink = screen.getByText(/^Forgot password\?$/i)
    })

    it('renders fields, submit button, and forgot password link', async () => {
      await expect.element(emailInput).toBeInTheDocument()
      await expect.element(passwordInput).toBeInTheDocument()
      await expect.element(signInButton).toBeInTheDocument()
      await expect.element(forgotPasswordLink).toBeInTheDocument()
    })

    it('shows validation messages when submitting empty form', async () => {
      await userEvent.click(signInButton)

      await expect
        .element(screen.getByText(FORM_MESSAGES.emailEmpty))
        .toBeInTheDocument()
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
        .toBeInTheDocument()
    })

    it('shows short password validation for fewer than 7 characters', async () => {
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '123456')
      await userEvent.click(signInButton)
      await expect
        .element(screen.getByText(FORM_MESSAGES.passwordShort))
        .toBeInTheDocument()
      expect(mocks.signInWithPassword).not.toHaveBeenCalled()
    })

    it('authenticates and navigates to candidate home on success', async () => {
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '1234567')

      await userEvent.click(signInButton)

      await vi.waitFor(() =>
        expect(mocks.signInWithPassword).toHaveBeenCalledOnce()
      )
      expect(mocks.signInWithPassword).toHaveBeenCalledWith({
        email: 'a@b.com',
        password: '1234567',
      })

      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({
          to: '/candidate/profile',
          replace: true,
        })
      )
    })

    it('navigates to recruiter portal when refreshProfile returns recruiter', async () => {
      mocks.refreshProfile.mockResolvedValue(profileRow('recruiter'))
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '1234567')
      await userEvent.click(signInButton)
      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({
          to: '/recruiter',
          replace: true,
        })
      )
    })

    it('navigates to admin when refreshProfile returns admin', async () => {
      mocks.refreshProfile.mockResolvedValue(profileRow('admin'))
      await userEvent.fill(emailInput, 'a@b.com')
      await userEvent.fill(passwordInput, '1234567')
      await userEvent.click(signInButton)
      await vi.waitFor(() =>
        expect(navigate).toHaveBeenCalledWith({ to: '/admin', replace: true })
      )
    })
  })

  it('navigates to redirectTo when provided', async () => {
    vi.clearAllMocks()
    mocks.getSupabaseConfigured.mockReturnValue(true)
    mocks.refreshProfile.mockResolvedValue(null)

    const { getByRole, getByLabelText } = await render(
      <UserAuthForm redirectTo='/settings' />
    )

    await userEvent.fill(getByRole('textbox', { name: /Email/i }), 'a@b.com')
    await userEvent.fill(getByLabelText('Password'), '1234567')

    await userEvent.click(getByRole('button', { name: /Sign in/i }))

    await vi.waitFor(() =>
      expect(mocks.signInWithPassword).toHaveBeenCalledOnce()
    )

    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/settings',
        replace: true,
      })
    )
  })

  it('calls onSuccess instead of navigating when provided', async () => {
    vi.clearAllMocks()
    const onSuccess = vi.fn().mockResolvedValue(undefined)
    const ui = await render(<UserAuthForm onSuccess={onSuccess} />)
    await userEvent.fill(
      ui.getByRole('textbox', { name: /^Email$/i }),
      'a@b.com'
    )
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Sign in$/i }))
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(navigate).not.toHaveBeenCalled()
  })

  it('prefills email from defaultEmail', async () => {
    vi.clearAllMocks()
    const ui = await render(
      <UserAuthForm defaultEmail='prefilled@example.com' />
    )
    const email = ui.getByRole('textbox', { name: /^Email$/i })
    await expect.element(email).toHaveValue('prefilled@example.com')
  })

  it('shows invalid credentials toast when sign-in fails', async () => {
    vi.clearAllMocks()
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    const ui = await render(<UserAuthForm />)
    await userEvent.fill(
      ui.getByRole('textbox', { name: /^Email$/i }),
      'a@b.com'
    )
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Sign in$/i }))
    await vi.waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Invalid email or password. If you just signed up, confirm your email from your inbox before signing in.'
      )
    )
    expect(navigate).not.toHaveBeenCalled()
  })

  it('shows email not confirmed toast when Supabase reports unconfirmed email', async () => {
    vi.clearAllMocks()
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: 'Email not confirmed' },
    })
    const ui = await render(<UserAuthForm />)
    await userEvent.fill(
      ui.getByRole('textbox', { name: /^Email$/i }),
      'a@b.com'
    )
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Sign in$/i }))
    await vi.waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Confirm your email first. Open the link we sent you, then sign in with the same password.'
      )
    )
  })

  it('shows generic toast for other sign-in errors', async () => {
    vi.clearAllMocks()
    mocks.signInWithPassword.mockResolvedValue({
      error: { message: 'Too many requests' },
    })
    const ui = await render(<UserAuthForm />)
    await userEvent.fill(
      ui.getByRole('textbox', { name: /^Email$/i }),
      'a@b.com'
    )
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Sign in$/i }))
    await vi.waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith('Too many requests')
    )
  })

  it('shows toast when Supabase is not configured', async () => {
    vi.clearAllMocks()
    mocks.getSupabaseConfigured.mockReturnValue(false)
    const ui = await render(<UserAuthForm />)
    await userEvent.fill(
      ui.getByRole('textbox', { name: /^Email$/i }),
      'a@b.com'
    )
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Sign in$/i }))
    await vi.waitFor(() =>
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        'Supabase is not configured.'
      )
    )
    expect(mocks.signInWithPassword).not.toHaveBeenCalled()
  })
})
