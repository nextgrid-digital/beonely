import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'

const formSchema = z
  .object({
    password: z
      .string()
      .min(1, 'Please enter your password.')
      .min(7, 'Password must be at least 7 characters long.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export function ResetPasswordForm({
  className,
  ...props
}: React.HTMLAttributes<HTMLFormElement>) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [sessionState, setSessionState] = useState<
    'checking' | 'ready' | 'missing' | 'nocheck'
  >(() => (getSupabaseConfigured() ? 'checking' : 'nocheck'))

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!getSupabaseConfigured()) {
      return
    }
    const sb = getSupabaseBrowserClient()
    let cancelled = false
    let settled = false

    const markReady = () => {
      if (cancelled || settled) return
      settled = true
      setSessionState('ready')
    }

    const markMissing = () => {
      if (cancelled || settled) return
      settled = true
      setSessionState('missing')
    }

    const readSession = () => {
      void sb.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (session?.user) markReady()
      })
    }

    readSession()
    const retry = window.setTimeout(readSession, 400)

    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return
      if (session?.user) markReady()
    })

    const finalize = window.setTimeout(() => {
      void sb.auth.getSession().then(({ data: { session } }) => {
        if (cancelled) return
        if (session?.user) markReady()
        else markMissing()
      })
    }, 900)

    return () => {
      cancelled = true
      window.clearTimeout(retry)
      window.clearTimeout(finalize)
      subscription.unsubscribe()
    }
  }, [])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!getSupabaseConfigured()) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb.auth.updateUser({ password: data.password })
      if (error) {
        toast.error(error.message)
        return
      }
      await sb.auth.signOut()
      form.reset()
      toast.success('Password updated. Sign in with your new password.')
      await navigate({ to: '/sign-in', replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-2', className)}
        {...props}
      >
        {sessionState === 'missing' && getSupabaseConfigured() ? (
          <p className='text-sm text-muted-foreground' role='status'>
            This reset link is invalid or expired. Request a new link from{' '}
            <Link
              to='/forgot-password'
              className='font-medium text-foreground underline underline-offset-4 hover:text-primary'
            >
              Forgot password
            </Link>
            .
          </p>
        ) : null}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete='new-password'
                  placeholder='••••••••'
                  disabled={
                    sessionState === 'checking' || sessionState === 'missing'
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm password</FormLabel>
              <FormControl>
                <PasswordInput
                  autoComplete='new-password'
                  placeholder='••••••••'
                  disabled={
                    sessionState === 'checking' || sessionState === 'missing'
                  }
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          className='mt-2'
          disabled={
            isLoading ||
            sessionState === 'checking' ||
            sessionState === 'missing'
          }
        >
          Update password
          {isLoading ? <Loader2 className='animate-spin' /> : <Lock />}
        </Button>
      </form>
    </Form>
  )
}
