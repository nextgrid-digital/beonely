// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { JobListingMetaBadges } from '@/features/jobs/job-listing-meta-badges'
import { JobListingShell } from '@/features/jobs/job-listing-shell'

describe('JobListingShell (inline edit layout)', () => {
  it('renders title slot and live meta badges', async () => {
    const screen = await render(
      <JobListingShell
        logo={<div data-testid='logo'>Logo</div>}
        title={
          <input
            aria-label='Job title'
            defaultValue='ServiceNow Developer'
            readOnly
          />
        }
        company={<span>Acme Corp</span>}
        meta={
          <JobListingMetaBadges location='Remote India' modules={['ITSM']} />
        }
        body={<p>About body</p>}
      />
    )

    await expect.element(screen.getByLabelText('Job title')).toBeVisible()
    await expect.element(screen.getByText('Remote India')).toBeVisible()
    await expect.element(screen.getByText('ITSM')).toBeVisible()
  })
})
