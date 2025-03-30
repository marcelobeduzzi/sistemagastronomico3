"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, AlertTriangle } from "lucide-react"

// Lista de locales para seleccionar (esto podría venir de una API)
const locales = [
  { id: "cabildo", name: "BR Cabildo" },
  { id: "carranza", name: "BR Carranza" },
  { id: "pacifico", name: "BR Pacífico" },
  { id: "lavalle", name: "BR Lavalle" },
  { id: "rivadavia", name: "BR Rivadavia" },
  { id: "aguero", name: "BR Aguero" },
  { id: "dorrego", name: "BR Dorrego" },
  { id: "dean_dennys", name: "Dean & Dennys" },
]

export default function AperturaCajaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [needsSupervisor, setNeedsSupervisor] = useState(false)
  const [totalCalculado, setTotalCalculado] = useState(0)

  // Estado para los datos de apertura
  const [formData, setFormData] = useState({
    localId: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    turno: "mañana",
    responsable: "",
    supervisor: "",
    supervisorPin: "",

    // Desglose de billetes
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    b10: 0,
    monedas: 0,

    // Verificaciones
    posOperativo: true,
    impresoraOperativa: true,
    observaciones: "",
  })

  // Calcular el total basado en el desglose de billetes
  useEffect(() => {
    const total =
      formData.b1000 * 1000 +
      formData.b500 * 500 +
      formData.b200 * 200 +
      formData.b100 * 100 +
      formData.b50 * 50 +
      formData.b20 * 20 +
      formData.b10 * 10 +
      formData.monedas

    setTotalCalculado(total)
  }, [formData])

  // Manejar cambios en los campos del formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar cambios en campos numéricos
  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number.parseInt(value, 10),
    }))
  }

  // Manejar cambios en switches
  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Validar el formulario
  const validateForm = () => {
    if (!formData.localId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un local",
        variant: "destructive",
      })
      return false
    }

    if (!formData.responsable) {
      toast({
        title: "Error",
        description: "Debes ingresar el nombre del responsable",
        variant: "destructive",
      })
      return false
    }

    if (needsSupervisor && (!formData.supervisor || !formData.supervisorPin)) {
      toast({
        title: "Error",
        description: "Se requiere autorización del supervisor",
        variant: "destructive",
      })
      return false
    }

    if (totalCalculado <= 0) {
      toast({
        title: "Error",
        description: "El monto inicial debe ser mayor a cero",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Guardar la apertura de caja
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setIsLoading(true)

      // Aquí iría la lógica para guardar en la base de datos
      // Por ahora, simulamos una operación exitosa
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Apertura registrada",
        description: "La apertura de caja se ha registrado correctamente",
      })

      // Redireccionar a la página de cajas
      router.push("/caja")
    } catch (error) {
      console.error("Error al guardar la apertura:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar la apertura de caja",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Verificar si ya existe una apertura para este turno
  useEffect(() => {
    const checkExistingApertura = async () => {
      // Aquí iría la lógica para verificar en la base de datos
      // Por ahora, simulamos que no hay aperturas existentes
    }

    checkExistingApertura()
  }, [formData.localId, formData.fecha, formData.turno])

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Apertura de Caja</h1>
          <Button variant="outline" onClick={() => router.push("/caja")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Información general */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                <CardDescription>Datos básicos de la apertura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="localId">Local</Label>
                  <Select
                    name="localId"
                    value={formData.localId}
                    onValueChange={(value) => handleSelectChange("localId", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar local" />
                    </SelectTrigger>
                    <SelectContent>
                      {locales.map((local) => (
                        <SelectItem key={local.id} value={local.id}>
                          {local.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha</Label>
                  <Input id="fecha" name="fecha" type="date" value={formData.fecha} onChange={handleInputChange} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="turno">Turno</Label>
                  <Select
                    name="turno"
                    value={formData.turno}
                    onValueChange={(value) => handleSelectChange("turno", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar turno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mañana">Mañana</SelectItem>
                      <SelectItem value="tarde">Tarde</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsable">Responsable de Caja</Label>
                  <Input
                    id="responsable"
                    name="responsable"
                    value={formData.responsable}
                    onChange={handleInputChange}
                    placeholder="Nombre del responsable"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="supervisor">Supervisor (opcional)</Label>
                    <span className="text-xs text-muted-foreground">{needsSupervisor ? "Requerido" : "Opcional"}</span>
                  </div>
                  <Input
                    id="supervisor"
                    name="supervisor"
                    value={formData.supervisor}
                    onChange={handleInputChange}
                    placeholder="Nombre del supervisor"
                    required={needsSupervisor}
                  />
                </div>

                {(needsSupervisor || formData.supervisor) && (
                  <div className="space-y-2">
                    <Label htmlFor="supervisorPin">PIN del Supervisor</Label>
                    <Input
                      id="supervisorPin"
                      name="supervisorPin"
                      type="password"
                      value={formData.supervisorPin}
                      onChange={handleInputChange}
                      placeholder="PIN de autorización"
                      required={needsSupervisor}
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Desglose de efectivo */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Desglose de Efectivo</CardTitle>
                <CardDescription>Detalle del efectivo inicial</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="b1000">Billetes de $1000</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="b1000"
                      name="b1000"
                      type="number"
                      min="0"
                      value={formData.b1000 || ""}
                      onChange={handleNumberChange}
                    />
                    <span className="text-sm font-medium">= ${formData.b1000 * 1000}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="b500">Billetes de $500</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="b500"
                      name="b500"
                      type="number"
                      min="0"
                      value={formData.b500 || ""}
                      onChange={handleNumberChange}
                    />
                    <span className="text-sm font-medium">= ${formData.b500 * 500}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="b200">Billetes de $200</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="b200"
                      name="b200"
                      type="number"
                      min="0"
                      value={formData.b200 || ""}
                      onChange={handleNumberChange}
                    />
                    <span className="text-sm font-medium">= ${formData.b200 * 200}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="b100">Billetes de $100</Label>
                  <div className="flex items-center space-x-2">
                    <Input
                      id="b100"
                      name="b100"
                      type="number"
                      min="0"
                      value={formData.b100 || ""}
                      onChange={handleNumberChange}
                    />
                    <span className="text-sm font-medium">= ${formData.b100 * 100}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="b50">Billetes de $50</Label>
                    <Input
                      id="b50"
                      name="b50"
                      type="number"
                      min="0"
                      value={formData.b50 || ""}
                      onChange={handleNumberChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="b20">Billetes de $20</Label>
                    <Input
                      id="b20"
                      name="b20"
                      type="number"
                      min="0"
                      value={formData.b20 || ""}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="b10">Billetes de $10</Label>
                    <Input
                      id="b10"
                      name="b10"
                      type="number"
                      min="0"
                      value={formData.b10 || ""}
                      onChange={handleNumberChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="monedas">Monedas (total)</Label>
                    <Input
                      id="monedas"
                      name="monedas"
                      type="number"
                      min="0"
                      value={formData.monedas || ""}
                      onChange={handleNumberChange}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Total Efectivo:</span>
                    <span className="text-xl font-bold">${totalCalculado.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Verificaciones y observaciones */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Verificaciones</CardTitle>
                <CardDescription>Estado de equipos y observaciones</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="posOperativo" className="cursor-pointer">
                      Terminal POS operativa
                    </Label>
                    <Switch
                      id="posOperativo"
                      checked={formData.posOperativo}
                      onCheckedChange={(checked) => handleSwitchChange("posOperativo", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="impresoraOperativa" className="cursor-pointer">
                      Impresora operativa
                    </Label>
                    <Switch
                      id="impresoraOperativa"
                      checked={formData.impresoraOperativa}
                      onCheckedChange={(checked) => handleSwitchChange("impresoraOperativa", checked)}
                    />
                  </div>
                </div>

                {(!formData.posOperativo || !formData.impresoraOperativa) && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-700">
                      <p className="font-medium">Atención</p>
                      <p>
                        Has indicado que algún equipo no está operativo. Por favor, detalla el problema en las
                        observaciones y notifica a soporte técnico.
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    name="observaciones"
                    value={formData.observaciones}
                    onChange={handleInputChange}
                    placeholder="Ingresa cualquier observación relevante"
                    rows={5}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  {isLoading ? "Guardando..." : "Registrar Apertura"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}

