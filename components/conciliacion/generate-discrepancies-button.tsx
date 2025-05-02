"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus } from "lucide-react"
import GenerateDiscrepancies from "./generate-discrepancies"

export function GenerateDiscrepanciesButton() {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <Button onClick={() => setShowDialog(true)}>
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
            <GenerateDiscrepancies />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
