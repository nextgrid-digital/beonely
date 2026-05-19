import { describe, expect, it } from 'vitest'
import { appendTaxonomyOption } from '@/features/jobs/taxonomy-chip-row'
import { toggleInList } from '@/lib/jobs/servicenow-job-taxonomy'

const CATALOG = ['ITSM', 'CSM', 'SPM'] as const

describe('appendTaxonomyOption', () => {
  it('appends and sorts by catalog order', () => {
    expect(appendTaxonomyOption(['ITSM'], 'SPM', CATALOG)).toEqual([
      'ITSM',
      'SPM',
    ])
  })

  it('does not add duplicates', () => {
    const initial = ['ITSM', 'CSM']
    expect(appendTaxonomyOption(initial, 'CSM', CATALOG)).toBe(initial)
  })
})

describe('taxonomy chip remove', () => {
  it('removes an item via toggleInList', () => {
    expect(toggleInList(['ITSM', 'CSM'], 'CSM')).toEqual(['ITSM'])
  })
})
