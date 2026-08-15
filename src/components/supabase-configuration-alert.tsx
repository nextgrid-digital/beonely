import { TriangleAlert } from 'lucide-react'
import { getSupabaseConfigured } from '@/lib/supabase/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export function SupabaseConfigurationAlert() {
  if (getSupabaseConfigured()) return null

  return (
    <Alert
      className='fixed inset-x-0 bottom-0 z-[100] rounded-none border-x-0 border-b-0 border-amber-500/60 bg-amber-50 text-amber-950 shadow-lg dark:bg-amber-950 dark:text-amber-50 [&>svg]:text-amber-700 dark:[&>svg]:text-amber-300'
      aria-live='polite'
      aria-labelledby='supabase-configuration-alert-title'
    >
      <TriangleAlert aria-hidden />
      <AlertTitle id='supabase-configuration-alert-title'>
        Data service is not configured
      </AlertTitle>
      <AlertDescription className='text-amber-900/90 dark:text-amber-100/90'>
        This deployment is fail-closed. Job data, sign-in, applications,
        recruiter tools, and admin tools are unavailable until{' '}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>{' '}
        are configured and the deployment is rebuilt.
      </AlertDescription>
    </Alert>
  )
}
