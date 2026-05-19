import { mkdir, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { IngestLinkedInJobInput } from './ingest-linkedin-jobs'
import {
  SERVICENOW_CERTIFICATION_PATTERNS,
  SERVICENOW_JOB_SKILLS,
  SERVICENOW_MODULE_KEYWORDS,
} from '../../src/lib/jobs/servicenow-job-taxonomy.js'

export const DEFAULT_LINKEDIN_SEARCH_TERMS = [
  'ServiceNow Developer India',
  'ServiceNow Consultant India',
  'ServiceNow Architect India',
  'ServiceNow Admin India',
  'ServiceNow Analyst India',
  'ServiceNow ITSM India',
  'ServiceNow CSM India',
  'ServiceNow HRSD India',
  'ServiceNow ITOM India',
  'ServiceNow CMDB India',
  'ServiceNow SecOps India',
  'ServiceNow GRC India',
]

const SERVICE_NOW_KEYWORDS = [
  'servicenow',
  'now platform',
  'itsm',
  'csm',
  'hrsd',
  'spm',
  'itom',
  'secops',
  'grc',
  'cmdb',
  'flow designer',
  'integrationhub',
  'glide',
]

const ROLE_KEYWORDS = [
  'developer',
  'engineer',
  'architect',
  'consultant',
  'administrator',
  'admin',
  'analyst',
  'manager',
  'lead',
]

const INDIA_LOCATION_KEYWORDS = [
  'india',
  'bengaluru',
  'bangalore',
  'hyderabad',
  'pune',
  'chennai',
  'mumbai',
  'gurugram',
  'gurgaon',
  'noida',
  'new delhi',
  'kochi',
  'kolkata',
  'ahmedabad',
]

const REMOTE_RESTRICTION_KEYWORDS = [
  'united states only',
  'us only',
  'usa only',
  'canada only',
  'uk only',
  'europe only',
  'australia only',
]

const SKILL_TERMS = [...SERVICENOW_JOB_SKILLS]

const MODULE_TERMS = SERVICENOW_MODULE_KEYWORDS

const CERTIFICATION_PATTERNS = SERVICENOW_CERTIFICATION_PATTERNS

export type LinkedInScrapeConfig = {
  searchTerms: string[]
  location: string
  maxPages: number
  pageSize: number
  timeoutMs: number
  delayMs: number
  retryMax: number
  userAgent: string
}

export type LinkedInScrapeSummary = {
  searchTerms: number
  searchRequests: number
  discoveredJobIds: number
  uniqueJobIds: number
  detailRequests: number
  jobsKept: number
  filteredOut: number
  deduped: number
  failed: number
}

export type ScrapeLinkedInJobsResult = {
  jobs: IngestLinkedInJobInput[]
  summary: LinkedInScrapeSummary
}

export type ScrapeLogger = Pick<Console, 'info' | 'warn' | 'error'>

type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>

type JobPostingJsonLd = {
  '@type'?: string
  title?: string
  description?: string
  employmentType?: string | string[]
  url?: string
  hiringOrganization?: {
    name?: string
    logo?: string | { url?: string }
    sameAs?: string | string[]
    url?: string
  }
  jobLocation?:
    | {
        address?: {
          addressLocality?: string
          addressRegion?: string
          addressCountry?: string
        }
      }
    | Array<{
        address?: {
          addressLocality?: string
          addressRegion?: string
          addressCountry?: string
        }
      }>
}

type ParsedJobDetail = {
  jobId: string
  jobTitle: string
  companyName: string
  location: string
  jobDescription: string
  employmentType?: string
  companyLogoUrl?: string
  companyWebsiteUrl?: string
}

const DEFAULT_CONFIG: LinkedInScrapeConfig = {
  searchTerms: DEFAULT_LINKEDIN_SEARCH_TERMS,
  location: 'India',
  maxPages: 3,
  pageSize: 25,
  timeoutMs: 25_000,
  delayMs: 1200,
  retryMax: 2,
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
}

export function resolveLinkedInScrapeConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): LinkedInScrapeConfig {
  return {
    searchTerms: DEFAULT_CONFIG.searchTerms,
    location: env.SCRAPE_LINKEDIN_LOCATION?.trim() || DEFAULT_CONFIG.location,
    maxPages: parsePositiveInt(env.SCRAPE_LINKEDIN_MAX_PAGES, DEFAULT_CONFIG.maxPages),
    pageSize: parsePositiveInt(env.SCRAPE_LINKEDIN_PAGE_SIZE, DEFAULT_CONFIG.pageSize),
    timeoutMs: parsePositiveInt(env.SCRAPE_LINKEDIN_TIMEOUT_MS, DEFAULT_CONFIG.timeoutMs),
    delayMs: parsePositiveInt(env.SCRAPE_LINKEDIN_DELAY_MS, DEFAULT_CONFIG.delayMs),
    retryMax: parseNonNegativeInt(env.SCRAPE_LINKEDIN_RETRY_MAX, DEFAULT_CONFIG.retryMax),
    userAgent: env.SCRAPE_LINKEDIN_USER_AGENT?.trim() || DEFAULT_CONFIG.userAgent,
  }
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10)
  if (Number.isFinite(value) && value > 0) return value
  return fallback
}

