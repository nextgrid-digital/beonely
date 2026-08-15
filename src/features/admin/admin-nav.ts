import {
  BarChart3,
  BriefcaseBusiness,
  FlaskConical,
  IndianRupee,
  LayoutDashboard,
  Mail,
  Send,
  UserCircle,
  Users,
  Zap,
  type LucideIcon,
} from 'lucide-react'

export type AdminNavItem = {
  title: string
  href: string
  icon: LucideIcon
  description: string
  match?: 'exact' | 'prefix'
}

export type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
}

const dashboardNav: AdminNavItem[] = [
  {
    title: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Operational health and priority queues',
    match: 'exact',
  },
]

const marketplaceNav: AdminNavItem[] = [
  {
    title: 'Jobs',
    href: '/admin/jobs',
    icon: BriefcaseBusiness,
    description: 'Moderate and manage job listings',
  },
  {
    title: 'Hiring requests',
    href: '/admin/hiring-requests',
    icon: BriefcaseBusiness,
    description: 'Qualify inbound buyer demand',
  },
]

const peopleNav: AdminNavItem[] = [
  {
    title: 'Recruiters',
    href: '/admin/recruiters',
    icon: Users,
    description: 'Recruiter accounts and access',
  },
  {
    title: 'Candidates',
    href: '/admin/candidates',
    icon: UserCircle,
    description: 'Candidate profiles and applications',
  },
]

const financeNav: AdminNavItem[] = [
  {
    title: 'Revenue',
    href: '/admin/revenue',
    icon: IndianRupee,
    description: 'Payment records and revenue totals',
  },
]

export const adminEmailNav: AdminNavItem[] = [
  {
    title: 'Email overview',
    href: '/admin/email',
    icon: Mail,
    description: 'Delivery and audience health',
    match: 'exact',
  },
  {
    title: 'Automations',
    href: '/admin/email/automations',
    icon: Zap,
    description: 'Lifecycle email controls',
  },
  {
    title: 'Campaigns',
    href: '/admin/email/campaigns',
    icon: Send,
    description: 'Create and monitor campaigns',
  },
  {
    title: 'Templates',
    href: '/admin/email/templates',
    icon: Mail,
    description: 'Reusable marketing email content',
  },
  {
    title: 'Analytics',
    href: '/admin/email/analytics',
    icon: BarChart3,
    description: 'Delivery logs and outcomes',
  },
  {
    title: 'Test send',
    href: '/admin/email/test',
    icon: FlaskConical,
    description: 'Verify transactional email delivery',
  },
]

export const adminNavGroups: AdminNavGroup[] = [
  { label: 'Overview', items: dashboardNav },
  { label: 'Marketplace', items: marketplaceNav },
  { label: 'People', items: peopleNav },
  { label: 'Finance', items: financeNav },
  { label: 'Communications', items: adminEmailNav },
]

export const adminOperationsNav: AdminNavItem[] = [
  ...dashboardNav,
  ...marketplaceNav,
  ...peopleNav,
  ...financeNav,
]

export const adminNavItems: AdminNavItem[] = adminNavGroups.flatMap(
  (group) => group.items
)

function normalizePathname(pathname: string): string {
  if (pathname === '/') return pathname
  return pathname.replace(/\/+$/, '')
}

export function isAdminNavItemActive(
  pathname: string,
  item: Pick<AdminNavItem, 'href' | 'match'>
): boolean {
  const current = normalizePathname(pathname)
  const href = normalizePathname(item.href)
  if (item.match === 'exact') return current === href
  return current === href || current.startsWith(`${href}/`)
}

export function getActiveAdminNavItem(
  pathname: string
): AdminNavItem | undefined {
  return adminNavItems
    .filter((item) => isAdminNavItemActive(pathname, item))
    .sort((a, b) => b.href.length - a.href.length)[0]
}
