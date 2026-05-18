import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { testSendEmail } from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const TRIGGERS = [
  { value: 'candidate_signup', label: 'Candidate signup' },
  { value: 'recruiter_signup', label: 'Recruiter signup' },
  { value: 'job_submitted', label: 'Job submitted' },
  { value: 'job_approved', label: 'Job approved' },
  { value: 'job_rejected', label: 'Job rejected' },
  { value: 'application_received', label: 'Application received' },
  { value: 'application_confirmation', label: 'Application confirmation' },
]

export function AdminEmailTestPage() {
  const { session, user } = useAuth()
  const token = session?.access_token
  const [email, setEmail] = useState(user?.email ?? '')
  const [trigger, setTrigger] = useState(TRIGGERS[0].value)

  const send = useMutation({
    mutationFn: () =>
      testSendEmail(token!, {
        to: email.trim(),
        trigger_key: trigger,
      }),
    onSuccess: (data) => {
      if (data.sent) {
        toast.success('Test email sent — check your inbox.')
        return
      }
      if (data.reason === 'resend_not_configured') {
        toast.warning(
          data.hint ??
            'Resend is not configured on the API. Set RESEND_API_KEY and RESEND_FROM_EMAIL, then use pnpm dev:local.'
        )
        return
      }
      if (data.reason === 'automation_disabled') {
        toast.warning(
          'That automation is turned off in Admin → Email → Automations.'
        )
        return
      }
      toast.message('Send skipped', {
        description: data.reason ?? 'No email was dispatched.',
      })
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Send failed')
    },
  })

  return (
    <div className='mx-auto max-w-lg space-y-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Test send</h1>
        <p className='text-sm text-muted-foreground'>
          Send a sample transactional email to any inbox. Requires Resend env on
          the API.
        </p>
      </div>
      <div className='space-y-4 rounded-lg border border-border p-4'>
        <div className='space-y-2'>
          <Label htmlFor='test-email'>Recipient</Label>
          <Input
            id='test-email'
            type='email'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label>Template</Label>
          <Select value={trigger} onValueChange={setTrigger}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TRIGGERS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type='button'
          disabled={!email.trim() || send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? <Loader2 className='size-4 animate-spin' /> : null}
          Send test
        </Button>
      </div>
    </div>
  )
}
