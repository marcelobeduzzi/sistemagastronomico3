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

    // Usar window.location.href para una navegación directa en lugar de router.push
    // Esto evita cualquier lógica adicional que pueda estar ocurriendo durante la navegación
    if (localId) {
      window.location.href = `/conciliacion/generar?localId=${localId}`
    } else {
      window.location.href = "/conciliacion/generar"
    }

    // No necesitamos setIsLoading(false) aquí porque la página se recargará
  }

  return (
    <Button onClick={handleClick} disabled={isLoading}>
      <Plus className="mr-2 h-4 w-4" />
      Generar Discrepancias
    </Button>
  )
}
