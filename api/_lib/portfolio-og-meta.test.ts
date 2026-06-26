import { describe, expect, it } from 'vitest'
import {
  portfolioOgChips,
  portfolioOgDescription,
  portfolioOgTitle,
} from './portfolio-og-meta.js'
import type { PublicPortfolio } from './public-portfolio.js'

const samplePortfolio: PublicPortfolio = {
  slug: 'jane-doe',
  name: 'Jane Doe',
  headline: 'Senior ServiceNow Consultant',
  avatar: null,
  about: 'Ten years building ITSM, CSM, and HRSD workflows on the Now Platform.',
  resume: {
    schemaVersion: 1,
    general: {
      name: 'Jane Doe',
      avatar: '',
      jobTitle: 'Senior ServiceNow Consultant',
      location: 'Remote',
      website: 'https://jane.example',
      about: 'Ten years building ITSM, CSM, and HRSD workflows.',
      contacts: [],
    },
    sections: [
      {
        title: 'Skills and technical proficiencies',
        items: [
          { description: '• ITSM\n• Flow Designer\n• Integration Hub' },
        ],
      },
      {
        title: 'Certificates',
        items: [
          { title: 'Certified System Administrator (CSA)' },
          { title: 'Certified Implementation Specialist - ITSM' },
        ],
      },
    ],
  },
}

describe('portfolio-og-meta', () => {
  it('builds the OG title', () => {
    expect(portfolioOgTitle(samplePortfolio)).toBe('Jane Doe · Beonely')
  })

  it('prefers headline + about in the description', () => {
    const desc = portfolioOgDescription(samplePortfolio)
    expect(desc).toContain('Senior ServiceNow Consultant')
    expect(desc.length).toBeLessThanOrEqual(160)
  })

  it('lists certificate chips before skills', () => {
    const chips = portfolioOgChips(samplePortfolio)
    expect(chips[0]).toBe('Certified System Administrator (CSA)')
    expect(chips.length).toBeLessThanOrEqual(3)
  })

  it('falls back to skills when there are no certificates', () => {
    const noCerts: PublicPortfolio = {
      ...samplePortfolio,
      resume: {
        ...samplePortfolio.resume,
        sections: [samplePortfolio.resume.sections[0]!],
      },
    }
    expect(portfolioOgChips(noCerts)).toEqual([
      'ITSM',
      'Flow Designer',
      'Integration Hub',
    ])
  })
})
