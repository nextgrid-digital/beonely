import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'
import {
  setAdminWorkspace,
  workspaceFromPathname,
  workspacePath,
  type AdminWorkspace,
} from '@/lib/auth/admin-workspace'
import { ensureAdminCandidateProfile } from '@/lib/auth/ensure-admin-candidate-profile'
import { useAuth } from '@/context/auth-provider'

type AdminWorkspaceContextValue = {
  workspace: AdminWorkspace
  isStaffAdmin: boolean
  setWorkspace: (workspace: AdminWorkspace) => Promise<void>
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(
  null
)

export function AdminWorkspaceProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const isStaffAdmin =
    profile?.role === 'admin' &&
    Boolean(user?.email && isAllowlistedAdminEmail(user.email))

  const workspace = isStaffAdmin ? workspaceFromPathname(pathname) : 'admin'

  const setWorkspace = useCallback(
    async (next: AdminWorkspace) => {
      if (!isStaffAdmin) return
      if (next === 'candidate' && user) {
        await ensureAdminCandidateProfile(user)
      }
      setAdminWorkspace(next)
      await navigate({ to: workspacePath(next) })
    },
    [isStaffAdmin, navigate, user]
  )

  const value = useMemo(
    () => ({
      workspace,
      isStaffAdmin,
      setWorkspace,
    }),
    [isStaffAdmin, workspace, setWorkspace]
  )

  return (
    <AdminWorkspaceContext.Provider value={value}>
      {children}
    </AdminWorkspaceContext.Provider>
  )
}

export function useAdminWorkspace() {
  const ctx = useContext(AdminWorkspaceContext)
  if (!ctx) {
    return {
      workspace: 'admin' as AdminWorkspace,
      isStaffAdmin: false,
      setWorkspace: async () => {},
    }
  }
  return ctx
}
