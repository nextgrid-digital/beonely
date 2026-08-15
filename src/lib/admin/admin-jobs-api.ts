import { apiPost } from '@/lib/api-client'
import type { JobRow } from '@/lib/supabase/database.types'

export type AdminJobAction =
  | { action: 'approve'; job_id: string }
  | { action: 'reject'; job_id: string; reason?: string | null }
  | { action: 'set_featured'; job_id: string; featured: boolean }
  | { action: 'update_description'; job_id: string; description: string }

export async function mutateAdminJob(
  accessToken: string,
  action: AdminJobAction
): Promise<JobRow> {
  const result = await apiPost<{ job: JobRow }>(
    '/api/admin/jobs',
    action,
    accessToken
  )
  return result.job
}
