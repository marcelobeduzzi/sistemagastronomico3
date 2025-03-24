"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
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
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // Verificar sesión al cargar
  useEffect(() => {
    const checkSession = async () => {
      try {
        setIsLoading(true)
        
        // Obtener sesión actual
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          // Obtener datos del usuario
          const { data, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()
            
          if (userError) throw userError
          
          if (data) {
            setUser(data)
          } else {
            console.error("No user data found")
          }
        }
      } catch (err: any) {
        console.error("Session check error:", err)
      } finally {
        setIsLoading(false)
      }
    }
    
    checkSession()
    
    // Suscribirse a cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          try {
            const { data, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
              
            if (userError) throw userError
            
            if (data) {
              setUser(data)
            }
          } catch (err) {
            console.error("Error fetching user data:", err)
          }
        } else if (event === "SIGNED_OUT") {
          setUser(null)
        }
      }
    )
    
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // Función de login simplificada
  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Iniciar sesión con Supabase
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (signInError) throw signInError
      
      // La redirección se manejará en el componente de login
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

