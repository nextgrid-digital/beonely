import { apiPost } from '@/lib/api-client'
import type { Database } from '@/lib/supabase/database.types'

export type EmailCampaignRow =
  Database['public']['Tables']['email_campaigns']['Row']

type CampaignAudience = Database['public']['Enums']['campaign_audience']

export type AutomationRule = {
  trigger_key: string
  enabled: boolean
  updated_at: string
  label: string
  last_7d: { sent: number; failed: number }
}

export async function notifyJobStatus(opts: {
  job_id: string
  status: 'approved' | 'rejected'
  reason?: string | null
  accessToken: string
}): Promise<void> {
  await apiPost('/api/admin/notify-job-status', opts, opts.accessToken)
}

export async function fetchAdminCampaigns(
  accessToken: string
): Promise<EmailCampaignRow[]> {
  const res = await fetch('/api/admin/campaigns', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as {
    campaigns?: EmailCampaignRow[]
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? 'fetch_failed')
  return json.campaigns ?? []
}

export async function createAdminCampaign(
  accessToken: string,
  input: {
    subject: string
    preview_text?: string | null
    body: string
    audience: CampaignAudience
  }
): Promise<EmailCampaignRow> {
  const res = await apiPost<{ campaign: EmailCampaignRow }>(
    '/api/admin/campaigns',
    input,
    accessToken
  )
  return res.campaign
}

export async function sendAdminCampaign(
  accessToken: string,
  input: {
    campaign_id: string
    cursor?: number
    test_send?: boolean
    test_email?: string
  }
): Promise<{
  ok: boolean
  sent: number
  failed: number
  total: number
  done: boolean
  next_cursor: number | null
}> {
  if (input.test_email) {
    return apiPost(
      '/api/admin/email/test-send',
      {
        campaign_id: input.campaign_id,
        to: input.test_email,
      },
      accessToken
    )
  }
  return apiPost('/api/admin/campaign-send', input, accessToken)
}

export async function fetchCampaignStats(accessToken: string) {
  const res = await fetch('/api/admin/campaign-stats', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: string }).error)
        : 'stats_failed'
    )
  }
  return json as {
    marketing: {
      candidates: number
      recruiters: number
      newsletter: number
      all_marketing: number
      subscribers_active: number
    }
    campaigns_by_status: Record<string, number>
  }
}

export async function fetchAutomations(accessToken: string) {
  const res = await fetch('/api/admin/email/automations', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = (await res.json()) as {
    rules?: AutomationRule[]
    error?: string
  }
  if (!res.ok) throw new Error(json.error ?? 'load_failed')
  return json.rules ?? []
}

export async function patchAutomation(
  accessToken: string,
  trigger_key: string,
  enabled: boolean
) {
  const res = await fetch('/api/admin/email/automations', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ trigger_key, enabled }),
  })
  if (!res.ok) {
    const json = (await res.json()) as { error?: string }
    throw new Error(json.error ?? 'update_failed')
  }
}

export async function fetchEmailAnalytics(accessToken: string) {
  const res = await fetch('/api/admin/email/analytics', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: string }).error)
        : 'analytics_failed'
    )
  }
  return json
}

export type TestSendEmailResult = {
  ok: boolean
  sent?: boolean
  skipped?: boolean
  reason?: string
  hint?: string
  messageId?: string | null
  logId?: string | null
  log_error?: string
  error?: string
}

export async function testSendEmail(
  accessToken: string,
  input: {
    to: string
    trigger_key?: string
    campaign_id?: string
  }
): Promise<TestSendEmailResult> {
  return apiPost<TestSendEmailResult>(
    '/api/admin/email/test-send',
    input,
    accessToken
  )
}

export async function fetchCampaignDetail(
  accessToken: string,
  campaignId: string
) {
  const res = await fetch(
    `/api/admin/email/campaign-recipients?campaign_id=${encodeURIComponent(campaignId)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const json = await res.json()
  if (!res.ok) {
    throw new Error(
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error: string }).error)
        : 'load_failed'
    )
  }
  return json as {
    campaign: EmailCampaignRow
    recipients: Array<{
      id: string
      email: string
      recipient_type: string
      delivery_status: string
      error_message: string | null
      sent_at: string | null
    }>
    delivery_counts: Record<string, number>
  }
}

export async function dispatchLifecycleEmail(
  accessToken: string,
  input: {
    trigger_key: string
    payload?: Record<string, unknown>
    dedupe_key?: string
  }
) {
  return apiPost('/api/email/dispatch', input, accessToken)
}
