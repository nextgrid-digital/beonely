import type { SupabaseClient } from '@supabase/supabase-js'

export const CANDIDATE_CERTIFICATE_BUCKET = 'certificates'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export function validateCandidateCertificateFile(file: File): string | null {
  if (!ALLOWED_TYPES[file.type]) {
    return 'Certificate must be a JPG, PNG, WebP, or PDF file.'
  }
  if (file.size > MAX_BYTES) {
    return 'Certificate file must be 10 MB or smaller.'
  }
  return null
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Uploads a certificate file (image or PDF) to public Storage at
 * `{userId}/{uuid}.{ext}` and returns its public URL. Each upload uses a
 * unique path so multiple certificates can coexist.
 */
export async function uploadCandidateCertificate(
  sb: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const validation = validateCandidateCertificateFile(file)
  if (validation) throw new Error(validation)

  const ext = ALLOWED_TYPES[file.type] ?? 'bin'
  const path = `${userId}/${randomId()}.${ext}`

  const { error: uploadError } = await sb.storage
    .from(CANDIDATE_CERTIFICATE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false })

  if (uploadError) {
    const raw = uploadError.message || 'Could not upload certificate'
    if (/bucket not found/i.test(raw)) {
      throw new Error(
        'Certificate storage is not set up yet (missing "certificates" bucket). Apply the migration `supabase/migrations/20260627120000_candidate_certificates_storage.sql` to your Supabase project (e.g. `supabase db push`).'
      )
    }
    throw new Error(raw)
  }

  const { data } = sb.storage
    .from(CANDIDATE_CERTIFICATE_BUCKET)
    .getPublicUrl(path)
  if (!data.publicUrl) {
    throw new Error('Could not resolve public URL for certificate')
  }
  return data.publicUrl
}
