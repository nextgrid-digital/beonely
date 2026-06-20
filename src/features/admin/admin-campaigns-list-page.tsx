import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, Plus } from 'lucide-react'
import {
  fetchAdminCampaigns,
  fetchCampaignStats,
} from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { PeekPanel } from '@/components/peek/peek-panel'
import { AdminCampaignDetailPage } from '@/features/admin/admin-campaign-detail-page'

type CampaignsTab = 'all' | 'draft' | 'sending' | 'sent' | 'failed'

function campaignStatusPill(status: string): InboxPillItem {
  switch (status) {
    case 'sent':
      return { label: 'Sent', variant: 'success' }
    case 'sending':
      return { label: 'Sending', variant: 'info' }
    case 'failed':
      return { label: 'Failed', variant: 'danger' }
    case 'draft':
    default:
      return { label: 'Draft', variant: 'muted' }
  }
}

export function AdminCampaignsListPage() {
  const { session } = useAuth()
  const token = session?.access_token
  const [peekCampaign, setPeekCampaign] = useState<{
    id: string
    subject: string
  } | null>(null)
  const [tab, setTab] = useState<CampaignsTab>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const statsQuery = useQuery({
    queryKey: ['admin-campaign-stats', token],
    enabled: Boolean(token),
    queryFn: () => fetchCampaignStats(token!),
  })

  const campaignsQuery = useQuery({
    queryKey: ['admin-campaigns', token],
    enabled: Boolean(token),
    queryFn: () => fetchAdminCampaigns(token!),
  })

  const marketing = statsQuery.data?.marketing
  const campaigns = campaignsQuery.data ?? []
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const rows: InboxRowData[] = campaigns
    .filter((c) => (tab === 'all' ? true : c.status === tab))
    .filter((c) =>
      normalizedQuery
        ? `${c.subject} ${c.audience}`.toLowerCase().includes(normalizedQuery)
        : true
    )
    .map((c) => ({
      id: c.id,
      title: c.subject,
      preview: c.audience,
      pills: [campaignStatusPill(c.status)],
      timestamp: c.created_at,
    }))

  const countByStatus = (status: CampaignsTab) =>
    campaigns.filter((c) => c.status === status).length

  const tabPills = [
    { id: 'all' as const, label: 'All', count: campaigns.length },
    { id: 'draft' as const, label: 'Draft', count: countByStatus('draft') },
    {
      id: 'sending' as const,
      label: 'Sending',
      count: countByStatus('sending'),
    },
    { id: 'sent' as const, label: 'Sent', count: countByStatus('sent') },
    { id: 'failed' as const, label: 'Failed', count: countByStatus('failed') },
  ]

  return (
    <div className='space-y-4 py-6'>
      {marketing ? (
        <div className='flex flex-wrap gap-2 px-4 text-sm'>
          <Badge variant='secondary'>Candidates: {marketing.candidates}</Badge>
          <Badge variant='secondary'>Recruiters: {marketing.recruiters}</Badge>
          <Badge variant='secondary'>Newsletter: {marketing.newsletter}</Badge>
          <Badge variant='outline'>
            All marketing: {marketing.all_marketing}
          </Badge>
        </div>
      ) : null}

      <InboxList<CampaignsTab>
        className='h-auto'
        title='Campaigns'
        titleActions={
          <Button type='button' asChild size='sm'>
            <Link to='/admin/email/campaigns/new'>
              <Plus className='size-4' />
              New campaign
            </Link>
          </Button>
        }
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search campaigns...'
        pills={tabPills}
        activeFilter={tab}
        onFilterChange={setTab}
        layoutId='admin-campaigns'
        rows={rows}
        selectedId={peekCampaign?.id ?? null}
        onSelect={(id) => {
          const next = campaigns.find((c) => c.id === id)
          if (next) setPeekCampaign({ id: next.id, subject: next.subject })
        }}
        loading={campaignsQuery.isLoading}
        emptyMessage='No campaigns in this view.'
      />

      <PeekPanel
        open={Boolean(peekCampaign)}
        onOpenChange={(open) => {
          if (!open) setPeekCampaign(null)
        }}
        title={peekCampaign?.subject ?? 'Campaign'}
        headerActions={
          peekCampaign ? (
            <Button asChild variant='ghost' size='sm' className='gap-1.5'>
              <Link
                to='/admin/email/campaigns/$campaignId'
                params={{ campaignId: peekCampaign.id }}
              >
                Open full page
                <ArrowUpRight className='size-4' />
              </Link>
            </Button>
          ) : null
        }
        bodyClassName='px-4 py-5 sm:px-6'
      >
        {peekCampaign ? (
          <AdminCampaignDetailPage campaignId={peekCampaign.id} />
        ) : null}
      </PeekPanel>
    </div>
  )
}