function parseNonNegativeInt(raw: string | undefined, fallback: number): number {
  const value = Number.parseInt(raw ?? '', 10)
  if (Number.isFinite(value) && value >= 0) return value
  return fallback
}

export function extractLinkedInJobId(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  if (/^\d{5,}$/.test(trimmed)) return trimmed

  let decoded: string
  try {
    decoded = decodeURIComponent(trimmed)
  } catch {
    decoded = trimmed
  }

  const patterns = [
    /jobs\/view\/(?:[a-z0-9-]+-)?(\d{5,})/i,
    /currentJobId=(\d{5,})/i,
    /jobPosting:(\d{5,})/i,
  ]

  for (const pattern of patterns) {
    const match = decoded.match(pattern)
    if (match?.[1]) return match[1]
  }

  return null
}

export function canonicalLinkedInApplyUrl(jobIdOrUrl: string): string {
  const jobId = extractLinkedInJobId(jobIdOrUrl)
  if (!jobId) {
    const trimmed = jobIdOrUrl.trim()
    return trimmed || 'https://www.linkedin.com/jobs/'
  }
  return `https://www.linkedin.com/jobs/view/${jobId}`
}

export function extractJobIdsFromSearchHtml(html: string): string[] {
  const ids = new Set<string>()
  const pattern =
    /(?:jobs\/view\/(?:[a-z0-9-]+-)?(\d{5,})|currentJobId=(\d{5,})|jobPosting:(\d{5,}))/gi

  let match: RegExpExecArray | null
  while ((match = pattern.exec(html)) !== null) {
    const id = match[1] || match[2] || match[3]
    if (id) ids.add(id)
  }

  return [...ids]
}

export function normalizeEmploymentType(text: string): IngestLinkedInJobInput['employment_type'] {
  const value = text.toLowerCase()
  if (value.includes('freelance')) return 'freelance'
  if (value.includes('contract')) return 'contract'
  if (value.includes('part-time') || value.includes('part time')) return 'part_time'
  if (value.includes('intern')) return 'part_time'
  return 'full_time'
}

export function normalizeExperienceLevel(text: string): IngestLinkedInJobInput['experience_level'] {
  const value = text.toLowerCase()
  if (/\b(intern|internship|fresher|entry|junior)\b/.test(value)) return 'entry'
  if (/\b(principal|staff)\b/.test(value)) return 'principal'
  if (/\b(lead|manager|head)\b/.test(value)) return 'lead'
  if (/\b(senior|sr\.?\b)\b/.test(value)) return 'senior'
  return 'mid'
}

export function normalizeWorkMode(text: string): IngestLinkedInJobInput['work_mode'] {
  const value = text.toLowerCase()
  if (value.includes('hybrid')) return 'hybrid'
  if (/\b(onsite|on-site|on site|in office|office-based)\b/.test(value)) return 'onsite'
  if (/\b(remote|wfh|work from home)\b/.test(value)) return 'remote'
  return 'remote'
}

