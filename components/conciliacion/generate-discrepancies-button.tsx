"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"

interface GenerateDiscrepanciesButtonProps {
  localId?: number
}

export function GenerateDiscrepanciesButton({ localId }: GenerateDiscrepanciesButtonProps) {
  const [showDialog, setShowDialog] = useState(false)
  const router = useRouter()

  const handleClick = () => {
    if (localId) {
      // Si tenemos un ID de local, redirigir a la página de generar discrepancias con el local preseleccionado
      router.push(`/conciliacion/generar-discrepancias?localId=${localId}`)
    } else {
      // Si no hay ID de local, mostrar el diálogo o redirigir a la página general
      router.push(`/conciliacion/generar-discrepancias`)
    }
  }

  return (
    <Button onClick={handleClick}>
      <Plus className="mr-2 h-4 w-4" />
      Generar Discrepancias
    </Button>
  )
}
