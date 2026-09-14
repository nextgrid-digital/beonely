import { expect, test } from 'playwright/test'

const CORE_ROUTES = ['/', '/jobs/linkedin-4410574580', '/sign-in', '/sign-up']

async function expectNoHorizontalOverflow(
  page: import('playwright/test').Page
) {
  const hasOverflow = await page.evaluate(() => {
    const root = document.documentElement
    const body = document.body
    return (
      root.scrollWidth > root.clientWidth + 1 ||
      body.scrollWidth > body.clientWidth + 1
    )
  })
  expect(hasOverflow).toBe(false)
}

test.describe('responsive smoke', () => {
  test('detailed date dropdown can select the 90-day window', async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Filters', exact: true }).click()
    await page
      .getByRole('combobox', { name: 'Date posted', exact: true })
      .click()
    await page
      .getByRole('option', { name: 'Last 90 days', exact: true })
      .click()
    await expect(page).toHaveURL(/posted=90d/)
    const closeButton = page.getByRole('button', { name: 'Close', exact: true })
    if (await closeButton.isVisible()) await closeButton.click()
    await expect(
      page
        .getByRole('group', { name: 'Date posted', exact: true })
        .getByRole('button', { name: 'Last 90 days', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
  })

  test('date shortcuts persist in URLs, survive reload, and combine with search', async ({
    page,
  }) => {
    await page.goto('/?q=ServiceNow')
    const dates = page.getByRole('group', { name: 'Date posted', exact: true })
    for (const [label, token] of [
      ['Last 7 days', '7d'],
      ['Last 30 days', '30d'],
      ['Last 90 days', '90d'],
    ]) {
      const button = dates.getByRole('button', { name: label, exact: true })
      await button.click()
      await expect(page).toHaveURL(new RegExp(`posted=${token}`))
      expect(new URL(page.url()).searchParams.get('q')).toBe('ServiceNow')
      await expect(button).toHaveAttribute('aria-pressed', 'true')
      await expectNoHorizontalOverflow(page)
    }
    await page.reload()
    await expect(
      dates.getByRole('button', { name: 'Last 90 days', exact: true })
    ).toHaveAttribute('aria-pressed', 'true')
    await dates.getByRole('button', { name: 'Any time', exact: true }).click()
    await expect(page).not.toHaveURL(/posted=/)
    expect(new URL(page.url()).searchParams.get('q')).toBe('ServiceNow')
  })

  for (const route of CORE_ROUTES) {
    test(`layout does not overflow on ${route}`, async ({ page }) => {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await expectNoHorizontalOverflow(page)
    })
  }

  test('mobile menu opens and navigates to public sections', async ({
    page,
    browserName,
  }, testInfo) => {
    if (
      browserName !== 'chromium' ||
      !testInfo.project.name.toLowerCase().includes('iphone')
    ) {
      test.skip()
    }

    await page.goto('/')
    const menuButton = page.getByRole('button', {
      name: /open navigation menu/i,
    })
    await expect(menuButton).toBeVisible()
    await menuButton.click()

    await expect(
      page.getByRole('button', { name: /close navigation menu/i })
    ).toBeVisible()

    await page.getByRole('link', { name: /open roles/i }).click()
    await expect(page).toHaveURL(/#open-roles$/)
    await expect(page.locator('#open-roles')).toBeVisible()
  })

  test('/500 redirects to home without a 500 error page', async ({ page }) => {
    await page.goto('/500')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/$/)
    await expect(
      page.getByRole('heading', { name: '500', exact: true })
    ).toHaveCount(0)
  })

  test('public routes do not show a 500 error page', async ({ page }) => {
    for (const route of CORE_ROUTES) {
      await page.goto(route)
      await page.waitForLoadState('networkidle')
      await expect(
        page.getByRole('heading', { name: '500', exact: true })
      ).toHaveCount(0)
    }
  })

  test('primary home CTA is visible in mobile viewport', async ({
    page,
  }, testInfo) => {
    if (!testInfo.project.name.toLowerCase().includes('iphone')) {
      test.skip()
    }

    await page.goto('/')
    const cta = page.getByRole('link', { name: /join as candidate/i })
    await expect(cta).toBeVisible()
    const top = await cta.evaluate((el) => el.getBoundingClientRect().top)
    const viewportHeight = page.viewportSize()?.height ?? 0
    expect(top).toBeLessThan(viewportHeight)
  })
})