export function normalizeJobType(title: string): IngestLinkedInJobInput['job_type'] {
  const value = title.toLowerCase()
  if (value.includes('architect')) return 'architect'
  if (value.includes('consultant')) return 'consultant'
  if (/\b(admin|administrator)\b/.test(value)) return 'admin'
  if (value.includes('analyst')) return 'analyst'
  if (/\b(manager|lead|head)\b/.test(value)) return 'manager'
  if (/\b(developer|engineer)\b/.test(value)) return 'developer'
  return 'other'
}

export function isServiceNowRelated(text: string): boolean {
  const value = text.toLowerCase()
  const hasPlatformSignal = SERVICE_NOW_KEYWORDS.some((keyword) => value.includes(keyword))
  if (!hasPlatformSignal) return false
  return ROLE_KEYWORDS.some((keyword) => value.includes(keyword)) || value.includes('servicenow')
}

export function isIndiaOrIndiaRemoteJob(input: {
  location: string
  description: string
  workMode: IngestLinkedInJobInput['work_mode']
}): boolean {
  const haystack = `${input.location} ${input.description}`.toLowerCase()
  if (INDIA_LOCATION_KEYWORDS.some((keyword) => haystack.includes(keyword))) return true
  if (input.workMode === 'remote') {
    return !REMOTE_RESTRICTION_KEYWORDS.some((keyword) => haystack.includes(keyword))
  }
  return false
}

export function extractSkills(text: string): string[] {
  const value = text.toLowerCase()
  return SKILL_TERMS.filter((skill) => value.includes(skill.toLowerCase()))
}

export function extractModules(text: string): string[] {
  const value = text.toLowerCase()
  const modules: string[] = []
  for (const [moduleName, keywords] of Object.entries(MODULE_TERMS)) {
    if (keywords.some((keyword) => value.includes(keyword))) modules.push(moduleName)
  }
  return modules
}

export function extractCertifications(text: string): string[] {
  const certifications = new Set<string>()
  for (const [pattern, label] of CERTIFICATION_PATTERNS) {
    if (pattern.test(text)) certifications.add(label)
  }
  return [...certifications]
}

export function stripHtmlToText(rawHtml: string): string {
  return decodeHtmlEntities(
    rawHtml
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<\s*br\s*\/?\s*>/gi, '\n')
      .replace(/<\/(p|div|li|ul|ol|h1|h2|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '• ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\r/g, '')
      .replace(/\t/g, ' ')
      .replace(/\u00a0/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ ]{2,}/g, ' ')
      .trim()
  )
}

function decodeHtmlEntities(input: string): string {
  const named: Record<string, string> = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' ',
  }

  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (entity, token: string) => {
    const lower = token.toLowerCase()
    if (lower.startsWith('#x')) {
      const code = Number.parseInt(lower.slice(2), 16)
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity
    }
    if (lower.startsWith('#')) {
      const code = Number.parseInt(lower.slice(1), 10)
      return Number.isFinite(code) ? String.fromCodePoint(code) : entity
    }
    return named[lower] ?? entity
  })
}

function normalizeJsonLdCandidates(candidate: unknown): JobPostingJsonLd[] {
  if (!candidate || typeof candidate !== 'object') return []
  const root = candidate as Record<string, unknown>

  const stack: unknown[] = [root]
  if (Array.isArray(root['@graph'])) stack.push(...root['@graph'])

  const postings: JobPostingJsonLd[] = []
  for (const item of stack) {
    if (!item || typeof item !== 'object') continue
    const typed = item as JobPostingJsonLd
    if (String(typed['@type'] ?? '').toLowerCase().includes('jobposting')) {
      postings.push(typed)
    }
  }
  return postings
}

function parseJobPostingJsonLd(html: string): JobPostingJsonLd | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match: RegExpExecArray | null

  while ((match = scriptPattern.exec(html)) !== null) {
    const raw = match[1]?.trim()
    if (!raw) continue

    try {
      const parsed = JSON.parse(raw) as unknown
      const postings = normalizeJsonLdCandidates(parsed)
      if (postings.length > 0) return postings[0]
    } catch {
      continue
    }
  }

  return null
}

