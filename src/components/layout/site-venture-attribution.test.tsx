import { describe, expect, it } from 'vitest'
import { render } from 'vitest-browser-react'
import { SiteVentureAttribution } from './site-venture-attribution'

describe('SiteVentureAttribution', () => {
  it('renders venture attribution with external link', async () => {
    const screen = await render(<SiteVentureAttribution />)

    await expect
      .element(screen.getByTestId('site-venture-attribution'))
      .toBeInTheDocument()
    await expect.element(screen.getByText(/A venture by/i)).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'NextGrid.Digital' })
    await expect.element(link).toHaveAttribute('href', 'https://nextgrid.digital')
    await expect.element(link).toHaveAttribute('target', '_blank')
    await expect
      .element(link)
      .toHaveAttribute('rel', 'noopener noreferrer')
  })
})
