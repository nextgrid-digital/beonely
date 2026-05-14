import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { type Locator, userEvent } from 'vitest/browser'
import { toast } from 'sonner'
import { SignUpForm } from './sign-up-form'

const FORM_MESSAGES = {
  emailEmpty: 'Please enter your email.',
  passwordEmpty: 'Please enter your password.',
  confirmPasswordEmpty: 'Please confirm your password.',
  passwordMismatch: "Passwords don't match.",
} as const

const LINKEDIN_EMPTY = 'Please enter your LinkedIn profile URL.'
const PHONE_EMPTY = 'Please enter your phone number.'

const supabaseMocks = vi.hoisted(() => {
  const signUp = vi.fn().mockResolvedValue({
    data: { user: { email: '' }, session: null },
    error: null,
  })
  const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
  const insert = vi.fn().mockResolvedValue({ error: null })
  const updateEq = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn(() => ({ eq: updateEq }))
  const from = vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        maybeSingle,
      })),
    })),
    insert,
    update,
  }))
  return { signUp, from, maybeSingle, insert, update, updateEq }
})

const navigate = vi.fn()

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: { signUp: supabaseMocks.signUp },
    from: supabaseMocks.from,
  }),
}))

vi.mock('@tanstack/react-router', async (orig) => {
  const actual = await orig<typeof import('@tanstack/react-router')>()
  return { ...actual, useNavigate: () => navigate }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

const signUp = supabaseMocks.signUp

describe('SignUpForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let passwordInput: Locator
  let confirmPasswordInput: Locator
  let submitButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    supabaseMocks.insert.mockResolvedValue({ error: null })

    screen = await render(<SignUpForm />)
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    passwordInput = screen.getByLabelText(/^Password$/i)
    confirmPasswordInput = screen.getByLabelText(/^Confirm Password$/i)
    submitButton = screen.getByRole('button', { name: /^Create Account$/i })
  })

  it('renders fields and submit button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(passwordInput).toBeInTheDocument()
    await expect.element(confirmPasswordInput).toBeInTheDocument()
    await expect.element(submitButton).toBeInTheDocument()
  })

  it('shows validation messages when submitting empty form', async () => {
    await userEvent.click(submitButton)

    await expect
      .element(screen.getByText(FORM_MESSAGES.emailEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordEmpty))
      .toBeInTheDocument()
    await expect
      .element(screen.getByText(FORM_MESSAGES.confirmPasswordEmpty))
      .toBeInTheDocument()
  })

  it('shows a mismatch error when passwords do not match', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '7654321')

    await userEvent.click(submitButton)
    await expect
      .element(screen.getByText(FORM_MESSAGES.passwordMismatch))
      .toBeInTheDocument()
  })

  it('calls Supabase signUp and navigates to sign-in', async () => {
    signUp.mockResolvedValue({
      data: { user: { email: 'a@b.com' }, session: null },
      error: null,
    })
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.fill(passwordInput, '1234567')
    await userEvent.fill(confirmPasswordInput, '1234567')

    await userEvent.click(submitButton)

    await vi.waitFor(() => expect(signUp).toHaveBeenCalledOnce())
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'a@b.com',
        password: '1234567',
      })
    )
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        replace: true,
        search: {},
      })
    )
  })
})

describe('SignUpForm intent navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('navigates to sign-in with candidate intent in search', async () => {
    signUp.mockResolvedValue({
      data: { user: { email: 'a@b.com' }, session: null },
      error: null,
    })
    const screenIntent = await render(<SignUpForm intent='candidate' />)
    const email = screenIntent.getByRole('textbox', { name: /^Email$/i })
    const linkedin = screenIntent.getByRole('textbox', { name: /LinkedIn profile URL/i })
    const phone = screenIntent.getByRole('textbox', { name: /^Phone number$/i })
    const pw = screenIntent.getByLabelText(/^Password$/i)
    const cpw = screenIntent.getByLabelText(/^Confirm Password$/i)
    const btn = screenIntent.getByRole('button', { name: /^Create Account$/i })
    await userEvent.fill(email, 'a@b.com')
    await userEvent.fill(linkedin, 'https://www.linkedin.com/in/example')
    await userEvent.fill(phone, '+1 555 123 4567')
    await userEvent.fill(pw, '1234567')
    await userEvent.fill(cpw, '1234567')
    await userEvent.click(btn)
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        replace: true,
        search: { intent: 'candidate' },
      })
    )
  })

  it('navigates to sign-in with intent when provided', async () => {
    signUp.mockResolvedValue({
      data: { user: { email: 'a@b.com' }, session: null },
      error: null,
    })
    const screenIntent = await render(<SignUpForm intent='recruiter' />)
    const email = screenIntent.getByRole('textbox', { name: /^Email$/i })
    const pw = screenIntent.getByLabelText(/^Password$/i)
    const cpw = screenIntent.getByLabelText(/^Confirm Password$/i)
    const btn = screenIntent.getByRole('button', { name: /^Create Account$/i })
    await userEvent.fill(email, 'a@b.com')
    await userEvent.fill(pw, '1234567')
    await userEvent.fill(cpw, '1234567')
    await userEvent.click(btn)
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({
        to: '/sign-in',
        replace: true,
        search: { intent: 'recruiter' },
      })
    )
  })
})

