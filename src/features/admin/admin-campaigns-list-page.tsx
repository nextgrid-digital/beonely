import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { fetchAdminCampaigns, fetchCampaignStats } from '@/lib/email/admin-email-api'
import { useAuth } from '@/context/auth-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export function AdminCampaignsListPage() {
  const { session } = useAuth()
  const token = session?.access_token

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

  return (
    <div className='space-y-6 py-6'>
      <div className='flex flex-wrap items-start justify-between gap-4'>
        <div>
          <h1 className='text-2xl font-semibold tracking-tight'>Campaigns</h1>
          <p className='text-sm text-muted-foreground'>
            Create and send marketing emails to opted-in audiences.
          </p>
        </div>
        <Button type='button' asChild>
          <Link to='/admin/email/campaigns/new'>
            <Plus className='size-4' />
            New campaign
          </Link>
        </Button>
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
                <TableHead>Created</TableHead>
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
                  <TableCell className='text-sm text-muted-foreground'>
                    {new Date(c.created_at).toLocaleDateString()}
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
