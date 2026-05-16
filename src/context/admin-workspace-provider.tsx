import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  getAdminWorkspace,
  setAdminWorkspace,
  workspacePath,
  type AdminWorkspace,
} from '@/lib/auth/admin-workspace'
import { ensureAdminCandidateProfile } from '@/lib/auth/ensure-admin-candidate-profile'
import { useAuth } from '@/context/auth-provider'
import { isAllowlistedAdminEmail } from '@/lib/auth/admin-access'

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
  const isStaffAdmin =
    profile?.role === 'admin' &&
    Boolean(user?.email && isAllowlistedAdminEmail(user.email))

  const [workspace, setWorkspaceState] = useState<AdminWorkspace>(() =>
    isStaffAdmin ? getAdminWorkspace() : 'admin'
  )

  const setWorkspace = useCallback(
    async (next: AdminWorkspace) => {
      if (!isStaffAdmin) return
      setAdminWorkspace(next)
      setWorkspaceState(next)
      if (next === 'candidate' && user) {
        await ensureAdminCandidateProfile(user)
      }
      void navigate({ to: workspacePath(next) })
    },
    [isStaffAdmin, navigate, user]
  )

  const value = useMemo(
    () => ({
      workspace: isStaffAdmin ? workspace : 'admin',
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
