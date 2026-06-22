import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from '@tanstack/react-router'
import { Turnstile } from '@marsidev/react-turnstile'
import { Loader2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import type { SignInIntent } from '@/lib/auth/sign-in-intent'
import { signUpAuthDataFields } from '@/lib/auth/user-account-type'
import {
  candidateLinkedInUrlSchema,
  candidatePhoneSchema,
} from '@/lib/candidate/profile-completion'
import { defaultResumeStructured } from '@/lib/candidate/resume-structured-schema'
import { dispatchLifecycleEmail } from '@/lib/email/admin-email-api'
import { updateMarketingConsent } from '@/lib/email/marketing-opt-in'
import { publicSiteOrigin } from '@/lib/site/site-origin'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  AuthDivider,
  GoogleSignInButton,
} from '@/features/auth/components/google-sign-in-button'
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

type CandidateSignUpFields = {
  linkedin_url: string
  phone: string
}

function buildSignUpFormSchema(intent: SignInIntent | undefined) {
  const base = z
    .object({
      email: z.email({
        error: (iss) =>
          iss.input === '' ? 'Please enter your email.' : undefined,
      }),
      password: z
        .string()
        .min(1, 'Please enter your password.')
        .min(7, 'Password must be at least 7 characters long.'),
      confirmPassword: z.string().min(1, 'Please confirm your password.'),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match.",
      path: ['confirmPassword'],
    })

  if (intent === 'candidate') {
    return base.extend({
      linkedin_url: candidateLinkedInUrlSchema,
      phone: candidatePhoneSchema,
    })
  }
  return base
}

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as
  | string
  | undefined

export type SignUpSuccessInfo = {
  email: string
  hasSession: boolean
}

interface SignUpFormProps extends React.HTMLAttributes<HTMLFormElement> {
  /** When set, invoked after successful sign-up instead of navigating away (e.g. modal). */
  onSuccess?: (info: SignUpSuccessInfo) => void | Promise<void>
  /** Persona entry point — forwarded to post-confirmation sign-in URL. */
  intent?: SignInIntent
}

async function persistCandidateJobSeekerRow(opts: {
  userId: string
  email: string
  linkedin_url: string
  phone: string
}): Promise<{ created: boolean }> {
  const sb = getSupabaseBrowserClient()
  const { data: existing, error: selErr } = await sb
    .from('job_seeker_profiles')
    .select('id')
    .eq('user_id', opts.userId)
    .maybeSingle()
  if (selErr) throw selErr
  const payload = {
    email: opts.email,
    linkedin_url: opts.linkedin_url,
    phone: opts.phone,
    resume_structured: defaultResumeStructured(),
    resume_source: 'user_edit' as const,
    notification_opt_in: true,
    marketing_opt_in: true,
    marketing_opt_in_at: new Date().toISOString(),
  }
  if (existing?.id) {
    const { error } = await sb
      .from('job_seeker_profiles')
      .update(payload)
      .eq('id', existing.id)
    if (error) throw error
    return { created: false }
  }
  const { error } = await sb.from('job_seeker_profiles').insert({
    ...payload,
    user_id: opts.userId,
  })
  if (error) throw error
  return { created: true }
}

type SignUpFormFields = {
  email: string
  password: string
  confirmPassword: string
  linkedin_url?: string
  phone?: string
}

