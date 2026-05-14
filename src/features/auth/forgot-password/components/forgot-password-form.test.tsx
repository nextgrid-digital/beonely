import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, type RenderResult } from 'vitest-browser-react'
import { userEvent, type Locator } from 'vitest/browser'
import { ForgotPasswordForm } from './forgot-password-form'

const resetPasswordForEmail = vi.fn().mockResolvedValue({ error: null })

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: () => true,
  getSupabaseBrowserClient: () => ({
    auth: { resetPasswordForEmail },
  }),
}))

describe('ForgotPasswordForm', () => {
  let screen: RenderResult
  let emailInput: Locator
  let continueButton: Locator

  beforeEach(async () => {
    vi.clearAllMocks()

    screen = await render(<ForgotPasswordForm />)
    emailInput = screen.getByRole('textbox', { name: /^Email$/i })
    continueButton = screen.getByRole('button', { name: /^Continue$/i })
  })

  it('renders email field and continue button', async () => {
    await expect.element(emailInput).toBeInTheDocument()
    await expect.element(continueButton).toBeInTheDocument()
  })

  it('shows validation when submitting empty form', async () => {
    await userEvent.click(continueButton)
    await expect
      .element(screen.getByText(/^Please enter your email\.$/i))
      .toBeInTheDocument()
  })

  it('calls Supabase reset and clears the form', async () => {
    await userEvent.fill(emailInput, 'a@b.com')
    await userEvent.click(continueButton)

    await vi.waitFor(() => expect(resetPasswordForEmail).toHaveBeenCalledOnce())
    expect(resetPasswordForEmail).toHaveBeenCalledWith(
      'a@b.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/sign-in'),
      })
    )

    await expect.element(emailInput).toHaveValue('')
  })
})
