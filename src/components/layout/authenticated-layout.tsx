import { Outlet, useRouterState } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-provider'
import { AdminAppShell } from '@/features/admin/admin-app-shell'
import { StaffWorkspaceBanner } from '@/features/admin/staff-workspace-banner'
import { PublicSiteHeader } from '@/features/jobs/public-site-layout'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  if (isAdminRoute) {
    return (
      <SearchProvider>
        <AdminAppShell />
      </SearchProvider>
    )
  }

  return (
    <SearchProvider>
      <div
        className={cn(
          'flex min-h-svh w-full flex-col bg-background antialiased',
          '@container/content',
          'has-data-[layout=fixed]:h-svh'
        )}
      >
        <PublicSiteHeader />
        <StaffWorkspaceBanner />
        <div
          id='main-content'
          className='flex min-h-0 flex-1 flex-col pt-14'
          tabIndex={-1}
        >
          {children ?? <Outlet />}
        </div>
      </div>
    </SearchProvider>
  )
}
