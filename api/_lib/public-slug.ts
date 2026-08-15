const JOB_SLUG = /^[a-z0-9](?:[a-z0-9-]{0,118}[a-z0-9])?$/
const PORTFOLIO_SLUG = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/

export function isValidJobSlug(value: string): boolean {
  return JOB_SLUG.test(value)
}

export function isValidPortfolioSlug(value: string): boolean {
  return PORTFOLIO_SLUG.test(value)
}
