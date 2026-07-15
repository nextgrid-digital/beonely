/** Supported salary currencies for job listings (stored in `jobs.salary_range`). */
export const JOB_SALARY_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹)' },
  { code: 'USD', symbol: '$', label: 'USD ($)' },
  { code: 'GBP', symbol: '£', label: 'GBP (£)' },
  { code: 'EUR', symbol: '€', label: 'EUR (€)' },
  { code: 'AED', symbol: 'AED', label: 'AED' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$)' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$)' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$)' },
] as const

export type JobSalaryCurrencyCode =
  (typeof JOB_SALARY_CURRENCIES)[number]['code']

const CURRENCY_CODES = new Set<string>(JOB_SALARY_CURRENCIES.map((c) => c.code))

export function parseSalaryRange(stored: string | null | undefined): {
  currency: JobSalaryCurrencyCode
  amount: string
} {
  const trimmed = stored?.trim() ?? ''
  if (!trimmed) {
    return { currency: 'INR', amount: '' }
  }

  const coded = trimmed.match(/^([A-Z]{3})\s*[·•|]\s*(.+)$/i)
  if (coded) {
    const code = coded[1].toUpperCase()
    return {
      currency: CURRENCY_CODES.has(code)
        ? (code as JobSalaryCurrencyCode)
        : 'INR',
      amount: coded[2].trim(),
    }
  }

  if (trimmed.startsWith('₹')) {
    return { currency: 'INR', amount: trimmed.replace(/^₹\s*/, '').trim() }
  }
  if (trimmed.startsWith('$')) {
    return { currency: 'USD', amount: trimmed.replace(/^\$\s*/, '').trim() }
  }
  if (trimmed.startsWith('£')) {
    return { currency: 'GBP', amount: trimmed.replace(/^£\s*/, '').trim() }
  }
  if (trimmed.startsWith('€')) {
    return { currency: 'EUR', amount: trimmed.replace(/^€\s*/, '').trim() }
  }

  return { currency: 'INR', amount: trimmed }
}

export function formatSalaryRange(
  currency: string,
  amount: string | undefined
): string | null {
  const a = amount?.trim() ?? ''
  if (!a) return null
  const code = CURRENCY_CODES.has(currency) ? currency : 'INR'
  return `${code} · ${a}`
}

export function displaySalaryRange(
  stored: string | null | undefined
): string | null {
  const trimmed = stored?.trim()
  if (!trimmed) return null
  const { currency, amount } = parseSalaryRange(trimmed)
  if (!amount) return null
  const meta = JOB_SALARY_CURRENCIES.find((c) => c.code === currency)
  if (meta?.symbol && meta.symbol.length === 1) {
    return `${meta.symbol}${amount}`
  }
  return formatSalaryRange(currency, amount)
}
