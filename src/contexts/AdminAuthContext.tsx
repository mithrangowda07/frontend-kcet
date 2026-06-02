import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { adminAuthService } from '../services/api'
import type { AdminAccount } from '../types'

interface AdminAuthContextValue {
  admin: AdminAccount | null
  isAuthenticated: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextValue | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminAccount | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const bootstrap = async () => {
      const stored = adminAuthService.getStoredAdmin()
      const tokens = adminAuthService.getTokens()
      if (!stored || !tokens?.access) {
        setLoading(false)
        return
      }
      try {
        const me = await adminAuthService.me()
        setAdmin(me)
        adminAuthService.setStoredAdmin(me)
      } catch {
        adminAuthService.clearSession()
        setAdmin(null)
      } finally {
        setLoading(false)
      }
    }
    bootstrap()
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await adminAuthService.login(email, password)
    adminAuthService.setTokens(data.tokens)
    adminAuthService.setStoredAdmin(data.admin)
    setAdmin(data.admin)
  }, [])

  const logout = useCallback(() => {
    adminAuthService.clearSession()
    setAdmin(null)
  }, [])

  const value = useMemo(
    () => ({
      admin,
      isAuthenticated: Boolean(admin),
      loading,
      login,
      logout,
    }),
    [admin, loading, login, logout]
  )

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider')
  }
  return context
}
