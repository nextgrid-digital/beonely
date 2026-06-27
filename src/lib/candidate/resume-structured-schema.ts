import { z } from 'zod'

/**
 * Candidate professional profile (JSONB on `job_seeker_profiles.resume_structured`).
 * Sign-up collects LinkedIn + phone on the row; this structure holds the rest (summary, skills, etc.).
 */

const resumeContactSchema = z.object({
  label: z.string(),
  value: z.string(),
  href: z.string(),
})

const resumeGeneralSchema = z.object({
  name: z.string(),
  avatar: z.string(),
  jobTitle: z.string(),
  /** City, region — shown under job title in preview. */
  location: z.string().default(''),
  website: z.string(),
  about: z.string(),
  contacts: z.array(resumeContactSchema),
})

const resumeContentItemSchema = z.object({
  title: z.string(),
  /** Employer or client name (e.g. work experience). */
  company: z.string().default(''),
  /** City, region, or Remote. */
  location: z.string().default(''),
  /** Education: college or university name. */
  college: z.string().default(''),
  /** Education: state or region. */
  state: z.string().default(''),
  /** Education: country. */
  country: z.string().default(''),
  /** Legacy / unused in UI; kept for backward-compatible JSON. */
  subTitle: z.string().default(''),
  date: z.string(),
  description: z.string(),
  /** Public URL of an uploaded file (certificate image/PDF) for certificate sections. */
  fileUrl: z.string().default(''),
})

const resumeSectionSchema = z.object({
  title: z.string(),
  items: z.array(resumeContentItemSchema),
})

export const resumeStructuredEnvelopeSchema = z.object({
  schemaVersion: z.literal(1),
  general: resumeGeneralSchema,
  sections: z.array(resumeSectionSchema),
})

export type ResumeStructuredV1 = z.infer<typeof resumeStructuredEnvelopeSchema>
export type ResumeGeneral = z.infer<typeof resumeGeneralSchema>
export type ResumeSection = z.infer<typeof resumeSectionSchema>
export type ResumeContentItem = z.infer<typeof resumeContentItemSchema>

/** Placeholder when no profile photo URL is set or the image fails to load. */
export const PROFILE_AVATAR_PLACEHOLDER_URL =
  'https://placehold.co/80x80/e2e8f0/64748b/png?text=Photo'

/** Default section order: skills, modules, work, education, courses, certifications; Contact is rendered after sections in preview. Modules is a chip section; Certifications holds uploaded named files. */
export function defaultResumeStructured(): ResumeStructuredV1 {
  return {
    schemaVersion: 1,
    general: {
      name: 'Your name',
      avatar: PROFILE_AVATAR_PLACEHOLDER_URL,
      jobTitle: 'Your role',
      location: '',
      website: '',
      about:
        'Write a short professional summary — what you do, key strengths, and what you are looking for next.',
      contacts: [
        {
          label: 'Email',
          value: 'you@example.com',
          href: 'mailto:you@example.com',
        },
        {
          label: 'LinkedIn',
          value: 'your-profile',
          href: 'https://www.linkedin.com/',
        },
      ],
    },
    sections: [
      {
        title: 'Skills and technical proficiencies',
        items: [
          {
            title: '',
            company: '',
            location: '',
            college: '',
            state: '',
            country: '',
            subTitle: '',
            date: '',
            description:
              '• Skill or domain one\n• Skill or domain two\n• Tools, frameworks, or certifications',
            fileUrl: '',
          },
        ],
      },
      {
        title: 'Modules',
        items: [],
      },
      {
        title: 'Work experience',
        items: [
          {
            title: 'Senior Consultant | Client: RANPAK',
            company: 'EY',
            location: 'Remote',
            college: '',
            state: '',
            country: '',
            subTitle: '',
            date: '2024 — Present',
            description: 'What you shipped, led, or improved.',
            fileUrl: '',
          },
          {
            title: 'Earlier role',
            company: 'Another company',
            location: 'City, region',
            college: '',
            state: '',
            country: '',
            subTitle: '',
            date: '2016 — 2020',
            description: 'Scope and outcomes.',
            fileUrl: '',
          },
        ],
      },
      {
        title: 'Education',
        items: [
          {
            title: 'Your degree',
            company: '',
            location: '',
            college: 'College or university name',
            state: 'State or region',
            country: 'Country',
            subTitle: '',
            date: '2012 — 2016',
            description: '',
            fileUrl: '',
          },
        ],
      },
      {
        title: 'Courses and training',
        items: [
          {
            title: 'Course or program name',
            company: 'Provider (e.g. Coursera, bootcamp)',
            location: '',
            college: '',
            state: '',
            country: '',
            subTitle: '',
            date: 'Year',
            description: 'What you learned or built (optional).',
            fileUrl: '',
          },
        ],
      },
      {
        title: 'Certifications',
        items: [],
      },
    ],
  }
}

export function parseResumeStructured(json: unknown): ResumeStructuredV1 {
  const r = resumeStructuredEnvelopeSchema.safeParse(json)
  if (r.success) return r.data
  return defaultResumeStructured()
}
