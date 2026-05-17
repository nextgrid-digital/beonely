import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'

vi.mock('@/features/jobs/public-site-layout', () => ({
  PublicSiteHeader: () => null,
}))

vi.mock('@/features/admin/staff-workspace-banner', () => ({
  StaffWorkspaceBanner: () => null,
}))

vi.mock('@tanstack/react-router', () => ({
  Outlet: () => <div data-testid='outlet' />,
  useRouterState: (opts: {
    select: (s: { location: { pathname: string } }) => unknown
  }) => opts.select({ location: { pathname: '/admin' } }),
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock('@/context/search-provider', () => ({
  SearchProvider: ({ children }: { children: React.ReactNode }) => children,
}))

vi.mock('@/components/command-menu', () => ({
  CommandMenu: () => null,
}))

vi.mock('@/context/auth-provider', () => ({
  useAuth: () => ({
    user: { email: 'admin@beonely.com' },
    profile: {
      id: 'u1',
      email: 'admin@beonely.com',
      role: 'admin',
      created_at: '',
      updated_at: '',
      recruiter_row_id: 'r1',
    },
    signOut: vi.fn(),
  }),
}))

vi.mock('@/context/admin-workspace-provider', () => ({
  useAdminWorkspace: () => ({
    workspace: 'admin',
    isStaffAdmin: true,
    setWorkspace: vi.fn(),
  }),
}))

vi.mock('@/features/admin/admin-app-shell', () => ({
  AdminAppShell: () => <div data-testid='admin-shell'>Admin</div>,
}))

import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

describe('AuthenticatedLayout', () => {
  it('renders admin shell on /admin without PublicSiteAuthProvider throw', async () => {
    const screen = await render(<AuthenticatedLayout />)
    await expect.element(screen.getByTestId('admin-shell')).toBeInTheDocument()
  })
})
