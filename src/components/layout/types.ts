import { type LinkProps } from '@tanstack/react-router'
import type { UserRole } from '@/lib/supabase/database.types'

type User = {
  name: string
  email: string
  avatar: string
}

type Team = {
  name: string
  plan: string
  /** Lucide-style icon; omit when using `logoSrc`. */
  logo?: React.ElementType
  /** Wide mark (e.g. PNG) for the team switcher tile. */
  logoSrc?: string
}

type BaseNavItem = {
  title: string
  badge?: string
  icon?: React.ElementType
  /** When set, only these roles see the item in the authenticated shell sidebar. */
  forRoles?: UserRole[]
}

type NavLink = BaseNavItem & {
  url: LinkProps['to'] | (string & {})
  items?: never
}

type NavCollapsible = BaseNavItem & {
  items: (BaseNavItem & { url: LinkProps['to'] | (string & {}) })[]
  url?: never
}

type NavItem = NavCollapsible | NavLink

type NavGroup = {
  title: string
  items: NavItem[]
}

type SidebarData = {
  user: User
  teams: Team[]
  navGroups: NavGroup[]
}

export type { SidebarData, NavGroup, NavItem, NavCollapsible, NavLink }
