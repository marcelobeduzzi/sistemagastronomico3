"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface GenerateDiscrepanciesButtonProps {
  localId?: number
}

export function GenerateDiscrepanciesButton({ localId }: GenerateDiscrepanciesButtonProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    setIsLoading(true)
    try {
      // Navegar a la página de generación de discrepancias
      // Si tenemos un localId, lo pasamos como parámetro de consulta
      if (localId) {
        router.push(`/conciliacion/generar?localId=${localId}`)
      } else {
        router.push("/conciliacion/generar")
      }
    } catch (error) {
      console.error("Error al navegar:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      <Plus className="mr-2 h-4 w-4" />
      Generar Discrepancias
    </Button>
  )
}
