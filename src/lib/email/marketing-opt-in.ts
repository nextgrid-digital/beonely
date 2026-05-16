import { apiPost } from '@/lib/api-client'

export async function updateMarketingConsent(opts: {
  marketing_opt_in: boolean
  audience: 'candidate' | 'recruiter'
  accessToken: string
}): Promise<void> {
  await apiPost<{ ok: boolean }>(
    '/api/marketing-consent',
    {
      marketing_opt_in: opts.marketing_opt_in,
      audience: opts.audience,
    },
    opts.accessToken
  )
}

export async function subscribeNewsletter(email: string): Promise<void> {
  await apiPost<{ ok: boolean }>('/api/subscribe', { email }, undefined)
}
