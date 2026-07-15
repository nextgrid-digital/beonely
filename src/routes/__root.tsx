import { type QueryClient } from '@tanstack/react-query'
import {
  createRootRouteWithContext,
  Outlet,
  useRouterState,
} from '@tanstack/react-router'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { AdminWorkspaceProvider } from '@/context/admin-workspace-provider'
import { Toaster } from '@/components/ui/sonner'
import { SiteVentureAttribution } from '@/components/layout/site-venture-attribution'
import { NavigationProgress } from '@/components/navigation-progress'
import { SupabaseConfigurationAlert } from '@/components/supabase-configuration-alert'
import { GeneralError } from '@/features/errors/general-error'
import { NotFoundError } from '@/features/errors/not-found-error'
import { PublicSiteAuthProvider } from '@/features/jobs/public-site-auth-provider'

export const Route = createRootRouteWithContext<{
  queryClient: QueryClient
}>()({
  component: RootComponent,
  notFoundComponent: NotFoundError,
  errorComponent: GeneralError,
})

function RootComponent() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/')

  return (
    <AdminWorkspaceProvider>
      <NavigationProgress />
      <PublicSiteAuthProvider>
        <Outlet />
      </PublicSiteAuthProvider>
      <SupabaseConfigurationAlert />
      {!isAdminRoute ? <SiteVentureAttribution /> : null}
      <Toaster duration={5000} />
      {import.meta.env.MODE === 'development' && (
        <>
          <ReactQueryDevtools buttonPosition='bottom-left' />
          <TanStackRouterDevtools position='bottom-right' />
        </>
      )}
    </AdminWorkspaceProvider>
  )
}
