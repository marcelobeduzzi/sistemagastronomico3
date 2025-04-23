// lib/session-manager.ts
import { supabase } from './supabase'
import { supabaseConfig } from './supabase-config'
import { Session, User } from '@supabase/supabase-js'

/**
 * Gestor centralizado de sesiones
 * Maneja el refresco de tokens y la persistencia de sesiones
 */
class SessionManager {
  private static instance: SessionManager
  private refreshTimeout: NodeJS.Timeout | null = null
  private refreshAttempts: number = 0
  private currentSession: Session | null = null
  private initialized: boolean = false
  private userMetadata: any = null
  
  private constructor() {
    // Inicializar solo en el cliente
    if (typeof window !== 'undefined') {
      this.initSession()
      
      // Configurar listener de eventos de autenticación
      supabase.auth.onAuthStateChange((event, session) => {
        console.log(`Auth event: ${event}`, session ? 
          `User: ${session.user?.email}, Expires: ${new Date(session.expires_at! * 1000).toLocaleString()}` : 
          'No session')
        
        if (event === 'SIGNED_IN') {
          console.log('Usuario ha iniciado sesión')
          this.currentSession = session
          this.refreshAttempts = 0
          this.scheduleTokenRefresh(session)
          this.loadUserMetadata(session.user.id)
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('Session refreshed successfully')
          this.currentSession = session
          this.refreshAttempts = 0
          this.scheduleTokenRefresh(session)
        } else if (event === 'SIGNED_OUT') {
          console.log('Usuario ha cerrado sesión')
          this.currentSession = null
          this.userMetadata = null
          this.clearRefreshTimeout()
        }
      })
    }
  }
  
  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager()
    }
    return SessionManager.instance
  }
  
  private async initSession() {
    if (this.initialized) return
    
    try {
      console.log('Inicializando gestor de sesiones...')
      const { data } = await supabase.auth.getSession()
      this.currentSession = data.session
      
      if (data.session) {
        console.log(`Sesión existente encontrada para ${data.session.user.email}`)
        this.scheduleTokenRefresh(data.session)
        await this.loadUserMetadata(data.session.user.id)
      } else {
        console.log('No hay sesión activa')
      }
      
      this.initialized = true
    } catch (error) {
      console.error('Error al inicializar sesión:', error)
    }
  }
  
  private async loadUserMetadata(userId: string) {
    try {
      console.log(`Cargando metadatos para usuario ${userId}`)
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error('Error al cargar metadatos de usuario:', error)
        return
      }
      
      if (data) {
        console.log('Metadatos de usuario cargados:', data)
        this.userMetadata = data
      } else {
        console.log('No se encontraron metadatos para el usuario')
      }
    } catch (error) {
      console.error('Error al cargar metadatos de usuario:', error)
    }
  }
  
  private scheduleTokenRefresh(session: Session | null) {
    // Limpiar timeout existente
    this.clearRefreshTimeout()
    
    if (!session) return
    
    // Calcular tiempo hasta el próximo refresh
    const expiresAt = session.expires_at
    if (!expiresAt) return
    
    const expiresAtMs = expiresAt * 1000
    const now = Date.now()
    const timeUntilExpiry = expiresAtMs - now
    
    // Refrescar cuando queden X minutos para expirar (según configuración)
    const refreshMarginMs = supabaseConfig.session.refreshMarginMinutes * 60 * 1000
    const refreshTime = Math.max(timeUntilExpiry - refreshMarginMs, 0)
    
    // Si ya estamos dentro del margen de refresco, refrescar inmediatamente
    if (refreshTime <= 0) {
      console.log('Token cerca de expirar, refrescando inmediatamente...')
      this.refreshToken()
      return
    }
    
    console.log(`Programando refresco de token en ${Math.floor(refreshTime / 1000)} segundos (${new Date(Date.now() + refreshTime).toLocaleTimeString()})`)
    
    this.refreshTimeout = setTimeout(() => {
      this.refreshToken()
    }, refreshTime)
  }
  
  private async refreshToken() {
    console.log('Refrescando token...')
    try {
      const { data, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Error al refrescar token:', error)
        this.refreshAttempts++
        
        if (this.refreshAttempts >= supabaseConfig.session.maxRefreshAttempts) {
          console.error(`Máximo de intentos de refresco (${supabaseConfig.session.maxRefreshAttempts}) alcanzado. Forzando logout.`)
          this.logout()
        } else {
          // Programar otro intento en 30 segundos
          console.log(`Intento ${this.refreshAttempts}/${supabaseConfig.session.maxRefreshAttempts}. Reintentando en 30 segundos...`)
          this.scheduleRetry(30)
        }
      } else {
        console.log('Token refrescado exitosamente')
        this.currentSession = data.session
        this.refreshAttempts = 0
        // Programar el siguiente refresh
        this.scheduleTokenRefresh(data.session)
      }
    } catch (error) {
      console.error('Excepción durante el refresco de token:', error)
      this.refreshAttempts++
      
      if (this.refreshAttempts >= supabaseConfig.session.maxRefreshAttempts) {
        console.error(`Máximo de intentos de refresco alcanzado. Forzando logout.`)
        this.logout()
      } else {
        // Programar otro intento en 30 segundos
        this.scheduleRetry(30)
      }
    }
  }
  
  private scheduleRetry(seconds: number) {
    this.clearRefreshTimeout()
    console.log(`Programando reintento de refresco en ${seconds} segundos`)
    this.refreshTimeout = setTimeout(() => {
      this.refreshToken()
    }, seconds * 1000)
  }
  
  private clearRefreshTimeout() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout)
      this.refreshTimeout = null
    }
  }
  
  // Métodos públicos
  public async getSession(): Promise<Session | null> {
    if (!this.initialized) {
      await this.initSession()
    }
    
    if (!this.currentSession) {
      // Intentar obtener la sesión actual de Supabase
      const { data } = await supabase.auth.getSession()
      this.currentSession = data.session
      
      if (this.currentSession) {
        this.scheduleTokenRefresh(this.currentSession)
        await this.loadUserMetadata(this.currentSession.user.id)
      }
    }
    
    return this.currentSession
  }
  
  public async getUser(): Promise<User | null> {
    const session = await this.getSession()
    return session?.user || null
  }
  
  public async getUserWithMetadata(): Promise<any> {
    const user = await this.getUser()
    
    if (!user) return null
    
    // Si no tenemos metadatos, intentar cargarlos
    if (!this.userMetadata) {
      await this.loadUserMetadata(user.id)
    }
    
    // Combinar usuario con metadatos
    return {
      ...user,
      ...this.userMetadata
    }
  }
  
  public async login(email: string, password: string) {
    try {
      console.log(`Intentando iniciar sesión con: ${email}`)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) {
        console.error('Error durante el login:', error)
        return { success: false, error: error.message }
      }
      
      console.log('Login exitoso:', data)
      this.currentSession = data.session
      this.refreshAttempts = 0
      this.scheduleTokenRefresh(data.session)
      await this.loadUserMetadata(data.user.id)
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Excepción durante el login:', error)
      return { success: false, error: error.message }
    }
  }
  
  public async logout() {
    this.clearRefreshTimeout()
    try {
      await supabase.auth.signOut()
      this.currentSession = null
      this.userMetadata = null
      console.log('Logout exitoso')
      return { success: true }
    } catch (error: any) {
      console.error('Error durante el logout:', error)
      return { success: false, error: error.message }
    }
  }
  
  public isAuthenticated(): boolean {
    return !!this.currentSession
  }
  
  public getUserMetadata(): any {
    return this.userMetadata
  }
}

// Exportar instancia singleton
export const sessionManager = SessionManager.getInstance()

// Exportar función para usar en componentes
export function useSessionManager() {
  return sessionManager
}