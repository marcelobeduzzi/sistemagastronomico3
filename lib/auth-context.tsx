"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { User, LoginCredentials, AuthState } from "@/types/auth"

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => Promise<void>
  hasPermission: (permission: string) => boolean
  setError: (error: string | null) => void
  setIsLoading: (isLoading: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Define role permissions
const rolePermissions: Record<string, string[]> = {
  admin: ["*"],
  manager: [
    "view:employees",
    "view:attendance",
    "view:payroll",
    "view:delivery",
    "view:audit",
    "view:billing",
    "view:balance",
    "edit:employees",
    "edit:attendance",
    "edit:delivery",
    "edit:audit",
  ],
  employee: ["view:attendance", "view:delivery", "view:audit"],
  cashier: ["view:attendance", "view:delivery", "view:audit", "edit:delivery"],
  waiter: ["view:attendance", "view:delivery", "view:audit", "edit:delivery"],
  kitchen: ["view:attendance", "view:delivery", "view:audit", "edit:delivery"],
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    validateSession()

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchUserData(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
        router.push("/login")
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Fixed validateSession function
  const validateSession = async () => {
    try {
      setIsLoading(true)

      // Use a proper timeout approach
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      try {
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        clearTimeout(timeoutId)
        
        if (sessionError) throw sessionError

        if (data.session?.user) {
          await fetchUserData(data.session.user.id)
        } else {
          // No active session
          setUser(null)
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          throw new Error("Session validation timeout")
        }
        throw err
      }
    } catch (error: any) {
      console.error("Session validation error:", error)
      setError(error.message || "Error al validar la sesión")
      // Clear any stale session data
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  // Update the fetchUserData function to handle errors better
  const fetchUserData = async (userId: string) => {
    try {
      const { data: userData, error: userError } = await supabase.from("users").select("*").eq("id", userId).single()

      if (userError) {
        throw userError
      }

      if (!userData) {
        throw new Error("No se encontraron datos del usuario")
      }

      setUser(userData)
      setError(null) // Clear any previous errors
    } catch (error: any) {
      console.error("Error fetching user data:", error)
      setError(error.message || "Error al obtener datos del usuario")
      setUser(null)
    }
  }

  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true)
      setError(null)

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      })

      if (authError) throw authError

      if (data.user) {
        await fetchUserData(data.user.id)
      } else {
        throw new Error("No se pudo obtener información del usuario")
      }
    } catch (error: any) {
      console.error("Login error:", error)
      setError(error.message || "Error al iniciar sesión")
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  // Update the logout function to properly clear session
  const logout = async () => {
    try {
      setIsLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      router.push("/login")
    } catch (error: any) {
      console.error("Logout error:", error)
      setError(error.message || "Error al cerrar sesión")
    } finally {
      setIsLoading(false)
    }
  }

  const hasPermission = (permission: string): boolean => {
    if (!user) return false
    const permissions = rolePermissions[user.role] || []
    return permissions.includes("*") || permissions.includes(permission)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        hasPermission,
        setError,
        setIsLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

