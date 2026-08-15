import type { SupabaseClient } from '@supabase/supabase-js'

export const CANDIDATE_CERTIFICATE_BUCKET = 'certificates'

const MAX_BYTES = 10 * 1024 * 1024 // 10 MB
const SIGNED_URL_TTL_SECONDS = 5 * 60
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}

export type CandidateCertificateUpload = {
  filePath: string
  fileUrl: string
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
 * Uploads a certificate file to private Storage and returns its durable object
 * path plus a five-minute URL for the current editor session.
 */
export async function uploadCandidateCertificate(
  sb: SupabaseClient,
  userId: string,
  file: File
): Promise<CandidateCertificateUpload> {
  const validation = validateCandidateCertificateFile(file)
  if (validation) throw new Error(validation)
  if (!UUID_RE.test(userId)) throw new Error('Invalid candidate account id.')

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
    if (/row-level security|policy|not authorized/i.test(raw)) {
      throw new Error(
        'Certificate upload was denied. You may have reached the 20-file limit; remove an old certificate and retry.'
      )
    }
    throw new Error(raw)
  }

  const { data, error: signError } = await sb.storage
    .from(CANDIDATE_CERTIFICATE_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signError || !data?.signedUrl) {
    await sb.storage.from(CANDIDATE_CERTIFICATE_BUCKET).remove([path])
    throw new Error(
      signError?.message || 'Could not create certificate preview'
    )
  }
  return { filePath: path, fileUrl: data.signedUrl }
}
