import { formatSalaryRange } from '@/lib/jobs/salary-range-format'
import type { JobListingPreviewData } from '@/features/jobs/job-listing-preview'
import type { JobEditorValues } from '@/features/recruiter/recruiter-job-editor-page'
import type { JobRow } from '@/lib/supabase/database.types'

export function jobListingPreviewDataFromJob(
  job: JobRow | null
): JobListingPreviewData {
  if (!job) {
    return {
      title: '',
      company: '',
      modules: [],
      certifications: [],
      skills: [],
      description: '',
    }
  }
  return {
    title: job.job_title ?? '',
    company: job.company_name ?? '',
    companyLogo: job.company_logo ?? undefined,
    location: job.location ?? undefined,
    employmentType: job.employment_type ?? undefined,
    workMode: job.work_mode ?? undefined,
    experienceLevel: job.experience_level ?? undefined,
    jobType: job.job_type ?? undefined,
    salaryRange: job.salary_range ?? undefined,
    modules: job.modules ?? [],
    certifications: job.certifications ?? [],
    skills: job.skills ?? [],
    description: job.job_description ?? '',
  }
}

export function jobListingPreviewDataFromValues(
  values: JobEditorValues
): JobListingPreviewData {
  return {
    title: values.title,
    company: values.company,
    companyLogo: values.company_logo,
    location: values.location,
    employmentType: values.employment_type,
    workMode: values.work_mode,
    experienceLevel: values.experience_level,
    jobType: values.job_type,
    salaryRange:
      formatSalaryRange(values.salary_currency, values.salary_amount) ??
      undefined,
    modules: values.modules,
    certifications: values.certifications,
    skills: values.skills,
    description: values.description,
  }
}
