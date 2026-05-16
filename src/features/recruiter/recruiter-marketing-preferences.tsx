import { useState } from 'react'
import { toast } from 'sonner'
import { MarketingOptInCheckbox } from '@/components/marketing-opt-in-checkbox'
import { updateMarketingConsent } from '@/lib/email/marketing-opt-in'
import { useAuth } from '@/context/auth-provider'
import type { RecruiterRow } from '@/lib/supabase/database.types'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

export function RecruiterMarketingPreferences({
  recruiter,
}: {
  recruiter: RecruiterRow
}) {
  const { session } = useAuth()
  const [marketingOptIn, setMarketingOptIn] = useState(
    recruiter.marketing_opt_in ?? false
  )
  const [busy, setBusy] = useState(false)

  async function onChange(checked: boolean) {
    setMarketingOptIn(checked)
    setBusy(true)
    try {
      const sb = getSupabaseBrowserClient()
      await sb
        .from('recruiters')
        .update({
          marketing_opt_in: checked,
          marketing_opt_in_at: checked ? new Date().toISOString() : null,
        })
        .eq('id', recruiter.id)
      const token = session?.access_token
      if (token) {
        await updateMarketingConsent({
          marketing_opt_in: checked,
          audience: 'recruiter',
          accessToken: token,
        })
      }
      toast.success(
        checked ? 'You will receive hiring tips and updates' : 'Unsubscribed from marketing'
      )
    } catch {
      toast.error('Could not update preferences')
      setMarketingOptIn(!checked)
    } finally {
      setBusy(false)
    }
  }

  return (
    <MarketingOptInCheckbox
      checked={marketingOptIn}
      disabled={busy}
      onCheckedChange={(v) => void onChange(v)}
      id='recruiter-marketing-opt-in'
    />
  )
}
