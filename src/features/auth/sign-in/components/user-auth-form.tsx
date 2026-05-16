import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from '@tanstack/react-router'
import { Loader2, LogIn } from 'lucide-react'
import { toast } from 'sonner'
import { getPostAuthPath } from '@/lib/auth/post-auth-path'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'

const formSchema = z.object({
  email: z.email({
    error: (iss) => (iss.input === '' ? 'Please enter your email.' : undefined),
  }),
  password: z
    .string()
    .min(1, 'Please enter your password.')
    .min(7, 'Password must be at least 7 characters long.'),
})

interface UserAuthFormProps extends React.HTMLAttributes<HTMLFormElement> {
  redirectTo?: string
  /** When set, called after successful sign-in instead of navigating (modal flows). */
  onSuccess?: () => void | Promise<void>
  /** Prefill email (e.g. after sign-up tab asks user to confirm then sign in). */
  defaultEmail?: string
}

export function UserAuthForm({
  className,
  redirectTo,
  onSuccess,
  defaultEmail,
  ...props
}: UserAuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { refreshProfile } = useAuth()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  useEffect(() => {
    if (defaultEmail === undefined) return
    form.reset({ email: defaultEmail, password: '' })
  }, [defaultEmail, form])

  async function onSubmit(data: z.infer<typeof formSchema>) {
    if (!getSupabaseConfigured()) {
      toast.error('Supabase is not configured.')
      return
    }
    setIsLoading(true)
    try {
      const sb = getSupabaseBrowserClient()
      const { error } = await sb.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (error) {
        const raw = error.message
        const lower = raw.toLowerCase()
        if (lower.includes('email not confirmed')) {
          toast.error(
            'Confirm your email first. Open the link we sent you, then sign in with the same password.'
          )
        } else if (
          lower.includes('invalid login') ||
          lower.includes('invalid credentials')
        ) {
          toast.error(
            'Invalid email or password. If you just signed up, confirm your email from your inbox before signing in.'
          )
        } else {
          toast.error(raw)
        }
        return
      }
      toast.success('Welcome back')
      if (onSuccess) {
        await onSuccess()
        return
      }
      const profile = await refreshProfile()
      const dest =
        redirectTo && redirectTo.startsWith('/')
          ? redirectTo
          : getPostAuthPath(profile)
      void navigate({ to: dest, replace: true })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  placeholder='name@example.com'
                  autoComplete='email'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <div className='flex items-center justify-between gap-2'>
                <FormLabel>Password</FormLabel>
                <Link
                  to='/forgot-password'
                  className='text-xs font-medium text-muted-foreground underline-offset-4 hover:underline hover:opacity-75'
                >
                  Forgot password?
                </Link>
              </div>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='current-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button className='mt-2 min-h-11 w-full sm:min-h-10' disabled={isLoading}>
          {isLoading ? <Loader2 className='animate-spin' /> : <LogIn />}
          Sign in
        </Button>
      </form>
    </Form>
  )
}
