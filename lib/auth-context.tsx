"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "./supabase-client"
import type { User } from "@/types/auth"

// Definir tipos simplificados
type AuthContextType = {
  user: User | null
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  setError: (error: string | null) => void
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true) // Cambiado a true para mostrar carga inicial
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          console.log("Sesión encontrada:", session.user.email)
          
          // Simplificamos para reducir la seguridad - creamos un usuario básico
          const userData = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.email?.split("@")[0] || "Usuario",
            role: "admin" // Asignamos rol admin por defecto
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
      }
    }
    
    checkSession()
    
    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event)
        
        if (event === "SIGNED_IN" && session?.user) {
          // Simplificamos para reducir la seguridad
          const userData = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.email?.split("@")[0] || "Usuario",
            role: "admin" // Asignamos rol admin por defecto
          }
          
          setUser(userData as User)
        } else if (event === "SIGNED_OUT") {
          setUser(null)
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Función de login simplificada
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("Intentando iniciar sesión con:", email)
      
      // Iniciar sesión con Supabase
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) {
        console.error("Error de inicio de sesión:", signInError)
        throw signInError
      }
      
      console.log("Login exitoso:", data)
      
      if (data.user) {
        // Simplificamos para reducir la seguridad
        const userData = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.email?.split("@")[0] || "Usuario",
          role: "admin" // Asignamos rol admin por defecto
        }
        
        setUser(userData as User)
        router.push('/')
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
      router.push('/login')
    } catch (err: any) {
      console.error("Logout error:", err)
      setError(err.message || "Error al cerrar sesión")
      // Incluso si hay un error, intentamos limpiar el estado
      setUser(null)
      router.push('/login')
    } finally {
      setIsLoading(false)
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
        setError
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