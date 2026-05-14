import {
  Briefcase,
  IndianRupee,
  LayoutDashboard,
  ListTodo,
  Settings,
  Shield,
  UserCircle,
  Users,
} from 'lucide-react'
import type { UserRole } from '@/lib/supabase/database.types'
import { type SidebarData, type NavItem } from '../types'

function filterNavForRole(items: NavItem[], role: UserRole): NavItem[] {
  return items
    .filter((item) => {
      if (item.forRoles?.length && !item.forRoles.includes(role)) {
        return false
      }
      if ('items' in item && item.items) {
        const subs = item.items.filter(
          (sub) => !sub.forRoles?.length || sub.forRoles.includes(role)
        )
        return subs.length > 0
      }
      return true
    })
    .map((item) => {
      if ('items' in item && item.items) {
        return {
          ...item,
          items: item.items.filter(
            (sub) => !sub.forRoles?.length || sub.forRoles.includes(role)
          ),
        }
      }
      return item
    })
}

export function getSidebarNavGroupsForRole(
  role: UserRole,
  candidateNavTitle?: string
): SidebarData['navGroups'] {
  const groups = sidebarData.navGroups.map((g) => ({
    ...g,
    items: filterNavForRole(g.items, role),
  }))
  if (role !== 'candidate' || !candidateNavTitle?.trim()) return groups
  const title = candidateNavTitle.trim()
  return groups.map((g) => ({
    ...g,
    items: g.items.map((item) => {
      if ('url' in item && item.url === '/candidate/profile') {
        return { ...item, title }
      }
      return item
    }),
  }))
}

export const sidebarData: SidebarData = {
  user: {
    name: 'Account',
    email: '',
    avatar: '/avatars/shadcn.jpg',
  },
  teams: [
    {
      name: 'Beonely',
      plan: 'ServiceNow hiring',
      logoSrc: '/images/beonely-logo.svg',
    },
  ],
  navGroups: [
    {
      title: 'Beonely',
      items: [
        {
          title: 'Home',
          url: '/recruiter',
          icon: LayoutDashboard,
          forRoles: ['recruiter'],
        },
        {
          title: 'Home',
          url: '/admin',
          icon: LayoutDashboard,
          forRoles: ['admin'],
        },
        {
          title: 'Profile & resume',
          url: '/candidate/profile',
          icon: UserCircle,
          forRoles: ['candidate'],
        },
        {
          title: 'Tasks',
          url: '/tasks',
          icon: ListTodo,
          forRoles: ['admin', 'recruiter'],
        },
        {
          title: 'Jobs (public)',
          url: '/',
          icon: Briefcase,
          forRoles: ['recruiter', 'admin'],
        },
        {
          title: 'Recruiter',
          url: '/recruiter',
          icon: UserCircle,
          forRoles: ['recruiter', 'admin'],
        },
        {
          title: 'Pricing',
          url: '/recruiter/pricing',
          icon: IndianRupee,
          forRoles: ['recruiter', 'admin'],
        },
        {
          title: 'Moderation',
          url: '/admin/jobs',
          icon: Shield,
          forRoles: ['admin'],
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
          forRoles: ['admin'],
        },
      ],
    },
    {
      title: 'Account',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            { title: 'Profile', url: '/settings', icon: UserCircle },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Settings,
            },
          ],
        },
      ],
    },
  ],
}
