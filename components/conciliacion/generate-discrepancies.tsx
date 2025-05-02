"use client"

import type React from "react"

import { useState } from "react"
import { format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"
import { Loader2, AlertTriangle } from "lucide-react"
import { supabase } from "@/lib/supabase/client"

// Lista fija de locales con IDs numéricos
const locales = [
  { id: 1, name: "BR Cabildo" },
  { id: 2, name: "BR Carranza" },
  { id: 3, name: "BR Pacífico" },
  { id: 4, name: "BR Lavalle" },
  { id: 5, name: "BR Rivadavia" },
  { id: 6, name: "BR Aguero" },
  { id: 7, name: "BR Dorrego" },
  { id: 8, name: "Dean & Dennys" },
]

export default function GenerateDiscrepancies() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    locationId: "",
    shift: "mañana",
    overwrite: false,
  })

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.date || !formData.locationId || !formData.shift) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      })
      return
    }

    // Si overwrite es true, pedir confirmación adicional
    if (formData.overwrite) {
      const confirmed = confirm(
        "ADVERTENCIA: Has seleccionado sobrescribir discrepancias existentes. Esta acción eliminará todas las discrepancias previas para la fecha y local seleccionados. ¿Estás seguro de continuar?",
      )
      if (!confirmed) {
        return
      }
    }

    try {
      setIsLoading(true)

      // Llamar al procedimiento almacenado
      const { error } = await supabase.rpc("generate_discrepancies", {
        p_date: formData.date,
        p_location_id: Number(formData.locationId),
        p_shift: formData.shift,
        p_overwrite: formData.overwrite,
      })

      if (error) {
        console.error("Error al generar discrepancias:", error)
        throw new Error(error.message)
      }

      toast({
        title: "Éxito",
        description: "Discrepancias generadas correctamente",
      })
    } catch (error: any) {
      console.error("Error al generar discrepancias:", error)
      toast({
        title: "Error",
        description: error.message || "No se pudieron generar las discrepancias",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Generar Discrepancias</CardTitle>
        <CardDescription>Genera discrepancias de stock y caja a partir de los datos existentes</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Fecha</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => handleChange("date", e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Select
              value={formData.locationId}
              onValueChange={(value) => handleChange("locationId", value)}
              disabled={isLoading}
            >
              <SelectTrigger id="location">
                <SelectValue placeholder="Seleccionar local" />
              </SelectTrigger>
              <SelectContent>
                {locales.map((local) => (
                  <SelectItem key={local.id} value={local.id.toString()}>
                    {local.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shift">Turno</Label>
            <Select value={formData.shift} onValueChange={(value) => handleChange("shift", value)} disabled={isLoading}>
              <SelectTrigger id="shift">
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mañana">Mañana</SelectItem>
                <SelectItem value="tarde">Tarde</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="overwrite"
              checked={formData.overwrite}
              onCheckedChange={(checked) => handleChange("overwrite", checked)}
              disabled={isLoading}
            />
            <Label htmlFor="overwrite" className="cursor-pointer">
              Sobrescribir discrepancias existentes
            </Label>
          </div>

          {formData.overwrite && (
            <div className="bg-amber-50 p-3 rounded-md border border-amber-200 flex items-start">
              <AlertTriangle className="h-5 w-5 text-amber-600 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Esta opción eliminará todas las discrepancias existentes para la fecha y local seleccionados antes de
                generar nuevas.
              </p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generando...
              </>
            ) : (
              "Generar Discrepancias"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