export function SignUpForm({
  className,
  onSuccess,
  intent,
  ...props
}: SignUpFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const navigate = useNavigate()
  const schema = useMemo(() => buildSignUpFormSchema(intent), [intent])

  const defaultValues = useMemo(
    () => ({
      email: '',
      password: '',
      confirmPassword: '',
      ...(intent === 'candidate' ? { linkedin_url: '', phone: '' } : {}),
    }),
    [intent]
  )

  const form = useForm<SignUpFormFields>({
    resolver: zodResolver(schema) as Resolver<SignUpFormFields>,
    defaultValues: defaultValues as SignUpFormFields,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  async function onSubmit(data: SignUpFormFields) {
    if (!getSupabaseConfigured()) {
      toast.error('Supabase is not configured.')
      return
    }
    if (turnstileSiteKey && !turnstileToken) {
      toast.error('Complete the captcha.')
      return
    }
    setIsLoading(true)
    try {
      const sb = getSupabaseBrowserClient()
      const origin = publicSiteOrigin()
      const redirect = origin ? `${origin}/sign-in` : undefined

      let candidateMeta: CandidateSignUpFields | undefined
      if (intent === 'candidate') {
        const c = data as z.infer<typeof schema> & CandidateSignUpFields
        candidateMeta = {
          linkedin_url: c.linkedin_url.trim(),
          phone: c.phone.trim(),
        }
      }

      const { data: signUpData, error } = await sb.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: redirect,
          captchaToken: turnstileToken ?? undefined,
          data: {
            ...(candidateMeta ?? {}),
            ...signUpAuthDataFields(intent),
          },
        },
      })
      if (error) {
        toast.error(error.message)
        return
      }
      const email = signUpData.user?.email ?? data.email
      const hasSession = !!signUpData.session
      const uid = signUpData.user?.id

      if (intent === 'candidate' && uid && candidateMeta && hasSession) {
        try {
          const { created } = await persistCandidateJobSeekerRow({
            userId: uid,
            email,
            linkedin_url: candidateMeta.linkedin_url,
            phone: candidateMeta.phone,
          })
          const accessToken = signUpData.session?.access_token
          if (created && accessToken) {
            void dispatchLifecycleEmail(accessToken, {
              trigger_key: 'candidate_signup',
              payload: {
                name:
                  (
                    signUpData.user?.user_metadata?.full_name as
                      | string
                      | undefined
                  )?.trim() || email.split('@')[0],
              },
              dedupe_key: `candidate_signup:${uid}`,
            }).catch(() => undefined)
          }
          if (accessToken) {
            await updateMarketingConsent({
              marketing_opt_in: true,
              audience: 'candidate',
              accessToken,
            })
          }
        } catch {
          toast.error(
            'Account created but profile could not be saved. Update your profile in settings.'
          )
        }
      }

      if (
        intent === 'recruiter' &&
        hasSession &&
        signUpData.session?.access_token
      ) {
        try {
          await updateMarketingConsent({
            marketing_opt_in: true,
            audience: 'recruiter',
            accessToken: signUpData.session.access_token,
          })
        } catch {
          // Non-blocking; recruiter row may not exist yet
        }
      }

      const confirmFirstMessage =
        'Account created. Check your inbox and click the confirmation link before signing in with this email and password.'
      if (onSuccess) {
        toast.success(
          hasSession
            ? 'Account created. You are signed in.'
            : confirmFirstMessage
        )
        await onSuccess({ email, hasSession })
        return
      }
      toast.success(
        hasSession ? 'Account created. You are signed in.' : confirmFirstMessage
      )
      void navigate({
        to: '/sign-in',
        replace: true,
        search: intent ? { intent } : {},
      })
    } finally {
      setIsLoading(false)
    }
  }

  const showCandidateFields = intent === 'candidate'

  return (
    <Form {...form}>
      <form
        key={intent ?? 'default'}
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn('grid gap-3', className)}
        {...props}
      >
        <GoogleSignInButton intent={intent} />
        <AuthDivider label='or sign up with email' />
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
        {showCandidateFields ? (
          <>
            <FormField
              control={form.control}
              name='linkedin_url'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>LinkedIn profile URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='https://www.linkedin.com/in/…'
                      autoComplete='url'
                      inputMode='url'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='phone'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='+1 555 123 4567'
                      autoComplete='tel'
                      type='tel'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : null}
        <FormField
          control={form.control}
          name='password'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='new-password'
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
              <FormLabel>Confirm Password</FormLabel>
              <FormControl>
                <PasswordInput
                  placeholder='********'
                  autoComplete='new-password'
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {turnstileSiteKey ? (
          <div className='flex justify-center'>
            <Turnstile
              siteKey={turnstileSiteKey}
              onSuccess={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
            />
          </div>
        ) : null}
        <Button
          className='mt-2 min-h-11 w-full sm:min-h-10'
          disabled={isLoading}
        >
          {isLoading ? <Loader2 className='animate-spin' /> : <UserPlus />}
          Create Account
        </Button>
      </form>
    </Form>
  )
}
