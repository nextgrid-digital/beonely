import { Outlet } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { SearchProvider } from '@/context/search-provider'
import { PublicSiteHeader } from '@/features/jobs/public-site-layout'

type AuthenticatedLayoutProps = {
  children?: React.ReactNode
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
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