function parseLocationFromJsonLd(location: JobPostingJsonLd['jobLocation']): string {
  if (!location) return ''

  const locationItems = Array.isArray(location) ? location : [location]
  const first = locationItems[0]
  if (!first?.address) return ''

  const parts = [
    first.address.addressLocality,
    first.address.addressRegion,
    first.address.addressCountry,
  ].filter(Boolean)

  return parts.join(', ')
}

function captureAttrValue(html: string, pattern: RegExp): string {
  const match = html.match(pattern)
  return match?.[1]?.trim() ?? ''
}

function captureAttrValueFromTag(tagHtml: string, attrName: string): string {
  const escapedAttr = attrName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const pattern = new RegExp(`${escapedAttr}=["']([^"']+)["']`, 'i')
  const match = tagHtml.match(pattern)
  return decodeHtmlEntities(match?.[1]?.trim() ?? '')
}

function findTagContentByClass(html: string, classPattern: RegExp): string {
  const pattern = new RegExp(
    `<([a-z0-9]+)[^>]*class=["'][^"']*${classPattern.source}[^"']*["'][^>]*>([\\s\\S]*?)<\\/\\1>`,
    classPattern.flags.includes('i') ? classPattern.flags : `${classPattern.flags}i`
  )
  const match = html.match(pattern)
  return match?.[2]?.trim() ?? ''
}

function findDivInnerHtmlByClass(html: string, classPattern: RegExp): string {
  const tagPattern = new RegExp(
    `<div[^>]*class=["'][^"']*${classPattern.source}[^"']*["'][^>]*>`,
    classPattern.flags.includes('i') ? classPattern.flags : `${classPattern.flags}i`
  )
  const match = tagPattern.exec(html)
  if (!match || match.index < 0) return ''

  const openIndex = match.index
  const openEnd = openIndex + match[0].length

  const divTagPattern = /<\/?div\b[^>]*>/gi
  divTagPattern.lastIndex = openEnd

  let depth = 1
  let endIndex = html.length
  let divMatch: RegExpExecArray | null

  while ((divMatch = divTagPattern.exec(html)) !== null) {
    const token = divMatch[0]
    if (token.startsWith('</')) {
      depth -= 1
      if (depth === 0) {
        endIndex = divMatch.index
        break
      }
    } else {
      depth += 1
    }
  }

  return html.slice(openEnd, endIndex)
}

function sanitizeHttpUrl(raw: string | undefined): string | null {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.hostname === 'linkedin.com') url.hostname = 'www.linkedin.com'
    return url.toString()
  } catch {
    return null
  }
}

function isLikelyCompanyWebsite(url: string): boolean {
  try {
    const parsed = new URL(url)
    return !parsed.hostname.endsWith('linkedin.com')
  } catch {
    return false
  }
}

function canonicalCompanyWebsiteUrl(raw: string | undefined): string | undefined {
  const sanitized = sanitizeHttpUrl(raw)
  if (!sanitized || !isLikelyCompanyWebsite(sanitized)) return undefined
  const parsed = new URL(sanitized)
  parsed.search = ''
  parsed.hash = ''
  return parsed.toString().replace(/\/$/, '')
}

function canonicalCompanyLogoUrl(raw: string | undefined): string | undefined {
  const sanitized = sanitizeHttpUrl(raw)
  if (!sanitized) return undefined
  const parsed = new URL(sanitized)
  parsed.hash = ''
  return parsed.toString()
}

