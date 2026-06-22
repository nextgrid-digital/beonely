import { apiPost } from '@/lib/api-client'

export type HiringRequestRow = {
  id: string
  created_at: string
  updated_at: string
  company_name: string
  contact_name: string
  email: string
  phone: string | null
  company_website: string | null
  role_title: string
  hiring_type: 'full_time' | 'contract' | 'multiple' | 'not_sure'
  work_mode: 'remote' | 'hybrid' | 'onsite' | 'flexible' | null
  location: string | null
  timeline: string | null
  headcount: number | null
  servicenow_scope: string | null
  notes: string | null
  status:
    | 'new'
    | 'contacted'
    | 'qualified'
    | 'proposal_sent'
    | 'closed_won'
    | 'closed_lost'
    | 'spam'
  source: string
  assigned_to_email?: string | null
  internal_notes?: string | null
  last_contacted_at?: string | null
}

export type HiringRequestInput = {
  company_name: string
  contact_name: string
  email: string
  phone?: string | null
  company_website?: string | null
  role_title: string
  hiring_type: 'full_time' | 'contract' | 'multiple' | 'not_sure'
  work_mode?: 'remote' | 'hybrid' | 'onsite' | 'flexible' | null
  location?: string | null
  timeline?: string | null
  headcount?: number | null
  servicenow_scope?: string | null
  notes?: string | null
}

export async function submitHiringRequest(input: HiringRequestInput) {
  return apiPost<{ ok: true; id: string }>('/api/hiring-request', input, undefined)
}

export async function fetchAdminHiringRequests(
  accessToken: string
): Promise<HiringRequestRow[]> {
  const res = await fetch('/api/admin/hiring-requests', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as {
    requests?: HiringRequestRow[]
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? 'fetch_failed')
  return json.requests ?? []
}

export async function updateAdminHiringRequest(
  accessToken: string,
  input: {
    id: string
    status: HiringRequestRow['status']
    assigned_to_email?: string | null
    internal_notes?: string | null
    touch_contacted_at?: boolean
  }
): Promise<HiringRequestRow> {
  const res = await fetch('/api/admin/hiring-requests', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(input),
  })
  const json = (await res.json()) as {
    request?: HiringRequestRow
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? 'update_failed')
  if (!json.request) throw new Error('not_found')
  return json.request
}
