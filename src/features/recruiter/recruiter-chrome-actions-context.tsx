import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type RecruiterChromeActionsContextValue = {
  actions: ReactNode | null
  setActions: (actions: ReactNode | null) => void
}

const RecruiterChromeActionsContext =
  createContext<RecruiterChromeActionsContextValue | null>(null)

export function RecruiterChromeActionsProvider({
  children,
}: {
  children: ReactNode
}) {
  const [actions, setActions] = useState<ReactNode | null>(null)
  const value = useMemo(
    () => ({ actions, setActions }),
    [actions, setActions]
  )
  return (
    <RecruiterChromeActionsContext.Provider value={value}>
      {children}
    </RecruiterChromeActionsContext.Provider>
  )
}

export function useRecruiterChromeActionsSlot(): ReactNode | null {
  return useContext(RecruiterChromeActionsContext)?.actions ?? null
}

/** Register header actions in `RecruiterChrome` (cleared on unmount). */
export function useRecruiterChromeActions(actions: ReactNode | null) {
  const ctx = useContext(RecruiterChromeActionsContext)
  if (!ctx) {
    throw new Error(
      'useRecruiterChromeActions must be used within RecruiterChromeActionsProvider'
    )
  }
  const { setActions } = ctx
  useEffect(() => {
    setActions(actions)
    return () => setActions(null)
  }, [actions, setActions])
}