function buildFaviconUrlForCompanyWebsite(website: string | undefined): string | undefined {
  const canonicalWebsite = canonicalCompanyWebsiteUrl(website)
  if (!canonicalWebsite) return undefined
  const domain = new URL(canonicalWebsite).hostname.replace(/^www\./, '')
  if (!domain) return undefined
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`
}

function extractCompanyWebsiteFromJsonLd(
  hiringOrganization: JobPostingJsonLd['hiringOrganization']
): string | undefined {
  if (!hiringOrganization) return undefined

  const sameAs = Array.isArray(hiringOrganization.sameAs)
    ? hiringOrganization.sameAs
    : hiringOrganization.sameAs
      ? [hiringOrganization.sameAs]
      : []
  const candidates = [hiringOrganization.url, ...sameAs]

  for (const candidate of candidates) {
    const canonical = canonicalCompanyWebsiteUrl(candidate)
    if (canonical) return canonical
  }

  return undefined
}

function extractCompanyLogoFromJsonLd(
  hiringOrganization: JobPostingJsonLd['hiringOrganization']
): string | undefined {
  if (!hiringOrganization?.logo) return undefined
  const raw =
    typeof hiringOrganization.logo === 'string'
      ? hiringOrganization.logo
      : hiringOrganization.logo.url
  return canonicalCompanyLogoUrl(raw)
}

function extractImageUrlFromTag(tagHtml: string): string | undefined {
  const candidates = [
    captureAttrValueFromTag(tagHtml, 'data-delayed-url'),
    captureAttrValueFromTag(tagHtml, 'src'),
    captureAttrValueFromTag(tagHtml, 'data-ghost-url'),
  ]
  for (const candidate of candidates) {
    const canonical = canonicalCompanyLogoUrl(candidate)
    if (canonical) return canonical
  }
  return undefined
}

function findCompanyLogoFromMarkup(html: string): string | undefined {
  const topCardLogoMatch = html.match(
    /data-tracking-control-name=["']public_jobs_topcard_logo["'][\s\S]*?<img[^>]*>/i
  )
  if (topCardLogoMatch) {
    const tagMatch = topCardLogoMatch[0].match(/<img[^>]*>/i)
    if (tagMatch) {
      const logo = extractImageUrlFromTag(tagMatch[0])
      if (logo) return logo
    }
  }

  const contextualLogoMatch = html.match(
    /<img[^>]*class=["'][^"']*contextual-sign-in-modal__img[^"']*["'][^>]*>/i
  )
  if (contextualLogoMatch) {
    const logo = extractImageUrlFromTag(contextualLogoMatch[0])
    if (logo) return logo
  }

  const firstEntityImageMatch = html.match(
    /<img[^>]*class=["'][^"']*artdeco-entity-image[^"']*["'][^>]*>/i
  )
  if (firstEntityImageMatch) {
    const logo = extractImageUrlFromTag(firstEntityImageMatch[0])
    if (logo) return logo
  }

  return undefined
}

export function parseLinkedInJobDetailHtml(jobId: string, html: string): ParsedJobDetail | null {
  const jsonLd = parseJobPostingJsonLd(html)

  const metaTitle = captureAttrValue(
    html,
    /<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["'][^>]*>/i
  )
  const titleFromMarkup =
    findTagContentByClass(html, /top-card-layout__title/) ||
    findTagContentByClass(html, /topcard__title/)
  const companyFromMarkup =
    findTagContentByClass(html, /topcard__org-name-link/) ||
    findTagContentByClass(html, /topcard__flavor/) ||
    captureAttrValue(
      html,
      /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i
    )

  const locationFromMarkup =
    findTagContentByClass(html, /topcard__flavor--bullet/) ||
    findTagContentByClass(html, /job-search-card__location/)

  const companyWebsiteFromJsonLd = extractCompanyWebsiteFromJsonLd(jsonLd?.hiringOrganization)
  const companyLogoFromJsonLd = extractCompanyLogoFromJsonLd(jsonLd?.hiringOrganization)
  const companyLogoFromMarkup = findCompanyLogoFromMarkup(html)
  const companyLogoFromMeta = canonicalCompanyLogoUrl(
    captureAttrValue(
      html,
      /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i
    )
  )

  const descriptionHtml =
    findDivInnerHtmlByClass(html, /show-more-less-html__markup/) ||
    findDivInnerHtmlByClass(html, /jobs-description-content__text/) ||
    findDivInnerHtmlByClass(html, /description__text/) ||
    ''

  const jobTitle = stripHtmlToText(
    jsonLd?.title || titleFromMarkup || metaTitle.replace(/\s*\|\s*LinkedIn\s*$/i, '')
  )
  const companyName = stripHtmlToText(jsonLd?.hiringOrganization?.name || companyFromMarkup)
  const location = stripHtmlToText(parseLocationFromJsonLd(jsonLd?.jobLocation) || locationFromMarkup)

  const descriptionRaw =
    jsonLd?.description ||
    descriptionHtml ||
    captureAttrValue(html, /<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["'][^>]*>/i)

  const jobDescription = stripHtmlToText(descriptionRaw)

  if (!jobTitle || !companyName || !jobDescription) return null

  const idFromJson = extractLinkedInJobId(jsonLd?.url ?? '')
  const normalizedJobId = idFromJson || jobId
  if (!normalizedJobId) return null

  const employmentTypeRaw = Array.isArray(jsonLd?.employmentType)
    ? jsonLd?.employmentType[0]
    : jsonLd?.employmentType

  const companyLogoUrl =
    companyLogoFromJsonLd ||
    companyLogoFromMarkup ||
    companyLogoFromMeta ||
    buildFaviconUrlForCompanyWebsite(companyWebsiteFromJsonLd)

  return {
    jobId: normalizedJobId,
    jobTitle,
    companyName,
    location: location || 'Remote, India',
    jobDescription,
    employmentType: employmentTypeRaw,
    companyLogoUrl,
    companyWebsiteUrl: companyWebsiteFromJsonLd,
  }
}

function buildSearchUrl(query: string, location: string, start: number): string {
  const params = new URLSearchParams({
    keywords: query,
    location,
    start: String(start),
  })
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params.toString()}`
}

