import { describe, expect, it } from 'vitest'
import { defaultFormValues } from '@/features/recruiter/recruiter-job-editor-page'
import {
  filterToKnownTaxonomy,
  sortTaxonomyLabels,
  toggleInList,
  SERVICENOW_JOB_MODULES,
} from '@/lib/jobs/servicenow-job-taxonomy'

describe('servicenow-job-taxonomy', () => {
  it('toggleInList adds and removes items', () => {
    expect(toggleInList([], 'ITSM')).toEqual(['ITSM'])
    expect(toggleInList(['ITSM'], 'ITSM')).toEqual([])
    expect(toggleInList(['ITSM'], 'CSM')).toEqual(['ITSM', 'CSM'])
  })

  it('sortTaxonomyLabels follows catalog order', () => {
    expect(sortTaxonomyLabels(['CMDB', 'ITSM'], SERVICENOW_JOB_MODULES)).toEqual(
      ['ITSM', 'CMDB']
    )
  })

  it('filterToKnownTaxonomy drops unknown labels', () => {
    expect(
      filterToKnownTaxonomy(['ITSM', 'Unknown'], SERVICENOW_JOB_MODULES)
    ).toEqual(['ITSM'])
  })
})

describe('defaultFormValues', () => {
  it('defaults taxonomy arrays to empty for new jobs', () => {
    const values = defaultFormValues(null)
    expect(values.modules).toEqual([])
    expect(values.certifications).toEqual([])
    expect(values.skills).toEqual([])
    expect(values.salary_currency).toBe('INR')
    expect(values.salary_amount).toBe('')
  })
})
