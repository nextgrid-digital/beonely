import { describe, expect, it } from 'vitest'
import {
  parseResumeStructured,
  resumeStructuredEnvelopeSchema,
} from '@/lib/candidate/resume-structured-schema'

describe('resumeContentItem company / location', () => {
  it('defaults company and location when missing from stored JSON', () => {
    const raw = {
      schemaVersion: 1,
      general: {
        name: 'A',
        avatar: 'https://example.com/a.png',
        jobTitle: 'Dev',
        location: '',
        website: '',
        about: '<p>x</p>',
        contacts: [
          { label: 'Email', value: 'a@b.com', href: 'mailto:a@b.com' },
        ],
      },
      sections: [
        {
          title: 'Work',
          items: [
            {
              title: 'Role',
              subTitle: 'Legacy line',
              date: '2020',
              description: '<p>d</p>',
            },
          ],
        },
      ],
    }
    const parsed = resumeStructuredEnvelopeSchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.sections[0].items[0].company).toBe('')
    expect(parsed.data.sections[0].items[0].location).toBe('')
    expect(parsed.data.sections[0].items[0].subTitle).toBe('Legacy line')
  })

  it('parseResumeStructured accepts legacy items', () => {
    const parsed = parseResumeStructured({
      schemaVersion: 1,
      general: {
        name: 'A',
        avatar: 'https://example.com/a.png',
        jobTitle: 'Dev',
        location: '',
        website: '',
        about: '',
        contacts: [],
      },
      sections: [
        {
          title: 'T',
          items: [{ title: 'x', subTitle: '', date: '', description: '' }],
        },
      ],
    })
    expect(parsed.sections[0].items[0].company).toBe('')
    expect(parsed.sections[0].items[0].location).toBe('')
    expect(parsed.sections[0].items[0].college).toBe('')
    expect(parsed.sections[0].items[0].state).toBe('')
    expect(parsed.sections[0].items[0].country).toBe('')
  })

  it('defaults subTitle when missing from stored JSON', () => {
    const raw = {
      schemaVersion: 1,
      general: {
        name: 'A',
        avatar: 'https://example.com/a.png',
        jobTitle: 'Dev',
        location: '',
        website: '',
        about: '',
        contacts: [],
      },
      sections: [
        {
          title: 'Work',
          items: [
            {
              title: 'Role',
              company: 'Co',
              location: 'Loc',
              date: '2020',
              description: '',
            },
          ],
        },
      ],
    }
    const parsed = resumeStructuredEnvelopeSchema.safeParse(raw)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.sections[0].items[0].subTitle).toBe('')
    expect(parsed.data.sections[0].items[0].college).toBe('')
    expect(parsed.data.sections[0].items[0].state).toBe('')
    expect(parsed.data.sections[0].items[0].country).toBe('')
  })
})
