"use client"

import { useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase/client"

export function SessionRefreshHandler() {
  const lastRefreshTime = useRef<number>(Date.now())
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Función para refrescar la sesión con límite de frecuencia
    const handleRefresh = async () => {
      const now = Date.now()
      const timeSinceLastRefresh = now - lastRefreshTime.current

      // Solo refrescar si han pasado al menos 10 minutos desde el último refresco
      if (timeSinceLastRefresh >= 10 * 60 * 1000) {
        try {
          const { data, error } = await supabase.auth.refreshSession()
          
          if (error) {
            console.error("Error refreshing session:", error)
          } else {
            console.log("Session refreshed successfully")
            lastRefreshTime.current = Date.now()
          }
        } catch (error) {
          console.error("Error refreshing session:", error)
        }
      }
    }

    // Configurar un intervalo para verificar si es necesario refrescar
    // Verificamos cada 5 minutos, pero solo refrescamos si han pasado 10 minutos
    const intervalId = setInterval(handleRefresh, 5 * 60 * 1000)

    // Refrescar cuando la ventana recupera el foco, pero respetando el límite de tiempo
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