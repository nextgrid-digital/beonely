import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { LogOut } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { AdminWorkspaceSwitcher } from '@/features/admin/admin-workspace-switcher'
import {
  adminEmailNav,
  adminOperationsNav,
  type AdminNavItem,
} from '@/features/admin/admin-nav'
import { cn } from '@/lib/utils'

function NavSection({
  label,
  items,
  pathname,
}: {
  label: string
  items: AdminNavItem[]
  pathname: string
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active =
              item.href === '/admin'
                ? pathname === '/admin' || pathname === '/admin/'
                : pathname.startsWith(item.href)
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton asChild isActive={active}>
                  <Link to={item.href}>
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
  const { user, signOut } = useAuth()
  const { state, isMobile } = useSidebar()
  const sidebarCollapsed = state === 'collapsed' && !isMobile

  return (
    <>
      <Sidebar variant='inset' collapsible='icon'>
        <SidebarHeader className='gap-3 border-b border-sidebar-border p-3'>
          {sidebarCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to='/admin'
                  className='flex size-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                >
                  <LogoMark />
                </Link>
              </TooltipTrigger>
              <TooltipContent side='right' align='center'>
                Beonely Admin
              </TooltipContent>
            </Tooltip>
          ) : (
            <Link
              to='/admin'
              className='flex items-center gap-2 rounded-md px-1 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            >
              <Logo className='h-6 w-auto max-w-[7rem]' />
            </Link>
          )}
          <AdminWorkspaceSwitcher
            sidebarIconMode
            sidebarCollapsed={sidebarCollapsed}
          />
        </SidebarHeader>
        <SidebarContent>
          <NavSection
            label='Operations'
            items={adminOperationsNav}
            pathname={pathname}
          />
          <NavSection label='Email' items={adminEmailNav} pathname={pathname} />
        </SidebarContent>
        <SidebarFooter className='border-t border-sidebar-border p-3'>
          <p className='truncate px-2 text-xs text-muted-foreground'>
            {user?.email}
          </p>
          <Button
            type='button'
            variant='ghost'
            size='sm'
            className='mt-2 w-full justify-start gap-2'
            onClick={() => void signOut()}
          >
            <LogOut className='size-4' aria-hidden />
            Sign out
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className='min-w-0'>
        <header className='flex h-12 shrink-0 items-center gap-2 border-b border-border px-4'>
          <SidebarTrigger className='-ml-1' />
          <span className='text-sm font-medium text-muted-foreground'>
            Admin
          </span>
        </header>
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col overflow-x-hidden p-4 md:p-6'
          )}
        >
          <Outlet />
        </div>
      </SidebarInset>
    </>
  )
}
