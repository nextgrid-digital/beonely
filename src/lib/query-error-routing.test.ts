import { AxiosError } from 'axios'
import { describe, expect, it } from 'vitest'
import {
  shouldBypassGlobal500Redirect,
  shouldNavigateTo500FromQueryError,
} from '@/lib/query-error-routing'

function axiosError(status: number, url = '/api/test'): AxiosError {
  const error = new AxiosError(`HTTP ${status}`)
  const config = { url, headers: {} } as AxiosError['config']
  error.config = config
  error.response = {
    status,
    statusText: 'Error',
    data: {},
    headers: {},
    config: config as NonNullable<AxiosError['response']>['config'],
  }
  return error
}

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
  it('returns false for non-axios and non-500 errors', () => {
    expect(shouldNavigateTo500FromQueryError(new Error('x'), ['admin-jobs'])).toBe(
      false
    )
    expect(
      shouldNavigateTo500FromQueryError(axiosError(404), ['admin-jobs'])
    ).toBe(false)
  })

  it('suppresses 500 redirect for auth/apply/profile flows', () => {
    expect(
      shouldNavigateTo500FromQueryError(
        axiosError(500, '/rest/v1/job_seeker_profiles'),
        ['job-seeker-profile', 'u1']
      )
    ).toBe(false)
  })

  it('keeps 500 redirect for unrelated critical queries', () => {
    expect(
      shouldNavigateTo500FromQueryError(
        axiosError(500, '/api/admin/jobs'),
        ['admin-jobs']
      )
    ).toBe(true)
  })

  it('suppresses repeated /500 navigations for the same error signature in one cycle', () => {
    const err = axiosError(500, '/api/admin/jobs')
    expect(
      shouldNavigateTo500FromQueryError(err, ['admin-jobs'], { now: 1000 })
    ).toBe(true)
    expect(
      shouldNavigateTo500FromQueryError(err, ['admin-jobs'], { now: 2000 })
    ).toBe(false)
    expect(
      shouldNavigateTo500FromQueryError(err, ['admin-jobs'], { now: 5001 })
    ).toBe(true)
  })

  it('never re-routes when already on /500', () => {
    expect(
      shouldNavigateTo500FromQueryError(axiosError(500, '/api/admin/jobs'), ['admin-jobs'], {
        currentPathname: '/500',
      })
    ).toBe(false)
  })
})
