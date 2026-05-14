import { z } from 'zod'
import { isLinkedInProfileUrl } from '@/lib/candidate/linkedin-url'

/** Minimum digits (excluding formatting) for a plausible phone number. */
const MIN_PHONE_DIGITS = 10

export const candidatePhoneSchema = z
  .string()
  .min(1, 'Please enter your phone number.')
  .refine((s) => countDigits(s) >= MIN_PHONE_DIGITS, {
    message: 'Enter a valid phone number (at least 10 digits).',
  })

function countDigits (s: string): number {
  return (s.match(/\d/g) ?? []).length
}

export const candidateLinkedInUrlSchema = z
  .string()
  .min(1, 'Please enter your LinkedIn profile URL.')
  .refine((s) => isLinkedInProfileUrl(s), {
    message: 'Enter a valid https:// LinkedIn profile URL (e.g. linkedin.com/in/…).',
  })

export type JobSeekerProfileCompletionFields = {
  linkedin_url: string | null
  phone: string | null
} | null

export function isJobSeekerProfileComplete (
  row: JobSeekerProfileCompletionFields
): boolean {
  if (!row) return false
  const linkedin = row.linkedin_url?.trim() ?? ''
  const phone = row.phone?.trim() ?? ''
  if (!linkedin || !phone) return false
  if (!isLinkedInProfileUrl(linkedin)) return false
  return candidatePhoneSchema.safeParse(phone).success
}
