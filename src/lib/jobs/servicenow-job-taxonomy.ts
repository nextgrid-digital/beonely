/** Curated ServiceNow modules for job listings (recruiter picker + scrape hints). */
export const SERVICENOW_JOB_MODULES = [
  'ITSM',
  'CSM',
  'HRSD',
  'SPM',
  'ITOM',
  'SecOps',
  'GRC',
  'CMDB',
] as const

/** ServiceNow certifications recruiters can require. */
export const SERVICENOW_JOB_CERTIFICATIONS = [
  'CSA',
  'CAD',
  'CIS-ITSM',
  'CIS-CSM',
  'CIS-HR',
  'CIS-ITOM',
  'CIS-SPM',
] as const

/** Common ServiceNow-related skills for job listings. */
export const SERVICENOW_JOB_SKILLS = [
  'ServiceNow',
  'JavaScript',
  'TypeScript',
  'ITIL',
  'Flow Designer',
  'IntegrationHub',
  'REST API',
  'SOAP',
  'CMDB',
  'Catalog',
  'Now Platform',
  'Business Rules',
  'UI Builder',
  'Scripting',
] as const

export type ServiceNowJobModule = (typeof SERVICENOW_JOB_MODULES)[number]
export type ServiceNowJobCertification =
  (typeof SERVICENOW_JOB_CERTIFICATIONS)[number]
export type ServiceNowJobSkill = (typeof SERVICENOW_JOB_SKILLS)[number]

/** Keyword hints for LinkedIn scrape module extraction (module label → search terms). */
export const SERVICENOW_MODULE_KEYWORDS: Record<ServiceNowJobModule, string[]> =
  {
    ITSM: ['itsm', 'incident', 'problem management', 'change management'],
    CSM: ['csm', 'customer service management'],
    HRSD: ['hrsd', 'hr service delivery'],
    SPM: ['spm', 'strategic portfolio management', 'ppm'],
    ITOM: ['itom', 'discovery', 'service mapping', 'event management'],
    SecOps: ['secops', 'security operations', 'vulnerability response'],
    GRC: ['grc', 'governance risk', 'policy and compliance'],
    CMDB: ['cmdb', 'configuration management database'],
  }

/** Regex patterns for LinkedIn scrape certification extraction. */
export const SERVICENOW_CERTIFICATION_PATTERNS: Array<
  [RegExp, ServiceNowJobCertification]
> = [
  [/\bcsa\b/i, 'CSA'],
  [/\bcad\b/i, 'CAD'],
  [/\bcis[-\s]itsm\b/i, 'CIS-ITSM'],
  [/\bcis[-\s]csm\b/i, 'CIS-CSM'],
  [/\bcis[-\s]hr\b/i, 'CIS-HR'],
  [/\bcis[-\s]itom\b/i, 'CIS-ITOM'],
  [/\bcis[-\s]spm\b/i, 'CIS-SPM'],
  [/\bcertified system administrator\b/i, 'CSA'],
  [/\bcertified application developer\b/i, 'CAD'],
]

export function toggleInList(list: string[], item: string): string[] {
  return list.includes(item)
    ? list.filter((x) => x !== item)
    : [...list, item]
}

export function sortTaxonomyLabels(
  selected: string[],
  catalog: readonly string[]
): string[] {
  const order = new Map(catalog.map((label, i) => [label, i]))
  return [...selected].sort(
    (a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999)
  )
}

export function filterToKnownTaxonomy(
  values: string[],
  catalog: readonly string[]
): string[] {
  const known = new Set<string>(catalog)
  return sortTaxonomyLabels(
    values.filter((v) => known.has(v)),
    catalog
  )
}
