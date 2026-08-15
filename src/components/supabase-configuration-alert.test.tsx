import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { SupabaseConfigurationAlert } from './supabase-configuration-alert'

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseConfigured: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseConfigured: supabaseMocks.getSupabaseConfigured,
}))

describe('SupabaseConfigurationAlert', () => {
  beforeEach(() => {
    supabaseMocks.getSupabaseConfigured.mockReset()
  })

  it('shows a persistent fail-closed warning when configuration is absent', async () => {
    supabaseMocks.getSupabaseConfigured.mockReturnValue(false)
    const screen = await render(<SupabaseConfigurationAlert />)

    await expect
      .element(
        screen.getByRole('alert', { name: 'Data service is not configured' })
      )
      .toBeVisible()
    await expect
      .element(screen.getByText(/This deployment is fail-closed/i))
      .toBeVisible()
  })

  it('renders nothing when configuration is complete', async () => {
    supabaseMocks.getSupabaseConfigured.mockReturnValue(true)
    const screen = await render(<SupabaseConfigurationAlert />)

    expect(screen.container.childElementCount).toBe(0)
  })
})
