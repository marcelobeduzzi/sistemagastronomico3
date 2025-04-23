// components/AuthInitializer.tsx
'use client'

import { useEffect, useState, ReactNode } from 'react'
import { sessionManager } from '@/lib/session-manager'

interface AuthInitializerProps {
  children: ReactNode
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  
  useEffect(() => {
    const initialize = async () => {
      try {
        // Inicializar el gestor de sesiones
        const session = await sessionManager.getSession()
        console.log('AuthInitializer: Sesión inicializada', session ? 'con sesión activa' : 'sin sesión')
      } catch (error) {
        console.error('AuthInitializer: Error al inicializar sesión', error)
      } finally {
        setIsInitialized(true)
      }
    }
    
    initialize()
  }, [])
  
  // No mostrar indicador de carga para evitar parpadeos
  // Solo pasamos los children cuando esté inicializado
  if (!isInitialized) {
    return null
  }
  
  return <>{children}</>
}