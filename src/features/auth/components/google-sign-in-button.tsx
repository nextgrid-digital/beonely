import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { signInWithGoogle } from '@/lib/auth/oauth'
import type { SignInIntent } from '@/lib/auth/sign-in-intent'
import { getSupabaseConfigured } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox='0 0 18 18'
      aria-hidden='true'
      focusable='false'
    >
      <path
        fill='#4285F4'
        d='M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z'
      />
      <path
        fill='#34A853'
        d='M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z'
      />
      <path
        fill='#FBBC05'
        d='M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z'
      />
      <path
        fill='#EA4335'
        d='M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z'
      />
    </svg>
  )
}

export type GoogleSignInButtonProps = {
  intent?: SignInIntent
  redirect?: string
  label?: string
  className?: string
}

export function GoogleSignInButton({
  intent,
  redirect,
  label = 'Continue with Google',
  className,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const configured = getSupabaseConfigured()

  async function handleClick() {
    if (!configured) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    const fallbackRedirect =
      redirect ??
      (typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : undefined)
    const { error } = await signInWithGoogle({
      intent,
      redirect: fallbackRedirect,
    })
    if (error) {
      toast.error(error)
      setIsLoading(false)
    }
    // On success the browser redirects to Google; no need to reset loading.
  }

  return (
    <Button
      type='button'
      variant='outline'
      className={cn('min-h-11 w-full sm:min-h-10', className)}
      onClick={handleClick}
      disabled={isLoading || !configured}
    >
      {isLoading ? (
        <Loader2 className='animate-spin' />
      ) : (
        <GoogleLogo className='size-4' />
      )}
      {label}
    </Button>
  )
}

export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className='flex items-center gap-3'>
      <span className='h-px flex-1 bg-border' />
      <span className='text-xs text-muted-foreground'>{label}</span>
      <span className='h-px flex-1 bg-border' />
    </div>
  )
}