function buildDetailUrl(jobId: string): string {
  return `https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${jobId}`
}

function defaultHeaders(userAgent: string): Record<string, string> {
  return {
    'user-agent': userAgent,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'accept-language': 'en-US,en;q=0.9',
    pragma: 'no-cache',
    'cache-control': 'no-cache',
  }
}

async function fetchTextWithRetry(options: {
  url: string
  timeoutMs: number
  retryMax: number
  userAgent: string
  fetchImpl: FetchLike
  logger: ScrapeLogger
}): Promise<string> {
  const headers = defaultHeaders(options.userAgent)

  let lastError: Error | null = null
  for (let attempt = 0; attempt <= options.retryMax; attempt++) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), options.timeoutMs)

    try {
      const response = await options.fetchImpl(options.url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      options.logger.warn(
        `[linkedin-scrape] request failed (attempt ${attempt + 1}/${options.retryMax + 1}) url=${options.url} reason=${lastError.message}`
      )

      if (attempt < options.retryMax) {
        const waitMs = 750 * (attempt + 1)
        await sleep(waitMs)
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  throw lastError ?? new Error(`Request failed: ${options.url}`)
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function stableSortJobs(jobs: IngestLinkedInJobInput[]): IngestLinkedInJobInput[] {
  return [...jobs].sort((a, b) => {
    const byId = (a.external_id ?? '').localeCompare(b.external_id ?? '')
    if (byId !== 0) return byId
    return a.apply_url.localeCompare(b.apply_url)
  })
}

function buildIngestInputFromParsed(job: ParsedJobDetail): IngestLinkedInJobInput {
  const signalText = `${job.jobTitle}\n${job.location}\n${job.jobDescription}`
  const workMode = normalizeWorkMode(signalText)

  return {
    external_id: `linkedin-${job.jobId}`,
    job_title: job.jobTitle,
    company_name: job.companyName,
    company_logo: job.companyLogoUrl,
    company_website: job.companyWebsiteUrl,
    location: job.location,
    apply_url: canonicalLinkedInApplyUrl(job.jobId),
    job_description: job.jobDescription,
    employment_type: normalizeEmploymentType(job.employmentType ?? signalText),
    experience_level: normalizeExperienceLevel(signalText),
    work_mode: workMode,
    job_type: normalizeJobType(job.jobTitle),
    skills: extractSkills(signalText),
    modules: extractModules(signalText),
    certifications: extractCertifications(signalText),
  }
}

export async function scrapeLinkedInJobs(
  config: LinkedInScrapeConfig,
  options?: {
    fetchImpl?: FetchLike
    logger?: ScrapeLogger
  }
): Promise<ScrapeLinkedInJobsResult> {
  const fetchImpl = options?.fetchImpl ?? fetch
  const logger = options?.logger ?? console

  const summary: LinkedInScrapeSummary = {
    searchTerms: config.searchTerms.length,
    searchRequests: 0,
    discoveredJobIds: 0,
    uniqueJobIds: 0,
    detailRequests: 0,
    jobsKept: 0,
    filteredOut: 0,
    deduped: 0,
    failed: 0,
  }

  const discoveredJobIds = new Set<string>()

  for (const term of config.searchTerms) {
    for (let page = 0; page < config.maxPages; page++) {
      const start = page * config.pageSize
      const url = buildSearchUrl(term, config.location, start)
      summary.searchRequests += 1

      try {
        const html = await fetchTextWithRetry({
          url,
          timeoutMs: config.timeoutMs,
          retryMax: config.retryMax,
          userAgent: config.userAgent,
          fetchImpl,
          logger,
        })

        const ids = extractJobIdsFromSearchHtml(html)
        summary.discoveredJobIds += ids.length
        let uniqueInPage = 0
        for (const id of ids) {
          if (!discoveredJobIds.has(id)) {
            discoveredJobIds.add(id)
            uniqueInPage += 1
          }
        }

        logger.info(
          `[linkedin-scrape] query="${term}" page=${page + 1}/${config.maxPages} ids=${ids.length} uniqueAdded=${uniqueInPage}`
        )
      } catch (error) {
        summary.failed += 1
        const message = error instanceof Error ? error.message : String(error)
        logger.error(
          `[linkedin-scrape] search failed query="${term}" page=${page + 1} reason=${message}`
        )
      }

      await sleep(config.delayMs)
    }
  }

  summary.uniqueJobIds = discoveredJobIds.size
  if (summary.uniqueJobIds === 0) {
    throw new Error('No LinkedIn job ids discovered from guest search results')
  }

  const byApplyUrl = new Map<string, IngestLinkedInJobInput>()

  for (const jobId of [...discoveredJobIds].sort()) {
    summary.detailRequests += 1
    const url = buildDetailUrl(jobId)

    try {
      const html = await fetchTextWithRetry({
        url,
        timeoutMs: config.timeoutMs,
        retryMax: config.retryMax,
        userAgent: config.userAgent,
        fetchImpl,
        logger,
      })

      const parsed = parseLinkedInJobDetailHtml(jobId, html)
      if (!parsed) {
        summary.filteredOut += 1
        continue
      }

      const relevanceSignal = `${parsed.jobTitle}\n${parsed.companyName}\n${parsed.jobDescription}`
      if (!isServiceNowRelated(relevanceSignal)) {
        summary.filteredOut += 1
        continue
      }

      const normalized = buildIngestInputFromParsed(parsed)
      if (
        !isIndiaOrIndiaRemoteJob({
          location: normalized.location ?? '',
          description: normalized.job_description,
          workMode: normalized.work_mode ?? 'remote',
        })
      ) {
        summary.filteredOut += 1
        continue
      }

      const applyUrl = canonicalLinkedInApplyUrl(normalized.apply_url)
      normalized.apply_url = applyUrl

      if (byApplyUrl.has(applyUrl)) {
        summary.deduped += 1
        continue
      }

      byApplyUrl.set(applyUrl, normalized)
      summary.jobsKept += 1
    } catch (error) {
      summary.failed += 1
      const message = error instanceof Error ? error.message : String(error)
      logger.error(`[linkedin-scrape] detail failed jobId=${jobId} reason=${message}`)
    }

    await sleep(config.delayMs)
  }

  if (summary.jobsKept === 0) {
    throw new Error(
      'Scrape completed but no valid ServiceNow jobs remained after filtering (India/remote + quality checks)'
    )
  }

  return {
    jobs: stableSortJobs([...byApplyUrl.values()]),
    summary,
  }
}

export async function writeJobsJsonAtomically(
  outputPath: string,
  jobs: IngestLinkedInJobInput[]
): Promise<void> {
  const dir = dirname(outputPath)
  await mkdir(dir, { recursive: true })
  const tempFile = `${outputPath}.tmp`
  const content = `${JSON.stringify(jobs, null, 2)}\n`
  await writeFile(tempFile, content, 'utf8')
  await rename(tempFile, outputPath)
}
