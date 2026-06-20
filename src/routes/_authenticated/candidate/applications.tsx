import { useState } from 'react'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import {
  getSupabaseBrowserClient,
  getSupabaseConfigured,
} from '@/lib/supabase/client'
import type { Enums, JobRow, Tables } from '@/lib/supabase/database.types'
import { useAuth } from '@/context/auth-provider'
import { InboxList } from '@/components/inbox/inbox-list'
import type { InboxRowData } from '@/components/inbox/inbox-list-row'
import type { InboxPillItem } from '@/components/inbox/inbox-status-pill'
import { JobPeek, JOB_PEEK_PARAM } from '@/features/jobs/job-peek'
import { PUBLIC_SITE_MAIN_COLUMN } from '@/features/jobs/public-site-layout'

const applicationsSearchSchema = z.object({
  peek: z.string().optional(),
  tab: z
    .enum(['all', 'new', 'reviewed', 'shortlisted', 'rejected', 'tracked'])
    .optional()
    .catch(undefined),
})

export const Route = createFileRoute('/_authenticated/candidate/applications')({
  validateSearch: applicationsSearchSchema,
  component: CandidateApplicationsPage,
})

type ApplicationStatus = Enums<'application_status'>
type CandidateTab =
  | 'all'
  | 'new'
  | 'reviewed'
  | 'shortlisted'
  | 'rejected'
  | 'tracked'

type JobAppRow = {
  applied_at: string
  job_id: string
  notes: string | null
  jobs: JobRow | null
}

type BeonelyAppRow = Tables<'applications'> & {
  jobs: JobRow | null
}

interface CandidateApplicationItem {
  slug: string
  title: string
  company: string
  status: ApplicationStatus | null
  date: string
}

function statusPill(status: ApplicationStatus | null): InboxPillItem {
  switch (status) {
    case 'new':
      return { label: 'New', variant: 'info' }
    case 'reviewed':
      return { label: 'Reviewed', variant: 'muted' }
    case 'shortlisted':
      return { label: 'Shortlisted', variant: 'success' }
    case 'rejected':
      return { label: 'Rejected', variant: 'danger' }
    case null:
      return { label: 'Tracked', variant: 'muted' }
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}

function jobOf(row: { jobs: JobRow | null }): JobRow | null {
  return Array.isArray(row.jobs) ? (row.jobs[0] ?? null) : row.jobs
}

function CandidateApplicationsPage() {
  const { user } = useAuth()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()
  const activeTab: CandidateTab = search.tab ?? 'all'
  const [searchQuery, setSearchQuery] = useState('')

  const jobAppsQuery = useQuery({
    queryKey: ['job-applications', user?.id],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('job_applications')
        .select('applied_at, job_id, notes, jobs(*)')
        .eq('user_id', user!.id)
        .order('applied_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as JobAppRow[]
    },
  })

  const beonelyAppsQuery = useQuery({
    queryKey: ['beonely-applications', user?.id],
    enabled: Boolean(user && getSupabaseConfigured()),
    queryFn: async () => {
      const sb = getSupabaseBrowserClient()
      const { data, error } = await sb
        .from('applications')
        .select('*, jobs(*)')
        .eq('candidate_user_id', user!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as BeonelyAppRow[]
    },
  })

  if (!getSupabaseConfigured()) {
    return (
      <p className='px-4 py-6 text-sm text-muted-foreground'>
        Connect Supabase to load applications.
      </p>
    )
  }

  // Merge both sources, deduped by job slug (Beonely applications win since
  // they carry a recruiter-managed status).
  const itemsBySlug = new Map<string, CandidateApplicationItem>()
  for (const row of beonelyAppsQuery.data ?? []) {
    const job = jobOf(row)
    if (!job) continue
    itemsBySlug.set(job.job_slug, {
      slug: job.job_slug,
      title: job.job_title,
      company: job.company_name,
      status: row.status,
      date: row.created_at,
    })
  }
  for (const row of jobAppsQuery.data ?? []) {
    const job = jobOf(row)
    if (!job || itemsBySlug.has(job.job_slug)) continue
    itemsBySlug.set(job.job_slug, {
      slug: job.job_slug,
      title: job.job_title,
      company: job.company_name,
      status: null,
      date: row.applied_at,
    })
  }
  const items = [...itemsBySlug.values()].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const rows: InboxRowData[] = items
    .filter((item) => {
      switch (activeTab) {
        case 'all':
          return true
        case 'tracked':
          return item.status === null
        default:
          return item.status === activeTab
      }
    })
    .filter((item) =>
      normalizedQuery
        ? `${item.title} ${item.company}`
            .toLowerCase()
            .includes(normalizedQuery)
        : true
    )
    .map((item) => ({
      id: item.slug,
      title: item.title,
      preview: item.company,
      pills: [statusPill(item.status)],
      timestamp: item.date,
    }))

  const countBy = (predicate: (item: CandidateApplicationItem) => boolean) =>
    items.filter(predicate).length

  const tabPills = [
    { id: 'all' as const, label: 'All', count: items.length },
    {
      id: 'new' as const,
      label: 'New',
      count: countBy((i) => i.status === 'new'),
    },
    {
      id: 'reviewed' as const,
      label: 'Reviewed',
      count: countBy((i) => i.status === 'reviewed'),
    },
    {
      id: 'shortlisted' as const,
      label: 'Shortlisted',
      count: countBy((i) => i.status === 'shortlisted'),
    },
    {
      id: 'rejected' as const,
      label: 'Rejected',
      count: countBy((i) => i.status === 'rejected'),
    },
    {
      id: 'tracked' as const,
      label: 'Tracked',
      count: countBy((i) => i.status === null),
    },
  ]

  const isLoading = beonelyAppsQuery.isLoading || jobAppsQuery.isLoading

  return (
    <div className={`${PUBLIC_SITE_MAIN_COLUMN} py-8`}>
      <InboxList<CandidateTab>
        className='h-auto'
        title='Applications'
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder='Search applications...'
        pills={tabPills}
        activeFilter={activeTab}
        onFilterChange={(tab) =>
          void navigate({
            search: (p) => ({ ...p, tab: tab === 'all' ? undefined : tab }),
          })
        }
        layoutId='candidate-applications'
        rows={rows}
        selectedId={search.peek ?? null}
        onSelect={(slug) =>
          void navigate({
            search: (p) => ({ ...p, [JOB_PEEK_PARAM]: slug }),
          })
        }
        loading={isLoading}
        emptyMessage='No applications in this view yet.'
      />
      <JobPeek />
    </div>
  )
}
