import type { SupabaseClient } from '@supabase/supabase-js'
import {
  fileToResizedJpeg,
  validateImageFile,
} from '@/lib/storage/resize-image'

export const CANDIDATE_AVATAR_BUCKET = 'avatars'

const MAX_EDGE_PX = 768

export function validateCandidateAvatarFile(file: File): string | null {
  return validateImageFile(file)
}

/**
 * Uploads a profile image to public Storage at `{userId}/avatar.jpg` and returns its public URL.
 * Intended for browser use (canvas / createImageBitmap).
 */
export async function uploadCandidateAvatar(
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
  if (!data.publicUrl)
    throw new Error('Could not resolve public URL for avatar')
  return data.publicUrl
}
