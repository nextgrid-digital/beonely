import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/context/auth-provider'
import type { Database } from '@/lib/supabase/database.types'
import {
  createAdminCampaign,
  fetchAdminCampaigns,
  fetchCampaignStats,
  sendAdminCampaign,
} from '@/lib/email/admin-email-api'
import { Badge } from '@/components/ui/badge'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type CampaignAudience = Database['public']['Enums']['campaign_audience']

const AUDIENCE_OPTIONS: { value: CampaignAudience; label: string }[] = [
  { value: 'candidates', label: 'Candidates (opted in)' },
  { value: 'recruiters', label: 'Recruiters (opted in)' },
  { value: 'newsletter', label: 'Newsletter subscribers' },
  { value: 'all_marketing', label: 'All marketing (deduped)' },
]

export function AdminCampaignsPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const qc = useQueryClient()

  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [body, setBody] = useState('<p>Hello from Beonely.</p>')
  const [audience, setAudience] = useState<CampaignAudience>('candidates')
  const [testEmail, setTestEmail] = useState('')

  const statsQuery = useQuery({
    queryKey: ['admin-campaign-stats'],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignStats(token!),
  })

  const campaignsQuery = useQuery({
    queryKey: ['admin-campaigns'],
    enabled: Boolean(token),
    queryFn: () => fetchAdminCampaigns(token!),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      createAdminCampaign(token!, {
        subject,
        preview_text: previewText || null,
        body,
        audience,
      }),
    onSuccess: () => {
      toast.success('Campaign saved as draft')
      void qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
    },
    onError: () => toast.error('Could not save campaign'),
  })

  const sendMutation = useMutation({
    mutationFn: async (campaignId: string) => {
      let cursor: number | undefined
      let done = false
      while (!done) {
        const progress = await sendAdminCampaign(token!, {
          campaign_id: campaignId,
          cursor,
        })
        done = progress.done
        cursor = progress.next_cursor ?? undefined
        if (!done && progress.next_cursor != null) {
          cursor = progress.next_cursor
        }
      }
    },
    onSuccess: () => {
      toast.success('Campaign send finished')
      void qc.invalidateQueries({ queryKey: ['admin-campaigns'] })
      void qc.invalidateQueries({ queryKey: ['admin-campaign-stats'] })
    },
    onError: () => toast.error('Send failed'),
  })

  const testSendMutation = useMutation({
    mutationFn: (campaignId: string) => {
      const to = testEmail.trim()
      if (!to) throw new Error('Enter a test email address')
      return sendAdminCampaign(token!, {
        campaign_id: campaignId,
        test_email: to,
      })
    },
    onSuccess: () => toast.success('Test email sent'),
    onError: (e) =>
      toast.error(e instanceof Error ? e.message : 'Test send failed'),
  })

  const marketing = statsQuery.data?.marketing

  return (
    <div className='space-y-6 py-6'>
      <div>
        <h1 className='text-2xl font-semibold tracking-tight'>Campaigns</h1>
        <p className='text-sm text-muted-foreground'>
          Marketing emails via Resend — separate audiences for candidates and
          recruiters.
        </p>
      </div>

      {marketing ? (
        <div className='flex flex-wrap gap-2 text-sm'>
          <Badge variant='secondary'>Candidates: {marketing.candidates}</Badge>
          <Badge variant='secondary'>Recruiters: {marketing.recruiters}</Badge>
          <Badge variant='secondary'>Newsletter: {marketing.newsletter}</Badge>
          <Badge variant='outline'>
            All marketing: {marketing.all_marketing}
          </Badge>
        </div>
      ) : null}

      <section className='max-w-2xl space-y-4 rounded-lg border border-border p-4'>
        <h2 className='text-lg font-medium'>New campaign</h2>
        <div className='space-y-2'>
          <Label htmlFor='campaign-subject'>Subject</Label>
          <Input
            id='campaign-subject'
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label htmlFor='campaign-preview'>Preview text</Label>
          <Input
            id='campaign-preview'
            value={previewText}
            onChange={(e) => setPreviewText(e.target.value)}
          />
        </div>
        <div className='space-y-2'>
          <Label>Audience</Label>
          <Select
            value={audience}
            onValueChange={(v) => setAudience(v as CampaignAudience)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIENCE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className='space-y-2'>
          <Label htmlFor='campaign-body'>HTML body</Label>
          <Textarea
            id='campaign-body'
            rows={8}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className='font-mono text-xs'
          />
        </div>
        <Button
          type='button'
          disabled={!subject.trim() || !body.trim() || createMutation.isPending}
          onClick={() => createMutation.mutate()}
        >
          {createMutation.isPending ? (
            <Loader2 className='size-4 animate-spin' />
          ) : null}
          Save draft
        </Button>
      </section>

      <div className='max-w-md space-y-2'>
        <Label htmlFor='campaign-test-email'>Test send recipient</Label>
        <Input
          id='campaign-test-email'
          type='email'
          placeholder='you@example.com'
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
        />
        <p className='text-xs text-muted-foreground'>
          Used when you click Test on a draft campaign. Does not mark the
          campaign as sent.
        </p>
      </div>

      <section className='space-y-3'>
        <h2 className='text-lg font-medium'>Campaign history</h2>
        {campaignsQuery.isLoading ? (
          <p className='text-sm text-muted-foreground'>Loading…</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Audience</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className='text-end'>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(campaignsQuery.data ?? []).map((c) => (
                <TableRow key={c.id}>
                  <TableCell className='font-medium'>
                    <Link
                      to='/admin/email/campaigns/$campaignId'
                      params={{ campaignId: c.id }}
                      className='hover:underline'
                    >
                      {c.subject}
                    </Link>
                  </TableCell>
                  <TableCell>{c.audience}</TableCell>
                  <TableCell>
                    <Badge variant='outline'>{c.status}</Badge>
                  </TableCell>
                  <TableCell className='text-end'>
                    <div className='flex justify-end gap-2'>
                      <Button
                        size='sm'
                        variant='outline'
                        disabled={testSendMutation.isPending}
                        onClick={() => testSendMutation.mutate(c.id)}
                      >
                        Test
                      </Button>
                      <Button
                        size='sm'
                        disabled={
                          c.status === 'sent' ||
                          c.status === 'sending' ||
                          sendMutation.isPending
                        }
                        onClick={() => sendMutation.mutate(c.id)}
                      >
                        <Send className='size-4' />
                        Send
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  )
}
