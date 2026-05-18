import { useNavigate, useSearch } from '@tanstack/react-router'
import { toast } from 'sonner'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'
import { fetchSessionPersona } from '@/lib/auth/route-guards'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { AuthLayout } from '../auth-layout'
import { UserAuthForm } from '../sign-in/components/user-auth-form'

const DENIED_MESSAGES: Record<string, string> = {
  allowlist: 'Not authorized for staff access.',
  role: 'This account does not have staff admin access.',
}

export function StaffSignIn() {
  const { redirect, denied } = useSearch({ from: '/staff/sign-in' })
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  async function onStaffSignInSuccess() {
    if (!getSupabaseConfigured()) {
      toast.error('Supabase is not configured.')
      return
    }
    const sb = getSupabaseBrowserClient()
    const {
      data: { session },
    } = await sb.auth.getSession()
    const email = session?.user?.email ?? ''
    await refreshProfile()
    const persona = await fetchSessionPersona()

    if (!email || !isAllowlistedAdminEmail(email) || persona !== 'admin') {
      await sb.auth.signOut()
      toast.error('Not authorized for staff access.')
      return
    }

    const dest = redirect && redirect.startsWith('/') ? redirect : '/admin'
    void navigate({ to: dest, replace: true })
  }

  const deniedMessage = denied ? DENIED_MESSAGES[denied] : undefined

  return (
    <AuthLayout>
      <Card className='w-full gap-4'>
        <CardHeader>
          <CardTitle className='text-lg tracking-tight'>
            Staff sign in
          </CardTitle>
          <CardDescription>
            Internal use only. Your email must be on the staff allowlist and
            your account must have admin access in Beonely.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-3'>
          {deniedMessage ? (
            <p className='text-sm text-destructive' role='alert'>
              {deniedMessage}
            </p>
          ) : null}
          <UserAuthForm
            redirectTo={redirect}
            onSuccess={onStaffSignInSuccess}
          />
        </CardContent>
        <CardFooter>
          <p className='px-2 text-center text-sm text-muted-foreground sm:px-8'>
            Recruiter or candidate? Use the{' '}
            <a
              href='/sign-in'
              className='underline underline-offset-4 hover:text-primary'
            >
              public sign-in
            </a>
            .
          </p>
        </CardFooter>
      </Card>
    </AuthLayout>
  )
}
