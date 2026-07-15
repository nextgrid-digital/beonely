import { beforeEach, describe, expect, it, vi } from 'vitest'
import { trustedCompanyLogoUrl } from '@/features/jobs/company-logo-avatar'

const supabaseMocks = vi.hoisted(() => ({
  getSupabaseUrl: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  getSupabaseUrl: supabaseMocks.getSupabaseUrl,
}))

const recruiterId = '2f5b88e4-d41a-4eb6-882f-c20ab08f5343'
const jobId = '3f6c99f5-e52b-4fc7-993a-d31bc19f6454'
const projectUrl = 'https://project-ref.supabase.co'

describe('trustedCompanyLogoUrl', () => {
  beforeEach(() => {
    supabaseMocks.getSupabaseUrl.mockReturnValue(projectUrl)
  })

  it('accepts app-owned job logos and known LinkedIn media hosts', () => {
    const stored = `${projectUrl}/storage/v1/object/public/job-logos/${recruiterId}/${jobId}/logo.jpg`
    expect(trustedCompanyLogoUrl(stored)).toBe(stored)
    expect(
      trustedCompanyLogoUrl('https://media.licdn.com/dms/image/logo.png')
    ).toBe('https://media.licdn.com/dms/image/logo.png')
  })

  it('blocks arbitrary, insecure, and lookalike URLs', () => {
    expect(trustedCompanyLogoUrl('https://tracker.example/pixel')).toBeNull()
    expect(trustedCompanyLogoUrl('http://media.licdn.com/logo.png')).toBeNull()
    expect(
      trustedCompanyLogoUrl('https://media.licdn.com.attacker.example/logo.png')
    ).toBeNull()
    expect(
      trustedCompanyLogoUrl(
        `${projectUrl}/storage/v1/object/public/avatars/${recruiterId}/${jobId}/logo.jpg`
      )
    ).toBeNull()
  })

  it('rejects project Storage URLs when Supabase is not configured', () => {
    supabaseMocks.getSupabaseUrl.mockReturnValue('')
    const stored = `${projectUrl}/storage/v1/object/public/job-logos/${recruiterId}/${jobId}/logo.jpg`

    expect(trustedCompanyLogoUrl(stored)).toBeNull()
  })

  it('permits blob URLs only when an editor explicitly opts in', () => {
    expect(trustedCompanyLogoUrl('blob:https://beonely.in/local')).toBeNull()
    expect(
      trustedCompanyLogoUrl('blob:https://beonely.in/local', {
        allowLocalPreview: true,
      })
    ).toBe('blob:https://beonely.in/local')
  })
})
