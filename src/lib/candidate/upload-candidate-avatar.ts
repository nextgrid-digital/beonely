import type { SupabaseClient } from '@supabase/supabase-js'

export const CANDIDATE_AVATAR_BUCKET = 'avatars'

const MAX_ORIGINAL_BYTES = 5 * 1024 * 1024
const ALLOWED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const JPEG_QUALITY = 0.88
const MAX_EDGE_PX = 768

export function validateCandidateAvatarFile (file: File): string | null {
  if (!ALLOWED_INPUT_TYPES.has(file.type)) {
    return 'Please use a JPEG, PNG, or WebP image.'
  }
  if (file.size > MAX_ORIGINAL_BYTES) {
    return 'Image must be 5 MB or smaller.'
  }
  return null
}

async function fileToResizedJpeg (file: File, maxEdge: number): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  try {
    const ratio = Math.min(1, maxEdge / Math.max(bmp.width, bmp.height))
    const w = Math.max(1, Math.round(bmp.width * ratio))
    const h = Math.max(1, Math.round(bmp.height * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not prepare image canvas')
    ctx.drawImage(bmp, 0, 0, w, h)
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('Could not encode image'))),
        'image/jpeg',
        JPEG_QUALITY
      )
    })
  } finally {
    bmp.close()
  }
}

/**
 * Uploads a profile image to public Storage at `{userId}/avatar.jpg` and returns its public URL.
 * Intended for browser use (canvas / createImageBitmap).
 */
export async function uploadCandidateAvatar (
  sb: SupabaseClient,
  userId: string,
  file: File
): Promise<string> {
  const validation = validateCandidateAvatarFile(file)
  if (validation) throw new Error(validation)

  const jpeg = await fileToResizedJpeg(file, MAX_EDGE_PX)
  const path = `${userId}/avatar.jpg`

  const { error: uploadError } = await sb.storage
    .from(CANDIDATE_AVATAR_BUCKET)
    .upload(path, jpeg, { contentType: 'image/jpeg', upsert: true })

  if (uploadError) {
    const raw = uploadError.message || 'Could not upload image'
    if (/bucket not found/i.test(raw)) {
      throw new Error(
        'Profile photo storage is not set up yet (missing "avatars" bucket). Apply the migration `supabase/migrations/20260515120000_candidate_avatars_storage.sql` to your Supabase project (e.g. `supabase db push`), or create a public bucket named `avatars` in the Dashboard → Storage, then run that migration file’s SQL so upload policies exist.'
      )
    }
    throw new Error(raw)
  }

  const { data } = sb.storage.from(CANDIDATE_AVATAR_BUCKET).getPublicUrl(path)
  if (!data.publicUrl) throw new Error('Could not resolve public URL for avatar')
  return data.publicUrl
}
