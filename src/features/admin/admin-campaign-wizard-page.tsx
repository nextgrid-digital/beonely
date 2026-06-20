import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { ChevronLeft, ChevronRight, Send } from 'lucide-react'
import { toast } from 'sonner'
import {
  createAdminCampaign,
  fetchCampaignStats,
  fetchEmailTemplates,
  sendAdminCampaign,
  updateAdminCampaign,
  type EmailTemplateRow,
} from '@/lib/email/admin-email-api'
import { renderEmailTemplatePreview } from '@/lib/email/render-email-template'
import type { Database } from '@/lib/supabase/database.types'
import { cn } from '@/lib/utils'
import { useAuth } from '@/context/auth-provider'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmailBodyRichTextField } from '@/features/admin/email-body-rich-text-field'

type CampaignAudience = Database['public']['Enums']['campaign_audience']

const STEPS = ['Audience', 'Template', 'Compose', 'Review', 'Send'] as const

const AUDIENCE_OPTIONS: {
  value: CampaignAudience
  label: string
  description: string
  countKey: keyof {
    candidates: number
    recruiters: number
    newsletter: number
    all_marketing: number
  }
}[] = [
  {
    value: 'candidates',
    label: 'Candidates',
    description: 'Job seekers who opted in to marketing email',
    countKey: 'candidates',
  },
  {
    value: 'recruiters',
    label: 'Recruiters',
    description: 'Recruiters who opted in to hiring updates',
    countKey: 'recruiters',
  },
  {
    value: 'newsletter',
    label: 'Newsletter',
    description: 'Footer and newsletter subscribers',
    countKey: 'newsletter',
  },
  {
    value: 'all_marketing',
    label: 'All marketing',
    description: 'Combined opted-in audiences (deduped)',
    countKey: 'all_marketing',
  },
]

const TEMPLATE_AUDIENCE_FOR_CAMPAIGN: Partial<
  Record<CampaignAudience, EmailTemplateRow['audience']>
> = {
  candidates: 'candidates',
  recruiters: 'recruiters',
  newsletter: 'newsletter',
}

