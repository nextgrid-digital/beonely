import { useState } from 'react'
import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { LogOut, ShieldCheck } from 'lucide-react'
import { Logo, LogoMark } from '@/assets/logo'
import { useAuth } from '@/context/auth-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Search } from '@/components/search'
import { SignOutDialog } from '@/components/sign-out-dialog'
import { ThemeSwitch } from '@/components/theme-switch'
import {
  adminNavGroups,
  getActiveAdminNavItem,
  isAdminNavItemActive,
  type AdminNavGroup,
} from '@/features/admin/admin-nav'
import { AdminWorkspaceSwitcher } from '@/features/admin/admin-workspace-switcher'

function NavSection({
  group,
  pathname,
}: {
  group: AdminNavGroup
  pathname: string
}) {
  const { isMobile, setOpenMobile } = useSidebar()

  return (
    <SidebarGroup>
      <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {group.items.map((item) => {
            const active = isAdminNavItemActive(pathname, item)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={active}
                  tooltip={item.title}
                >
                  <Link
                    to={item.href}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false)
                    }}
                  >
                    <item.icon className='size-4' aria-hidden />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

export function AdminAppShell() {
  return (
    <SidebarProvider>
      <AdminAppShellLayout />
    </SidebarProvider>
  )
}

function AdminAppShellLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const { user } = useAuth()
  const { state, isMobile } = useSidebar()
  const [signOutOpen, setSignOutOpen] = useState(false)
  const sidebarCollapsed = state === 'collapsed' && !isMobile
  const activeItem = getActiveAdminNavItem(pathname)

  return (
    <>
      <a
        href='#admin-main-content'
        className='fixed start-4 top-3 z-50 -translate-y-20 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-transform focus:translate-y-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transition-none'
      >
        Skip to admin content
      </a>

      <Sidebar variant='inset' collapsible='icon'>
        <SidebarHeader className='gap-3 border-b border-sidebar-border p-3'>
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to='/admin'
                  className='flex size-8 items-center justify-center rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
                >
                  <LogoMark alt='Beonely Admin' />
                </Link>
              </TooltipTrigger>
              <TooltipContent side='right' align='center'>
                Beonely Admin
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to='/admin'
              className='flex items-center gap-2 rounded-md px-1 py-0.5 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none'
            >
              <Logo className='h-6 w-auto max-w-[7rem]' alt='Beonely Admin' />
              <span className='rounded-full border border-border bg-background px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase'>
                Admin
              </span>
            </Link>
          )}
          <AdminWorkspaceSwitcher
            sidebarIconMode
            sidebarCollapsed={sidebarCollapsed}
          />
        </SidebarHeader>

        <SidebarContent className='py-2'>
          {adminNavGroups.map((group) => (
            <NavSection key={group.label} group={group} pathname={pathname} />
          ))}
        </SidebarContent>

        <SidebarFooter className='border-t border-sidebar-border p-3'>
          <div className='min-w-0 px-2 group-data-[collapsible=icon]:hidden'>
            <div className='flex items-center gap-2 text-xs font-medium text-sidebar-foreground'>
              <ShieldCheck
                className='size-3.5 text-muted-foreground'
                aria-hidden
              />
              Staff workspace
            </div>
            <p className='mt-1 truncate text-xs text-muted-foreground'>
              {user?.email ?? 'Signed in'}
            </p>
          </div>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                type='button'
                tooltip='Sign out'
                onClick={() => setSignOutOpen(true)}
              >
                <LogOut className='size-4' aria-hidden />
                <span>Sign out</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className='min-w-0 overflow-hidden'>
        <header className='sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
          <SidebarTrigger className='-ms-1' />
          <div className='mx-1 h-4 w-px bg-border' aria-hidden />
          <div className='min-w-0'>
            <p className='text-[11px] leading-none font-medium tracking-wide text-muted-foreground uppercase'>
              Beonely Admin
            </p>
            <p className='mt-1 truncate text-sm leading-none font-semibold'>
              {activeItem?.title ?? 'Operations'}
            </p>
          </div>
          <Search
            placeholder='Search admin'
            className='ms-auto hidden sm:flex sm:w-48 lg:w-60'
          />
          <ThemeSwitch />
        </header>

        <main
          id='admin-main-content'
          tabIndex={-1}
          className='flex min-w-0 flex-1 flex-col overflow-x-hidden bg-muted/15 p-4 outline-none md:p-6 lg:p-8'
        >
          <Outlet />
        </main>
      </SidebarInset>

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  )
}
