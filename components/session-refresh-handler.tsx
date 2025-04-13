"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth-context"

// Este componente se puede agregar al layout principal para refrescar la sesión
// periódicamente en todas las páginas
export function SessionRefreshHandler() {
  const { user, refreshSession } = useAuth()
  const pathname = usePathname()

  // Refrescar la sesión cuando cambia la ruta
  useEffect(() => {
    if (user) {
      refreshSession().catch(console.error)
    }
  }, [pathname, user, refreshSession])

  // Refrescar la sesión periódicamente
  useEffect(() => {
    if (user) {
      const interval = setInterval(
        () => {
          refreshSession().catch(console.error)
        },
        15 * 60 * 1000,
      ) // 15 minutos

      return () => clearInterval(interval)
    }
  }, [user, refreshSession])

  return null // Este componente no renderiza nada
}
