"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"

export function SessionRefreshHandler() {
  const lastRefreshTime = useRef<number>(Date.now())
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Función para refrescar la sesión con verificación previa
    const handleRefresh = async () => {
      try {
        const now = Date.now()
        const timeSinceLastRefresh = now - lastRefreshTime.current

        // Solo refrescar si han pasado al menos 10 minutos desde el último refresco
        if (timeSinceLastRefresh >= 10 * 60 * 1000) {
          // Verificar primero si hay una sesión activa
          const { data: sessionData } = await supabase.auth.getSession()
          
          // Solo intentar refrescar si hay una sesión activa
          if (sessionData?.session) {
            const { data, error } = await supabase.auth.refreshSession()

            if (error) {
              console.error("Error al refrescar sesión:", error)
            } else {
              console.log("Sesión refrescada correctamente")
              lastRefreshTime.current = Date.now()
            }
          }
        }
      } catch (error) {
        console.error("Error al verificar/refrescar sesión:", error)
      }
    }

    // Configurar un intervalo para verificar si es necesario refrescar
    const intervalId = setInterval(handleRefresh, 5 * 60 * 1000)

    // Refrescar cuando la ventana recupera el foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        handleRefresh()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Limpiar
    return () => {
      clearInterval(intervalId)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  return null
}