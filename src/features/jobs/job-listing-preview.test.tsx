import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { JobListingPreview } from '@/features/jobs/job-listing-preview'

describe('JobListingPreview', () => {
  it('renders selected modules and certifications', async () => {
    const screen = await render(
      <JobListingPreview
        data={{
          title: 'ServiceNow Developer',
          company: 'Acme',
          location: 'Remote India',
          modules: ['ITSM', 'CSM'],
          certifications: ['CSA'],
          skills: ['Flow Designer'],
          description: '<p>Build workflows on the Now Platform.</p>',
        }}
      />
    )

    await expect.element(screen.getByText('ServiceNow Developer')).toBeVisible()
    await expect.element(screen.getByText('Acme')).toBeVisible()
    await expect.element(screen.getByText('ITSM')).toBeVisible()
    await expect.element(screen.getByText('CSM')).toBeVisible()
    await expect.element(screen.getByText('CSA')).toBeVisible()
    await expect.element(screen.getByText('Flow Designer')).toBeVisible()
    await expect.element(screen.getByText('About this role')).toBeVisible()
  })

  it('renders public variant with candidate page heading', async () => {
    const screen = await render(
      <JobListingPreview
        variant='public'
        showBanner={false}
        data={{
          title: 'ServiceNow Developer',
          company: 'Acme',
          description: '<p>Role details</p>',
        }}
      />
    )

    await expect
      .element(
        screen.getByRole('heading', { level: 1, name: 'ServiceNow Developer' })
      )
      .toBeVisible()
    await expect.element(screen.getByText('Role details')).toBeVisible()
  })
})