export function AdminCampaignWizardPage({
  initialTemplateId,
  initialAudience,
  campaignId,
}: {
  initialTemplateId?: string
  initialAudience?: CampaignAudience
  campaignId?: string
}) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const token = session?.access_token
  const qc = useQueryClient()

  const [step, setStep] = useState(0)
  const [audience, setAudience] = useState<CampaignAudience>(
    initialAudience ?? 'candidates'
  )
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    initialTemplateId ?? null
  )
  const [subject, setSubject] = useState<string | null>(null)
  const [previewText, setPreviewText] = useState<string | null>(null)
  const [body, setBody] = useState<string | null>(null)
  const [advancedHtml, setAdvancedHtml] = useState(false)
  const [confirmedOptIn, setConfirmedOptIn] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [confirmSendOpen, setConfirmSendOpen] = useState(false)
  const [savedCampaignId, setSavedCampaignId] = useState<string | null>(
    campaignId ?? null
  )

  const statsQuery = useQuery({
    queryKey: ['admin-campaign-stats', token],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignStats(token!),
  })

  const templatesQuery = useQuery({
    queryKey: ['admin-email-templates', token],
    enabled: Boolean(token),
    queryFn: () => fetchEmailTemplates(token!),
  })

  const marketingTemplates = useMemo(() => {
    const tplAudience = TEMPLATE_AUDIENCE_FOR_CAMPAIGN[audience]
    return (templatesQuery.data ?? []).filter(
      (t) =>
        t.category === 'marketing' &&
        (tplAudience ? t.audience === tplAudience : true)
    )
  }, [templatesQuery.data, audience])

  const selectedTemplate = useMemo(() => {
    return (
      (templatesQuery.data ?? []).find((t) => t.id === selectedTemplateId) ??
      null
    )
  }, [templatesQuery.data, selectedTemplateId])

  const subjectValue = subject ?? selectedTemplate?.subject ?? ''
  const previewTextValue = previewText ?? selectedTemplate?.preview_text ?? ''
  const bodyValue =
    body ?? selectedTemplate?.body_html ?? '<p>Hello from Beonely.</p>'

  const previewHtml = useMemo(
    () =>
      renderEmailTemplatePreview({
        shell: 'marketing',
        subject: subjectValue,
        preview_text: previewTextValue,
        body_html: bodyValue,
      }),
    [subjectValue, previewTextValue, bodyValue]
  )

  const recipientCount = useMemo(() => {
    const m = statsQuery.data?.marketing
    if (!m) return null
    const opt = AUDIENCE_OPTIONS.find((o) => o.value === audience)
    if (!opt) return null
    return m[opt.countKey]
  }, [statsQuery.data, audience])

  const applyTemplate = (t: EmailTemplateRow) => {
    setSelectedTemplateId(t.id)
    setSubject(t.subject)
    setPreviewText(t.preview_text ?? '')
    setBody(t.body_html)
  }

  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('no_token')
      if (savedCampaignId) {
        return updateAdminCampaign(token, {
          id: savedCampaignId,
          subject: subjectValue,
          preview_text: previewTextValue || null,
          body: bodyValue,
          audience,
          template_id: selectedTemplateId,
        })
      }
      return createAdminCampaign(token, {
        subject: subjectValue,
        preview_text: previewTextValue || null,
        body: bodyValue,
        audience,
        template_id: selectedTemplateId,
      })
    },
    onSuccess: (campaign) => {
      setSavedCampaignId(campaign.id)
      void qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
    },
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      let id = savedCampaignId
      if (!id) {
        const created = await saveDraftMutation.mutateAsync()
        id = created.id
        setSavedCampaignId(id)
      }
      let cursor: number | undefined
      let done = false
      while (!done) {
        const progress = await sendAdminCampaign(token!, {
          campaign_id: id!,
          cursor,
        })
        done = progress.done
        cursor = progress.next_cursor ?? undefined
      }
    },
    onSuccess: () => {
      toast.success('Campaign sent')
      void qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void navigate({ to: '/admin/email/campaigns' })
    },
    onError: () => toast.error('Send failed'),
  })

  const testSendMutation = useMutation({
    mutationFn: async () => {
      let id = savedCampaignId
      if (!id) {
        const created = await saveDraftMutation.mutateAsync()
        id = created.id
        setSavedCampaignId(id)
      }
      const to = testEmail.trim()
      if (!to) throw new Error('Enter a test email')
      return sendAdminCampaign(token!, {
        campaign_id: id!,
        test_email: to,
      })
    },
    onSuccess: () => toast.success('Test email sent'),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Test send failed'),
  })

  const canNext = () => {
    if (step === 0) return Boolean(audience)
    if (step === 2) return subjectValue.trim() && bodyValue.trim()
    if (step === 3) return confirmedOptIn
    return true
  }

  return (
    <div className='mx-auto max-w-3xl space-y-6'>
      <div className='flex items-center gap-3'>
        <Button type='button' variant='ghost' size='sm' asChild>
          <Link to='/admin/email/campaigns'>← Campaigns</Link>
        </Button>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>
            New campaign
          </h1>
          <p className='text-sm text-muted-foreground'>
            Step {step + 1} of {STEPS.length}: {STEPS[step]}
          </p>
        </div>
      </div>

      <div className='flex gap-1'>
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={cn(
              'h-1 flex-1 rounded-full',
              i <= step ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {step === 0 ? (
        <div className='grid gap-3 sm:grid-cols-2'>
          {AUDIENCE_OPTIONS.map((opt) => (
            <Card
              key={opt.value}
              className={cn(
                'cursor-pointer transition-colors hover:border-primary/50',
                audience === opt.value && 'border-primary ring-1 ring-primary'
              )}
              onClick={() => setAudience(opt.value)}
            >
              <CardHeader className='pb-2'>
                <CardTitle className='text-base'>{opt.label}</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2 text-sm text-muted-foreground'>
                <p>{opt.description}</p>
                {statsQuery.data ? (
                  <Badge variant='secondary'>
                    ~{statsQuery.data.marketing[opt.countKey]} recipients
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {step === 1 ? (
        <div className='space-y-3'>
          <Button
            type='button'
            variant='outline'
            className='w-full justify-start'
            onClick={() => {
              setSelectedTemplateId(null)
              setSubject('')
              setPreviewText('')
              setBody('<p>Hello from Beonely.</p>')
              setStep(2)
            }}
          >
            Start blank
          </Button>
          <div className='grid gap-3 sm:grid-cols-2'>
            {marketingTemplates.map((t) => (
              <Card
                key={t.id}
                className={cn(
                  'cursor-pointer hover:border-primary/50',
                  selectedTemplateId === t.id && 'border-primary'
                )}
                onClick={() => {
                  applyTemplate(t)
                  setStep(2)
                }}
              >
                <CardHeader className='pb-2'>
                  <CardTitle className='text-sm font-medium'>
                    {t.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className='text-xs text-muted-foreground'>
                  {t.subject}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='camp-subject'>Subject</Label>
            <Input
              id='camp-subject'
              value={subjectValue}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='camp-preview'>Preview text</Label>
            <Input
              id='camp-preview'
              value={previewTextValue}
              onChange={(e) => setPreviewText(e.target.value)}
            />
          </div>
          {!advancedHtml ? (
            <EmailBodyRichTextField value={bodyValue} onChange={setBody} />
          ) : (
            <textarea
              className='min-h-[12rem] w-full rounded-md border border-border bg-background p-3 font-mono text-xs'
              value={bodyValue}
              onChange={(e) => setBody(e.target.value)}
            />
          )}
          <Collapsible open={advancedHtml} onOpenChange={setAdvancedHtml}>
            <CollapsibleTrigger asChild>
              <Button type='button' variant='ghost' size='sm'>
                Advanced: edit HTML
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className='pt-2' />
          </Collapsible>
          <iframe
            title='Campaign preview'
            srcDoc={previewHtml}
            className='h-[320px] w-full rounded-md border border-border bg-white'
            sandbox=''
          />
        </div>
      ) : null}

      {step === 3 ? (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>Review before sending</CardTitle>
          </CardHeader>
          <CardContent className='space-y-4 text-sm'>
            <dl className='grid gap-2'>
              <div className='flex justify-between gap-4'>
                <dt className='text-muted-foreground'>Audience</dt>
                <dd className='font-medium'>
                  {AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label}
                </dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='text-muted-foreground'>Recipients (approx.)</dt>
                <dd className='font-medium tabular-nums'>
                  {recipientCount ?? '—'}
                </dd>
              </div>
              <div className='flex justify-between gap-4'>
                <dt className='text-muted-foreground'>Subject</dt>
                <dd className='max-w-[60%] truncate text-end font-medium'>
                  {subjectValue}
                </dd>
              </div>
            </dl>
            <label className='flex items-start gap-2'>
              <Checkbox
                checked={confirmedOptIn}
                onCheckedChange={(v) => setConfirmedOptIn(v === true)}
              />
              <span>
                I confirm this audience consists of users who opted in to
                marketing email from Beonely.
              </span>
            </label>
          </CardContent>
        </Card>
      ) : null}

      {step === 4 ? (
        <div className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='wizard-test-email'>Test email</Label>
            <Input
              id='wizard-test-email'
              type='email'
              placeholder='you@example.com'
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
            />
            <Button
              type='button'
              variant='outline'
              disabled={testSendMutation.isPending}
              onClick={() => testSendMutation.mutate()}
            >
              Send test
            </Button>
          </div>
          <Button
            type='button'
            className='w-full'
            disabled={sendMutation.isPending}
            onClick={() => setConfirmSendOpen(true)}
          >
            <Send className='size-4' />
            Send campaign
          </Button>
        </div>
      ) : null}

      <div className='flex justify-between'>
        <Button
          type='button'
          variant='outline'
          disabled={step === 0}
          onClick={() => setStep((s) => Math.max(0, s - 1))}
        >
          <ChevronLeft className='size-4' />
          Back
        </Button>
        {step < STEPS.length - 1 ? (
          <Button
            type='button'
            disabled={!canNext()}
            onClick={() => setStep((s) => s + 1)}
          >
            Next
            <ChevronRight className='size-4' />
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmSendOpen} onOpenChange={setConfirmSendOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will email approximately {recipientCount ?? 'unknown'}{' '}
              recipients in the{' '}
              {AUDIENCE_OPTIONS.find((o) => o.value === audience)?.label}{' '}
              audience with subject “{subjectValue}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmSendOpen(false)
                sendMutation.mutate()
              }}
            >
              Send now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
