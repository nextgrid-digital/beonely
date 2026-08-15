import { useEffect } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateMarketingConsent } from '@/lib/email/marketing-opt-in'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { useAuth } from '@/context/auth-provider'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form'
import { Switch } from '@/components/ui/switch'

const notificationsFormSchema = z.object({
  marketing_emails: z.boolean(),
})

type NotificationsFormValues = z.infer<typeof notificationsFormSchema>

export function NotificationsForm() {
  const { user, profile, session } = useAuth()
  const queryClient = useQueryClient()
  const audience = profile?.role === 'candidate' ? 'candidate' : 'recruiter'
  const queryKey = ['marketing-preference', audience, user?.id] as const

  const preferenceQuery = useQuery({
    queryKey,
    enabled: Boolean(user?.id),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const table =
        audience === 'candidate' ? 'job_seeker_profiles' : 'recruiters'
      const { data, error } = await sb
        .from(table)
        .select('marketing_opt_in')
        .eq('user_id', user!.id)
        .maybeSingle()
      if (error) throw error
      return data?.marketing_opt_in === true
    },
  })

  const form = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsFormSchema),
    defaultValues: { marketing_emails: false },
  })

  useEffect(() => {
    if (preferenceQuery.data !== undefined) {
      form.reset({ marketing_emails: preferenceQuery.data })
    }
  }, [form, preferenceQuery.data])

  const saveMutation = useMutation({
    mutationFn: async (marketingOptIn: boolean) => {
      const accessToken = session?.access_token
      if (!accessToken) throw new Error('missing_access_token')
      await updateMarketingConsent({
        marketing_opt_in: marketingOptIn,
        audience,
        accessToken,
      })
    },
    onSuccess: (_data, marketingOptIn) => {
      queryClient.setQueryData(queryKey, marketingOptIn)
      form.reset({ marketing_emails: marketingOptIn })
      toast.success('Email preferences updated')
    },
    onError: () => toast.error('Could not update email preferences'),
  })

  if (preferenceQuery.isLoading) {
    return <Loader2 className='size-6 animate-spin text-muted-foreground' />
  }

  if (preferenceQuery.isError) {
    return (
      <Alert variant='destructive'>
        <AlertTitle>Could not load email preferences</AlertTitle>
        <AlertDescription className='mt-3 flex flex-wrap items-center gap-3'>
          Your current preference was not changed.
          <Button
            type='button'
            size='sm'
            variant='outline'
            onClick={() => void preferenceQuery.refetch()}
          >
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
          saveMutation.mutate(values.marketing_emails)
        )}
        className='space-y-6'
      >
        <div className='space-y-4'>
          <FormField
            control={form.control}
            name='marketing_emails'
            render={({ field }) => (
              <FormItem className='flex flex-row items-center justify-between gap-4 rounded-lg border p-4'>
                <div className='space-y-1'>
                  <FormLabel htmlFor='marketing-emails' className='text-base'>
                    Marketing emails
                  </FormLabel>
                  <FormDescription>
                    Receive relevant{' '}
                    {audience === 'candidate' ? 'job' : 'hiring'} and product
                    updates. You can opt out again at any time.
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    id='marketing-emails'
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={saveMutation.isPending}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <div className='flex flex-row items-center justify-between gap-4 rounded-lg border p-4'>
            <div className='space-y-1'>
              <p className='text-base font-medium'>
                Account and security emails
              </p>
              <p className='text-sm text-muted-foreground'>
                Required messages such as sign-in, receipts, applications, and
                account security are not marketing and remain enabled.
              </p>
            </div>
            <Switch checked disabled aria-label='Account emails are required' />
          </div>
        </div>

        <Button
          type='submit'
          disabled={saveMutation.isPending || !form.formState.isDirty}
        >
          {saveMutation.isPending ? <Loader2 className='animate-spin' /> : null}
          Save preferences
        </Button>
      </form>
    </Form>
  )
}
