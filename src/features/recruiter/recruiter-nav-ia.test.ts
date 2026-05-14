import { describe, expect, it } from 'vitest'
import {
  normalizeRecruiterPathname,
  recruiterBreadcrumbSegments,
  recruiterSubnavActiveKey,
} from '@/features/recruiter/recruiter-nav-ia'

describe('normalizeRecruiterPathname', () => {
  it('normalizes /recruiter to trailing slash', () => {
    expect(normalizeRecruiterPathname('/recruiter')).toBe('/recruiter/')
  })

  it('leaves other paths unchanged', () => {
    expect(normalizeRecruiterPathname('/recruiter/pricing')).toBe(
      '/recruiter/pricing'
    )
  })
})

describe('recruiterSubnavActiveKey', () => {
  it('detects pricing', () => {
    expect(recruiterSubnavActiveKey('/recruiter/pricing')).toBe('pricing')
    expect(recruiterSubnavActiveKey('/recruiter/pricing/')).toBe('pricing')
  })

  it('defaults to my-jobs for listings, applicants, and job editor', () => {
    expect(recruiterSubnavActiveKey('/recruiter')).toBe('my-jobs')
    expect(recruiterSubnavActiveKey('/recruiter/')).toBe('my-jobs')
    expect(
      recruiterSubnavActiveKey('/recruiter/jobs/abc/applicants')
    ).toBe('my-jobs')
    expect(recruiterSubnavActiveKey('/recruiter/jobs/new')).toBe('my-jobs')
    expect(
      recruiterSubnavActiveKey(
        '/recruiter/jobs/550e8400-e29b-41d4-a716-446655440000/edit'
      )
    ).toBe('my-jobs')
  })
})

describe('recruiterBreadcrumbSegments', () => {
  it('lists my jobs trail', () => {
    expect(recruiterBreadcrumbSegments('/recruiter/')).toEqual([
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs' },
    ])
  })

  it('lists pricing trail', () => {
    expect(recruiterBreadcrumbSegments('/recruiter/pricing')).toEqual([
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'Pricing' },
    ])
  })

  it('lists applicants trail', () => {
    expect(
      recruiterBreadcrumbSegments('/recruiter/jobs/x/applicants')
    ).toEqual([
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'Applicants' },
    ])
  })

  it('lists new listing trail', () => {
    expect(recruiterBreadcrumbSegments('/recruiter/jobs/new')).toEqual([
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'New listing' },
    ])
  })

  it('lists edit listing trail', () => {
    expect(
      recruiterBreadcrumbSegments(
        '/recruiter/jobs/550e8400-e29b-41d4-a716-446655440000/edit'
      )
    ).toEqual([
      { label: 'Recruiter', to: '/recruiter' },
      { label: 'My jobs', to: '/recruiter' },
      { label: 'Edit listing' },
    ])
  })
})
