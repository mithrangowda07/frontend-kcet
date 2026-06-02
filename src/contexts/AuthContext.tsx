import React, { createContext, useContext, useState, useEffect } from 'react'
import { authService } from '../services/api'
import { Student } from '../types'

interface AuthContextType {
  user: Student | null
  tokens: { access: string; refresh: string } | null
  login: (email: string, password: string) => Promise<Student>
  register: (data: any) => Promise<void>
  logout: () => void
  isAuthenticated: boolean
  loading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Student | null>(null)
  const [tokens, setTokens] = useState<{ access: string; refresh: string } | null>(null)
  const [loading, setLoading] = useState(true)

  /* =========================
     Helpers
  ========================= */

  const setAndPersistTokens = (t: { access: string; refresh: string }) => {
    setTokens(t)
    localStorage.setItem('tokens', JSON.stringify(t))
    authService.setTokens(t)
  }

  const setAndPersistUser = (u: Student) => {
    setUser(u)
    localStorage.setItem('user', JSON.stringify(u))
  }

  const isApprovedStudent = (student: Student | null) => {
    if (!student) return false
    if (student.type_of_student !== 'studying') return true
    return !student.approval_status || student.approval_status === 'APPROVED'
  }

  const clearAuthCompletely = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('tokens')
    localStorage.removeItem('user')
    authService.clearTokens()
  }

  /* =========================
     Init on App Load
  ========================= */

  useEffect(() => {
    const init = async () => {
      try {
        const storedTokens = localStorage.getItem('tokens')
        const storedUser = localStorage.getItem('user')

        if (storedTokens) {
          const parsedTokens = JSON.parse(storedTokens)
          setAndPersistTokens(parsedTokens)
        }

        if (storedUser) {
          setUser(JSON.parse(storedUser))
        }

        // Prefer fresh user data if tokens exist
        if (storedTokens) {
          const me = await authService.me()
          if (!isApprovedStudent(me)) {
            clearAuthCompletely()
          } else {
            setAndPersistUser(me)
          }
        }
      } catch (error) {
        console.error('Auth init failed:', error)
        clearAuthCompletely()
      } finally {
        setLoading(false)
      }
    }

    init()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* =========================
     Login
  ========================= */

  const login = async (email: string, password: string): Promise<Student> => {
    const response = await authService.login(email, password)

    const t = response.tokens ?? {
      access: response.access,
      refresh: response.refresh,
    }

    setAndPersistTokens(t)

    let loggedInUser: Student

    if (response.student) {
      loggedInUser = response.student
      setAndPersistUser(loggedInUser)
    } else {
      loggedInUser = await authService.me()
      setAndPersistUser(loggedInUser)
    }

    return loggedInUser
  }

  /* =========================
     Register (FIXED)
     ⚠ MUST be unauthenticated
  ========================= */

  const register = async (data: any) => {
    // 🚨 CRITICAL FIX:
    // Ensure NO auth token is sent during registration
    authService.clearTokens()

    await authService.register(data)
  }

  /* =========================
     Logout
  ========================= */

  const logout = () => {
    clearAuthCompletely()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        tokens,
        login,
        register,
        logout,
        isAuthenticated: !!user && isApprovedStudent(user),
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/* =========================
   Hook
========================= */

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
