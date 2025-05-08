"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import { GenerateDiscrepanciesContent } from "./generate-discrepancies-content"

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
      // Si no hay ID de local, mostrar el diálogo
      setShowDialog(true)
    }
  }

  return (
    <>
      <Button onClick={handleClick}>
        <Plus className="mr-2 h-4 w-4" />
        Generar Discrepancias
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Generar Discrepancias</DialogTitle>
            <DialogDescription>Genera discrepancias de stock y caja a partir de los datos existentes</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <GenerateDiscrepanciesContent />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
