import { describe, expect, it } from 'vitest'
import {
  jobListingPreviewDataFromJob,
  jobListingPreviewDataFromValues,
} from '@/lib/jobs/job-listing-preview-data'
import type { JobRow } from '@/lib/supabase/database.types'
import { defaultFormValues } from '@/features/recruiter/recruiter-job-editor-page'

describe('jobListingPreviewDataFromJob', () => {
  it('maps job row fields for candidate preview', () => {
    const job = {
      job_title: 'Developer',
      company_name: 'Acme',
      company_logo: 'https://example.com/logo.png',
      location: 'Remote',
      employment_type: 'full_time',
      work_mode: 'remote',
      experience_level: 'senior',
      job_type: 'developer',
      salary_range: 'INR · 12-24 LPA',
      modules: ['ITSM'],
      certifications: ['CSA'],
      skills: ['Flow Designer'],
      job_description: '<p>Hello</p>',
    } as JobRow

    const data = jobListingPreviewDataFromJob(job)
    expect(data.title).toBe('Developer')
    expect(data.company).toBe('Acme')
    expect(data.salaryRange).toBe('INR · 12-24 LPA')
    expect(data.modules).toEqual(['ITSM'])
  })

  it('returns empty preview for null job', () => {
    const data = jobListingPreviewDataFromJob(null)
    expect(data.title).toBe('')
    expect(data.modules).toEqual([])
  })
})

describe('jobListingPreviewDataFromValues', () => {
  it('formats salary from form values', () => {
    const values = {
      ...defaultFormValues(null),
      title: 'Role',
      company: 'Co',
      salary_currency: 'INR',
      salary_amount: '18–24 LPA',
    }
    const data = jobListingPreviewDataFromValues(values)
    expect(data.salaryRange).toBe('INR · 18–24 LPA')
  })
})
