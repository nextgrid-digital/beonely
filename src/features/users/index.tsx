import { getRouteApi } from '@tanstack/react-router'
import { AlertCircle, Loader2 } from 'lucide-react'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AdminProfilesTable } from './components/admin-profiles-table'
import { useAdminProfiles } from './hooks/use-admin-profiles'

const route = getRouteApi('/_authenticated/users/')

export function Users () {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const query = useAdminProfiles()

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div>
          <h2 className='text-2xl font-bold tracking-tight'>Users</h2>
          <p className='text-muted-foreground'>
            Recruiter accounts from Supabase (<code className='text-xs'>recruiters</code>
            ). Read-only in this version.
          </p>
        </div>

        {query.isLoading && (
          <div className='flex justify-center py-12'>
            <Loader2 className='size-8 animate-spin text-muted-foreground' />
          </div>
        )}

        {query.isError && (
          <Alert variant='destructive'>
            <AlertCircle className='size-4' />
            <AlertTitle>Could not load recruiters</AlertTitle>
            <AlertDescription>
              {(query.error as Error)?.message ?? 'Unknown error'}
            </AlertDescription>
          </Alert>
        )}

        {query.data && (
          <AdminProfilesTable
            data={query.data}
            search={search}
            navigate={navigate}
          />
        )}
      </Main>
    </>
  )
}
