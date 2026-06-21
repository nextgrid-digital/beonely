import { apiPost } from '@/lib/api-client'

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

export type HiringRequestRow = HiringRequestInput & {
  id: string
  created_at: string
  updated_at: string
  status: string
  source: string
}

export async function submitHiringRequest(input: HiringRequestInput) {
  return apiPost<{ ok: true; id: string }>('/api/hiring-request', input, undefined)
}

export async function fetchAdminHiringRequests(accessToken: string) {
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
