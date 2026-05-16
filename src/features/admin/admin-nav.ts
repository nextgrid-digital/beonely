import {
  BarChart3,
  Briefcase,
  FlaskConical,
  IndianRupee,
  LayoutDashboard,
  Mail,
  Send,
  Shield,
  UserCircle,
  Users,
  Zap,
} from 'lucide-react'

export type AdminNavItem = {
  title: string
  href: string
  icon: typeof LayoutDashboard
}

export const adminOperationsNav: AdminNavItem[] = [
  { title: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { title: 'Jobs', href: '/admin/jobs', icon: Shield },
  { title: 'Revenue', href: '/admin/revenue', icon: IndianRupee },
  { title: 'Recruiters', href: '/admin/recruiters', icon: Users },
  { title: 'Candidates', href: '/admin/candidates', icon: UserCircle },
]

export const adminEmailNav: AdminNavItem[] = [
  { title: 'Email overview', href: '/admin/email', icon: Mail },
  { title: 'Automations', href: '/admin/email/automations', icon: Zap },
  { title: 'Campaigns', href: '/admin/email/campaigns', icon: Send },
  { title: 'Templates', href: '/admin/email/templates', icon: Mail },
  { title: 'Analytics', href: '/admin/email/analytics', icon: BarChart3 },
  { title: 'Test send', href: '/admin/email/test', icon: FlaskConical },
]

/** @deprecated Use adminOperationsNav + adminEmailNav */
export const adminNavItems: AdminNavItem[] = [
  ...adminOperationsNav,
  ...adminEmailNav,
  { title: 'Public jobs', href: '/', icon: Briefcase },
]
