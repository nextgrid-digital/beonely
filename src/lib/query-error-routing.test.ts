import { describe, expect, it } from 'vitest'
import {
  shouldBypassGlobal500Redirect,
  shouldNavigateTo500FromQueryError,
} from '@/lib/query-error-routing'

describe('shouldBypassGlobal500Redirect', () => {
  it('bypasses known apply/profile query roots', () => {
    expect(
      shouldBypassGlobal500Redirect(
        ['beonely-application', 'u1', 'job1'],
        '/rest/v1/applications'
      )
    ).toBe(true)
    expect(
      shouldBypassGlobal500Redirect(
        ['job-seeker-profile', 'u1'],
        '/rest/v1/job_seeker_profiles'
      )
    ).toBe(true)
  })

  it('does not bypass unrelated roots', () => {
    expect(
      shouldBypassGlobal500Redirect(['admin-jobs'], '/rest/v1/jobs')
    ).toBe(false)
  })
})

describe('shouldNavigateTo500FromQueryError', () => {
  it('always returns false', () => {
    expect(shouldNavigateTo500FromQueryError()).toBe(false)
  })
})
