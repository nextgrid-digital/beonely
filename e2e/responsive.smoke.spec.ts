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

    await page.getByRole('link', { name: /roles from linkedin/i }).click()
    await expect(page).toHaveURL(/#linkedin-roles$/)
    await expect(page.locator('#linkedin-roles')).toBeVisible()
  })

  test('primary home CTA is visible in mobile viewport', async ({ page }, testInfo) => {
    if (!testInfo.project.name.toLowerCase().includes('iphone')) {
      test.skip()
    }

    await page.goto('/')
    const cta = page.getByRole('link', { name: /browse jobs/i })
    await expect(cta).toBeVisible()
    const top = await cta.evaluate((el) =>
      el.getBoundingClientRect().top
    )
    const viewportHeight = page.viewportSize()?.height ?? 0
    expect(top).toBeLessThan(viewportHeight)
  })
})
