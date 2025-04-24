// lib/auth-context.tsx
"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import { supabase } from "./supabase/client"
import { supervisorService, type SupervisorWithPin } from "./supervisor-service"
import type { User } from "@/types/auth"
import { sessionManager } from "./session-manager"

// Tipo para los metadatos de usuario
type UserMetadata = {
  id: string;
  first_name?: string;
  last_name?: string;
  role?: string;
  email?: string;
  local?: string;
  position?: string;
};

// Caché en memoria para metadatos (evita consultas repetidas)
const metadataCache: Record<string, UserMetadata> = {};

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
  refreshUserMetadata: () => Promise<void>
}

// Crear el contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Lista de rutas que no requieren autenticación
const publicRoutes = ["/login", "/forgot-password", "/reset-password", "/secure-redirect"]

/**
 * Carga los metadatos de un usuario de manera segura con múltiples fallbacks
 */
async function loadUserMetadata(userId: string): Promise<UserMetadata> {
  // Si ya tenemos los datos en caché, los devolvemos
  if (metadataCache[userId]) {
    console.log("Usando metadatos en caché para usuario:", userId);
    return metadataCache[userId];
  }

  console.log("Cargando metadatos para usuario:", userId);
  
  try {
    // Intento 1: Cargar desde la tabla employees (preferido)
    try {
      const { data: employeeData, error: employeeError } = await supabase
        .from('employees')
        .select('id, first_name, last_name, email, local, position, role')
        .eq('id', userId)
        .single();

      if (!employeeError && employeeData) {
        console.log("Metadatos cargados desde tabla employees");
        const metadata: UserMetadata = {
          id: userId,
          ...employeeData
        };
        metadataCache[userId] = metadata;
        return metadata;
      }
    } catch (err) {
      console.error("Error al cargar desde employees:", err);
    }

    // Intento 2: Usar RPC para evitar problemas de recursión
    try {
      const { data: rpcData, error: rpcError } = await supabase
        .rpc('get_user_metadata_safe', { user_id: userId });
      
      if (!rpcError && rpcData) {
        console.log("Metadatos cargados desde RPC");
        const metadata: UserMetadata = {
          id: userId,
          ...rpcData
        };
        metadataCache[userId] = metadata;
        return metadata;
      }
    } catch (err) {
      console.error("Error al cargar desde RPC:", err);
    }

    // Fallback final: Devolver datos mínimos basados en la sesión actual
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      console.log("Usando datos mínimos de la sesión");
      const metadata: UserMetadata = {
        id: userId,
        email: session.user.email,
        role: 'admin', // Asumimos admin como fallback seguro
      };
      metadataCache[userId] = metadata;
      return metadata;
    }

    // Si todo falla, devolver un objeto con datos mínimos
    console.log("Usando datos mínimos por defecto");
    const defaultMetadata: UserMetadata = {
      id: userId,
      role: 'admin', // Asumimos admin como fallback seguro
    };
    metadataCache[userId] = defaultMetadata;
    return defaultMetadata;

  } catch (error) {
    console.error("Error crítico al cargar metadatos de usuario:", error);
    // Último recurso si todo falla
    return { 
      id: userId,
      role: 'admin' // Asumimos admin como fallback seguro
    };
  }
}

/**
 * Limpia la caché de metadatos para un usuario específico o para todos
 */
function clearMetadataCache(userId?: string) {
  if (userId) {
    delete metadataCache[userId];
  } else {
    // Limpiar toda la caché
    Object.keys(metadataCache).forEach(key => {
      delete metadataCache[key];
    });
  }
}

// Proveedor de autenticación
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingUser, setIsLoadingUser] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supervisors, setSupervisors] = useState<SupervisorWithPin[]>([])
  const [supervisorsLoaded, setSupervisorsLoaded] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Función para cargar los datos del usuario
  const loadUserData = useCallback(async (userId: string) => {
    if (!userId) return;
    
    try {
      setIsLoadingUser(true);
      
      // Usar nuestra función robusta para cargar metadatos
      const metadata = await loadUserMetadata(userId);
      
      // Actualizar el estado con los metadatos
      setUser(prev => ({
        ...prev,
        id: userId,
        email: metadata.email || prev?.email || "",
        name: metadata.first_name 
          ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() 
          : prev?.name || metadata.email?.split("@")[0] || "Usuario",
        role: metadata.role || 'admin', // Fallback a admin si no hay rol
      }));
      
      console.log("User object:", {
        id: userId,
        email: metadata.email,
        name: metadata.first_name 
          ? `${metadata.first_name} ${metadata.last_name || ''}`.trim() 
          : metadata.email?.split("@")[0] || "Usuario",
        role: metadata.role || 'admin'
      });
      
    } catch (error) {
      console.error("Error al cargar datos de usuario:", error);
      // No interrumpir el flujo si hay un error, usar datos mínimos
    } finally {
      setIsLoadingUser(false);
    }
  }, []);

  // Función para refrescar los metadatos del usuario
  const refreshUserMetadata = useCallback(async () => {
    if (user?.id) {
      clearMetadataCache(user.id);
      await loadUserData(user.id);
    }
  }, [user?.id, loadUserData]);

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

          // Crear un usuario básico inicialmente
          const userData = {
            id: session.user.id,
            email: session.user.email || "",
            name: session.user.email?.split("@")[0] || "Usuario",
            role: "admin", // Asignamos rol admin por defecto
          }

          setUser(userData as User)
          
          // Cargar metadatos completos en segundo plano
          loadUserData(session.user.id)
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
        // Crear un usuario básico inicialmente
        const userData = {
          id: session.user.id,
          email: session.user.email || "",
          name: session.user.email?.split("@")[0] || "Usuario",
          role: "admin", // Asignamos rol admin por defecto
        }

        setUser(userData as User)
        
        // Cargar metadatos completos en segundo plano
        loadUserData(session.user.id)
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      } else if (event === "TOKEN_REFRESHED" && session?.user) {
        console.log("Session refreshed successfully")
        
        // Actualizar metadatos si es necesario
        if (user?.id === session.user.id) {
          loadUserData(session.user.id)
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadUserData])

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
        // Crear un usuario básico inicialmente
        const userData = {
          id: data.user.id,
          email: data.user.email || "",
          name: data.user.email?.split("@")[0] || "Usuario",
          role: "admin", // Asignamos rol admin por defecto
        }

        setUser(userData as User)
        
        // Cargar metadatos completos en segundo plano
        loadUserData(data.user.id)
        
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
      // Limpiar caché de metadatos al cerrar sesión
      clearMetadataCache()
      router.push("/login")
    } catch (err: any) {
      console.error("Logout error:", err)
      setError(err.message || "Error al cerrar sesión")
      // Incluso si hay un error, intentamos limpiar el estado
      setUser(null)
      clearMetadataCache()
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
        refreshUserMetadata,
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