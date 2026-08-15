import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { SignOutDialog } from './sign-out-dialog'

const navigate = vi.fn()
const signOut = vi.fn().mockResolvedValue(undefined)

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => ({ signOut }),
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
  }
})

async function renderDialog() {
  const queryClient = new QueryClient()
  const clear = vi.spyOn(queryClient, 'clear')
  const screen = await render(
    <QueryClientProvider client={queryClient}>
      <SignOutDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  )
  return { clear, screen }
}

describe('SignOutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls signOut and navigates to home', async () => {
    const { clear, screen } = await renderDialog()

    await userEvent.click(screen.getByRole('button', { name: /^Sign out$/i }))

    await vi.waitFor(() => expect(signOut).toHaveBeenCalledOnce())
    expect(clear).toHaveBeenCalledOnce()
    await vi.waitFor(() =>
      expect(navigate).toHaveBeenCalledWith({ to: '/', replace: true })
    )
  })

  it('does not call signOut or navigate when Cancel is clicked', async () => {
    const { clear, screen } = await renderDialog()

    await userEvent.click(screen.getByRole('button', { name: /^Cancel$/i }))

    expect(signOut).not.toHaveBeenCalled()
    expect(clear).not.toHaveBeenCalled()
    expect(navigate).not.toHaveBeenCalled()
  })
})
