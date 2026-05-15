import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fileToResizedJpeg,
  validateImageFile,
} from '@/lib/storage/resize-image'

export const JOB_COMPANY_LOGO_BUCKET = 'job-logos'

const MAX_EDGE_PX = 256

export function validateJobCompanyLogoFile(file: File): string | null {
  return validateImageFile(file)
}

/**
 * Uploads a company logo to public Storage at `{recruiterId}/{jobId}/logo.jpg`.
 */
export async function uploadJobCompanyLogo(
  sb: SupabaseClient,
  recruiterId: string,
  jobId: string,
  file: File
): Promise<string> {
  const validation = validateJobCompanyLogoFile(file)
  if (validation) throw new Error(validation)

  const jpeg = await fileToResizedJpeg(file, MAX_EDGE_PX)
  const path = `${recruiterId}/${jobId}/logo.jpg`

  const { error: uploadError } = await sb.storage
    .from(JOB_COMPANY_LOGO_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    const raw = uploadError.message || 'Could not upload image'
    if (/bucket not found/i.test(raw)) {
      throw new Error(
        'Company logo storage is not set up yet (missing "job-logos" bucket). Apply the migration `supabase/migrations/20260517120000_job_company_logos_storage.sql` to your Supabase project (e.g. `supabase db push`).'
      )
    }
    throw new Error(raw)
  }

  const { data } = sb.storage.from(JOB_COMPANY_LOGO_BUCKET).getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error('Could not resolve public URL for company logo')
  }
  return data.publicUrl
}