describe('SignUpForm with onSuccess', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls onSuccess instead of navigate when provided', async () => {
    const onSuccess = vi.fn().mockResolvedValue(undefined)
    signUp.mockResolvedValue({
      data: { user: { email: 'x@y.com' }, session: null },
      error: null,
    })
    const modalScreen = await render(<SignUpForm onSuccess={onSuccess} />)
    const em = modalScreen.getByRole('textbox', { name: /^Email$/i })
    const pw = modalScreen.getByLabelText(/^Password$/i)
    const cpw = modalScreen.getByLabelText(/^Confirm Password$/i)
    const btn = modalScreen.getByRole('button', { name: /^Create Account$/i })

    await userEvent.fill(em, 'x@y.com')
    await userEvent.fill(pw, '1234567')
    await userEvent.fill(cpw, '1234567')
    await userEvent.click(btn)

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalledOnce())
    expect(onSuccess).toHaveBeenCalledWith({
      email: 'x@y.com',
      hasSession: false,
    })
    expect(navigate).not.toHaveBeenCalled()
  })
})

describe('SignUpForm candidate intent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    supabaseMocks.maybeSingle.mockResolvedValue({ data: null, error: null })
    supabaseMocks.insert.mockResolvedValue({ error: null })
  })

  it('requires LinkedIn and phone when submitting empty candidate fields', async () => {
    const ui = await render(<SignUpForm intent='candidate' />)
    const btn = ui.getByRole('button', { name: /^Create Account$/i })
    await userEvent.click(btn)
    await expect.element(ui.getByText(LINKEDIN_EMPTY)).toBeInTheDocument()
    await expect.element(ui.getByText(PHONE_EMPTY)).toBeInTheDocument()
  })

  it('persists job_seeker_profiles after candidate sign-up with session', async () => {
    signUp.mockResolvedValue({
      data: {
        user: { id: 'uid-1', email: 'cand@example.com' },
        session: { access_token: 't' },
      },
      error: null,
    })
    const ui = await render(<SignUpForm intent='candidate' />)
    await userEvent.fill(ui.getByRole('textbox', { name: /^Email$/i }), 'cand@example.com')
    await userEvent.fill(
      ui.getByRole('textbox', { name: /LinkedIn profile URL/i }),
      'https://www.linkedin.com/in/candidate'
    )
    await userEvent.fill(ui.getByRole('textbox', { name: /^Phone number$/i }), '+1 555 123 4567')
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.fill(ui.getByLabelText(/^Confirm Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Create Account$/i }))

    await vi.waitFor(() => expect(signUp).toHaveBeenCalledOnce())
    expect(signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'cand@example.com',
        options: expect.objectContaining({
          data: {
            linkedin_url: 'https://www.linkedin.com/in/candidate',
            phone: '+1 555 123 4567',
          },
        }),
      })
    )
    await vi.waitFor(() => expect(supabaseMocks.from).toHaveBeenCalledWith('job_seeker_profiles'))
    await vi.waitFor(() => expect(supabaseMocks.insert).toHaveBeenCalled())
  })

  it('shows toast and does not navigate when signUp returns an error', async () => {
    signUp.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'User already registered' },
    })
    const ui = await render(<SignUpForm intent='candidate' />)
    await userEvent.fill(ui.getByRole('textbox', { name: /^Email$/i }), 'x@y.com')
    await userEvent.fill(
      ui.getByRole('textbox', { name: /LinkedIn profile URL/i }),
      'https://www.linkedin.com/in/x'
    )
    await userEvent.fill(ui.getByRole('textbox', { name: /^Phone number$/i }), '+1 555 123 4567')
    await userEvent.fill(ui.getByLabelText(/^Password$/i), '1234567')
    await userEvent.fill(ui.getByLabelText(/^Confirm Password$/i), '1234567')
    await userEvent.click(ui.getByRole('button', { name: /^Create Account$/i }))

    await vi.waitFor(() => expect(vi.mocked(toast.error)).toHaveBeenCalledWith('User already registered'))
    expect(navigate).not.toHaveBeenCalled()
  })
})
