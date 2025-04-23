// lib/auth-context.tsx
"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "./supabase/client"
import { supervisorService, type SupervisorWithPin } from "./supervisor-service"
import type { User } from "@/types/auth"
import { sessionManager } from "./session-manager"

// Extender el tipo AuthContextType para incluir las nuevas funciones
type AuthContextType = {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setError: (error: string | null) => void
  validateSupervisorPin: (pin: string) => Promise<boolean>
  supervisors: SupervisorWithPin[]
  updateSupervisorPin: (userId: string, newPin: string) => Promise<boolean>
  refreshSession: () => Promise<boolean>
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Lista de rutas que no requieren autenticación
const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/secure-redirect"]

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [supervisors, setSupervisors] = useState<SupervisorWithPin[]>([])
  const [supervisorsLoaded, setSupervisorsLoaded] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Función para refrescar la sesión
  const refreshSession = async () => {
    try {
      // Usar el método de Supabase directamente para evitar problemas
      const { data, error } = await supabase.auth.refreshSession()
      if (error) {
        console.error("Error refreshing session:", error)
        return false
      }

      if (data.session) {
        console.log("Session refreshed successfully")
        return true
      } else {
        console.log("No session to refresh")
        return false
      }
    } catch (err) {
      console.error("Session refresh error:", err)
      return false
    }
  }

  // Cargar supervisores desde la base de datos
  useEffect(() => {
    const loadSupervisors = async () => {
      try {
        const data = await supervisorService.getAllSupervisors()
        setSupervisors(data)
      } catch (err) {
        console.error("Error al cargar supervisores:", err)
      } finally {
        setSupervisorsLoaded(true)
      }
    }

    if (!supervisorsLoaded) {
      loadSupervisors()
    }
  }, [supervisorsLoaded])

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Obtener sesión actual
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session?.user) {
          console.log("Sesión encontrada:", session.user.email)

          // Crear un usuario básico con rol admin
          const userData = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.email?.split("@")[0] || "Usuario",
            role: "admin", // Asignamos rol admin por defecto
          }

          setUser(userData as User)
        } else {
          console.log("No hay sesión activa")
          setUser(null)
        }
      } catch (err: any) {
        console.error("Session check error:", err)
        setUser(null)
      } finally {
        setIsLoading(false)
        setAuthChecked(true)
      }
    }

    checkSession()

    // Suscribirse a cambios de autenticación
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event)

      if (event === "SIGNED_IN" && session?.user) {
        // Crear un usuario básico con rol admin
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.email?.split("@")[0] || "Usuario",
          role: "admin", // Asignamos rol admin por defecto
        }

        setUser(userData as User)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Efecto para manejar la redirección basada en la autenticación
  useEffect(() => {
    // Solo redirigir si ya se verificó la autenticación y no estamos cargando
    if (!isLoading && authChecked) {
      const isPublicRoute = publicRoutes.some((route) => pathname?.startsWith(route))

      if (!user && !isPublicRoute) {
        console.log("Redirigiendo a login desde:", pathname)
        router.push("/login")
      }
    }
  }, [user, isLoading, router, authChecked, pathname])

  // Efecto para refrescar periódicamente la sesión
  useEffect(() => {
    if (user) {
      // Refrescar la sesión cada 10 minutos para mantenerla activa
      const refreshInterval = setInterval(
        () => {
          refreshSession().catch(console.error)
        },
        10 * 60 * 1000,
      ) // 10 minutos

      return () => clearInterval(refreshInterval)
    }
  }, [user])

  // Función de login
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)

      console.log("Intentando iniciar sesión con:", email)

      // Iniciar sesión con Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error("Error de inicio de sesión:", signInError)
        throw signInError
      }

      console.log("Login exitoso:", data)

      if (data.user) {
        // Crear un usuario básico con rol admin
        const userData = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.email?.split("@")[0] || "Usuario",
          role: "admin", // Asignamos rol admin por defecto
        }

        setUser(userData as User)
        router.push("/")
      }
    } catch (err: any) {
      console.error("Login error:", err)
      setError(err.message || "Error al iniciar sesión")
      throw err
    } finally {
      setIsLoading(false)
    }
  }

  // Función de logout
  const logout = async () => {
    try {
      setIsLoading(true)
      await supabase.auth.signOut()
      setUser(null)
      router.push("/login")
    } catch (err: any) {
      console.error("Logout error:", err)
      setError(err.message || "Error al cerrar sesión")
      // Incluso si hay un error, intentamos limpiar el estado
      setUser(null)
      router.push("/login")
    } finally {
      setIsLoading(false)
    }
  }

  // Función para validar PIN de supervisor
  const validateSupervisorPin = async (pin: string): Promise<boolean> => {
    try {
      // Verificar si el PIN coincide con algún supervisor o gerente en la base de datos
      return await supervisorService.validatePin(pin)
    } catch (error) {
      console.error("Error al validar PIN:", error)
      // Si hay un error en la base de datos, intentar validar con los datos en memoria
      return supervisors.some((supervisor) => supervisor.pin === pin)
    }
  }

  // Función para actualizar el PIN de un supervisor
  const updateSupervisorPin = async (userId: string, newPin: string): Promise<boolean> => {
    try {
      // Buscar si el usuario ya existe en la lista de supervisores
      const existingSupervisor = supervisors.find((s) => s.id === userId)

      if (existingSupervisor) {
        // Si existe, actualizar su PIN
        const updatedSupervisor = {
          ...existingSupervisor,
          pin: newPin,
        }

        // Guardar en la base de datos
        const success = await supervisorService.updateSupervisorPin(updatedSupervisor)

        if (success) {
          // Actualizar el estado local
          setSupervisors((prevSupervisors) => prevSupervisors.map((s) => (s.id === userId ? { ...s, pin: newPin } : s)))
        }

        return success
      } else {
        // Si no existe, buscar el usuario en los usuarios mock y agregarlo a la lista
        const userToAdd = mockUsers.find((u) => u.id === userId)

        if (userToAdd) {
          const newSupervisor: SupervisorWithPin = {
            id: userToAdd.id,
            name: userToAdd.name,
            email: userToAdd.email,
            role: userToAdd.role,
            pin: newPin,
          }

          // Guardar en la base de datos
          const success = await supervisorService.updateSupervisorPin(newSupervisor)

          if (success) {
            // Actualizar el estado local
            setSupervisors((prevSupervisors) => [...prevSupervisors, newSupervisor])
          }

          return success
        }
      }

      return false
    } catch (error) {
      console.error("Error al actualizar PIN:", error)
      return false
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        setError,
        validateSupervisorPin,
        supervisors,
        updateSupervisorPin,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

// Hook para usar el contexto
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

// Importar mockUsers para poder agregar nuevos supervisores
import { mockUsers } from "@/lib/mock-data"