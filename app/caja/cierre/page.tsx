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
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2 } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

// Interfaz para gastos
interface Gasto {
  id: string
  concepto: string
  monto: number
  tieneComprobante: boolean
  numeroComprobante?: string
  imagenComprobante?: string
}

// Interfaz para retiros
interface Retiro {
  id: string
  concepto: string
  monto: number
  autorizadoPor: string
}

export default function CierreCajaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("ventas")
  const [needsSupervisor, setNeedsSupervisor] = useState(false)
  const [totalEfectivoCalculado, setTotalEfectivoCalculado] = useState(0)
  const [diferencia, setDiferencia] = useState(0)
  const [porcentajeDiferencia, setPorcentajeDiferencia] = useState(0)
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [retiros, setRetiros] = useState<Retiro[]>([])
  const [nuevoGasto, setNuevoGasto] = useState<Gasto>({
    id: "",
    concepto: "",
    monto: 0,
    tieneComprobante: false,
  })
  const [nuevoRetiro, setNuevoRetiro] = useState<Retiro>({
    id: "",
    concepto: "",
    monto: 0,
    autorizadoPor: "",
  })

  // Estado para los datos de cierre
  const [formData, setFormData] = useState({
    aperturaId: "",
    localId: "",
    fecha: format(new Date(), "yyyy-MM-dd"),
    turno: "mañana",
    responsable: "",
    supervisor: "",
    supervisorPin: "",

    // Ventas
    ventasTotales: 0,
    efectivo: 0,
    tarjetaCredito: 0,
    tarjetaDebito: 0,
    transferencia: 0,
    mercadoPago: 0,
    otros: 0,

    // Desglose de billetes
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    b20: 0,
    b10: 0,
    monedas: 0,

    // Cálculos
    saldoInicial: 5000, // Esto vendría de la apertura
    totalGastos: 0,
    totalRetiros: 0,
    saldoEsperado: 0,
    saldoReal: 0,

    // Justificación
    justificacionDiferencia: "",
  })

  // Calcular el total de ventas
  useEffect(() => {
    const totalVentas =
      formData.efectivo +
      formData.tarjetaCredito +
      formData.tarjetaDebito +
      formData.transferencia +
      formData.mercadoPago +
      formData.otros

    setFormData((prev) => ({
      ...prev,
      ventasTotales: totalVentas,
    }))
  }, [
    formData.efectivo,
    formData.tarjetaCredito,
    formData.tarjetaDebito,
    formData.transferencia,
    formData.mercadoPago,
    formData.otros,
  ])

  // Calcular el total de efectivo basado en el desglose de billetes
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

    setTotalEfectivoCalculado(total)

    setFormData((prev) => ({
      ...prev,
      saldoReal: total,
    }))
  }, [
    formData.b1000,
    formData.b500,
    formData.b200,
    formData.b100,
    formData.b50,
    formData.b20,
    formData.b10,
    formData.monedas,
  ])

  // Calcular totales de gastos y retiros
  useEffect(() => {
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)
    const totalRetiros = retiros.reduce((sum, retiro) => sum + retiro.monto, 0)

    setFormData((prev) => ({
      ...prev,
      totalGastos,
      totalRetiros,
    }))
  }, [gastos, retiros])

  // Calcular saldo esperado
  useEffect(() => {
    const saldoEsperado = formData.saldoInicial + formData.efectivo - formData.totalGastos - formData.totalRetiros

    setFormData((prev) => ({
      ...prev,
      saldoEsperado,
    }))
  }, [formData.saldoInicial, formData.efectivo, formData.totalGastos, formData.totalRetiros])

  // Calcular diferencia y porcentaje
  useEffect(() => {
    const diferencia = formData.saldoReal - formData.saldoEsperado
    const porcentaje = formData.saldoEsperado !== 0 ? Math.abs((diferencia / formData.saldoEsperado) * 100) : 0

    setDiferencia(diferencia)
    setPorcentajeDiferencia(porcentaje)

    // Si la diferencia es significativa, requerir supervisor
    setNeedsSupervisor(porcentaje > 2)
  }, [formData.saldoReal, formData.saldoEsperado])

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

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar cambios en el nuevo gasto
  const handleGastoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setNuevoGasto((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number.parseFloat(value)) : value,
    }))
  }

  // Manejar cambios en el nuevo retiro
  const handleRetiroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setNuevoRetiro((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number.parseFloat(value)) : value,
    }))
  }

  // Agregar un nuevo gasto
  const agregarGasto = () => {
    if (!nuevoGasto.concepto || nuevoGasto.monto <= 0) {
      toast({
        title: "Error",
        description: "Debes ingresar un concepto y un monto válido",
        variant: "destructive",
      })
      return
    }

    const gastoConId = {
      ...nuevoGasto,
      id: Date.now().toString(),
    }

    setGastos([...gastos, gastoConId])
    setNuevoGasto({
      id: "",
      concepto: "",
      monto: 0,
      tieneComprobante: false,
    })
  }

  // Eliminar un gasto
  const eliminarGasto = (id: string) => {
    setGastos(gastos.filter((gasto) => gasto.id !== id))
  }

  // Agregar un nuevo retiro
  const agregarRetiro = () => {
    if (!nuevoRetiro.concepto || nuevoRetiro.monto <= 0 || !nuevoRetiro.autorizadoPor) {
      toast({
        title: "Error",
        description: "Debes completar todos los campos del retiro",
        variant: "destructive",
      })
      return
    }

    const retiroConId = {
      ...nuevoRetiro,
      id: Date.now().toString(),
    }

    setRetiros([...retiros, retiroConId])
    setNuevoRetiro({
      id: "",
      concepto: "",
      monto: 0,
      autorizadoPor: "",
    })
  }

  // Eliminar un retiro
  const eliminarRetiro = (id: string) => {
    setRetiros(retiros.filter((retiro) => retiro.id !== id))
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

    if (formData.ventasTotales <= 0) {
      toast({
        title: "Error",
        description: "El total de ventas debe ser mayor a cero",
        variant: "destructive",
      })
      return false
    }

    if (Math.abs(diferencia) > 0 && !formData.justificacionDiferencia) {
      toast({
        title: "Error",
        description: "Debes justificar la diferencia en el saldo",
        variant: "destructive",
      })
      return false
    }

    if (needsSupervisor && (!formData.supervisor || !formData.supervisorPin)) {
      toast({
        title: "Error",
        description: "Se requiere autorización del supervisor para diferencias significativas",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Guardar el cierre de caja
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      setIsLoading(true)

      // 1. Guardar el cierre de caja
      const cierreData = {
        local_id: formData.localId,
        fecha: formData.fecha,
        turno: formData.turno,
        responsable: formData.responsable,
        ventas_totales: formData.ventasTotales,
        efectivo: formData.efectivo,
        tarjeta_credito: formData.tarjetaCredito,
        tarjeta_debito: formData.tarjetaDebito,
        transferencia: formData.transferencia,
        mercado_pago: formData.mercadoPago,
        otros: formData.otros,
        saldo_inicial: formData.saldoInicial,
        saldo_esperado: formData.saldoEsperado,
        saldo_real: formData.saldoReal,
        diferencia: diferencia,
        porcentaje_diferencia: porcentajeDiferencia,
        justificacion_diferencia: formData.justificacionDiferencia,
        supervisor: needsSupervisor ? formData.supervisor : null,
        estado: needsSupervisor ? 'pendiente' : 'aprobado',
        gastos: gastos,
        retiros: retiros,
      }

      // Insertar en la base de datos
      const { data: cierreInsertado, error: cierreError } = await supabase
        .from('cash_register_closings')
        .insert(cierreData)
        .select('id')
        .single()

      if (cierreError) throw cierreError

      // 2. Generar alertas si es necesario
      const alertas = []

      // Alerta por diferencia significativa
      if (Math.abs(porcentajeDiferencia) > 0.5) {
        const alertLevel = Math.abs(porcentajeDiferencia) > 2 ? 'high' : 'medium'
        
        alertas.push({
          cash_register_id: cierreInsertado.id,
          type: 'diferencia_caja',
          alert_level: alertLevel,
          message: `Diferencia ${diferencia > 0 ? 'positiva' : 'negativa'} de $${Math.abs(diferencia)} (${Math.abs(porcentajeDiferencia).toFixed(2)}%)`,
          details: JSON.stringify({
            amount: Math.abs(diferencia),
            percentage: Math.abs(porcentajeDiferencia),
            expected: formData.saldoEsperado,
            actual: formData.saldoReal
          }),
          date: new Date().toISOString(),
          status: 'pending',
          local_id: formData.localId,
          local_name: locales.find(l => l.id === formData.localId)?.name || formData.localId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      // Alerta por gastos elevados (ejemplo)
      if (formData.totalGastos > formData.efectivo * 0.1) {
        alertas.push({
          cash_register_id: cierreInsertado.id,
          type: 'gastos_elevados',
          alert_level: 'medium',
          message: `Gastos representan más del 10% de las ventas en efectivo`,
          details: JSON.stringify({
            amount: formData.totalGastos,
            percentage: (formData.totalGastos / formData.efectivo) * 100,
            sales: formData.efectivo
          }),
          date: new Date().toISOString(),
          status: 'pending',
          local_id: formData.localId,
          local_name: locales.find(l => l.id === formData.localId)?.name || formData.localId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      }

      // Insertar alertas si existen
      if (alertas.length > 0) {
        const { error: alertasError } = await supabase
          .from('cash_register_alerts')
          .insert(alertas)

        if (alertasError) console.error("Error al generar alertas:", alertasError)
      }

      toast({
        title: "Cierre registrado",
        description: "El cierre de caja se ha registrado correctamente",
      })

      // Redireccionar a la página de cajas
      router.push("/caja")
    } catch (error) {
      console.error("Error al guardar el cierre:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al registrar el cierre de caja",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar datos de apertura
  useEffect(() => {
    const cargarApertura = async () => {
      // Aquí iría la lógica para cargar la apertura correspondiente
      // Por ahora, simulamos datos de apertura
      setFormData((prev) => ({
        ...prev,
        saldoInicial: 5000, // Esto vendría de la apertura real
        responsable: "Juan Pérez", // Esto vendría de la apertura real
      }))
    }

    if (formData.localId && formData.fecha && formData.turno) {
      cargarApertura()
    }
  }, [formData.localId, formData.fecha, formData.turno])

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Cierre de Caja</h1>
          <Button variant="outline" onClick={() => router.push("/caja")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <form onSubmit={handleSubmit}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-4 mb-4">
              <TabsTrigger value="ventas">Ventas</TabsTrigger>
              <TabsTrigger value="efectivo">Efectivo</TabsTrigger>
              <TabsTrigger value="gastos">Gastos y Retiros</TabsTrigger>
              <TabsTrigger value="balance">Balance Final</TabsTrigger>
            </TabsList>

            {/* Pestaña de Ventas */}
            <TabsContent value="ventas" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información general */}
                <Card>
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                    <CardDescription>Datos básicos del cierre</CardDescription>
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
                  </CardContent>
                </Card>

                {/* Desglose de ventas */}
                <Card>
                  <CardHeader>
                    <CardTitle>Desglose de Ventas</CardTitle>
                    <CardDescription>Detalle por método de pago</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="efectivo">Efectivo</Label>
                      <Input
                        id="efectivo"
                        name="efectivo"
                        type="number"
                        min="0"
                        value={formData.efectivo || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tarjetaCredito">Tarjeta de Crédito</Label>
                      <Input
                        id="tarjetaCredito"
                        name="tarjetaCredito"
                        type="number"
                        min="0"
                        value={formData.tarjetaCredito || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tarjetaDebito">Tarjeta de Débito</Label>
                      <Input
                        id="tarjetaDebito"
                        name="tarjetaDebito"
                        type="number"
                        min="0"
                        value={formData.tarjetaDebito || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transferencia">Transferencia</Label>
                      <Input
                        id="transferencia"
                        name="transferencia"
                        type="number"
                        min="0"
                        value={formData.transferencia || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mercadoPago">MercadoPago</Label>
                      <Input
                        id="mercadoPago"
                        name="mercadoPago"
                        type="number"
                        min="0"
                        value={formData.mercadoPago || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="otros">Otros métodos</Label>
                      <Input
                        id="otros"
                        name="otros"
                        type="number"
                        min="0"
                        value={formData.otros || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Ventas:</span>
                        <span className="text-xl font-bold">${formData.ventasTotales.toLocaleString()}</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="button" onClick={() => setActiveTab("efectivo")}>
                      Continuar
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de Efectivo */}
            <TabsContent value="efectivo" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Desglose de Efectivo</CardTitle>
                  <CardDescription>Conteo final de efectivo en caja</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
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
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="b50">Billetes de $50</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="b50"
                            name="b50"
                            type="number"
                            min="0"
                            value={formData.b50 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.b50 * 50}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="b20">Billetes de $20</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="b20"
                            name="b20"
                            type="number"
                            min="0"
                            value={formData.b20 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.b20 * 20}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="b10">Billetes de $10</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="b10"
                            name="b10"
                            type="number"
                            min="0"
                            value={formData.b10 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.b10 * 10}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="monedas">Monedas (total)</Label>
                        <div className="flex items-center space-x-2">
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
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Total Efectivo en Caja:</span>
                      <span className="text-xl font-bold">${totalEfectivoCalculado.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("ventas")}>
                    Anterior
                  </Button>
                  <Button type="button" onClick={() => setActiveTab("gastos")}>
                    Continuar
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            {/* Pestaña de Gastos y Retiros */}
            <TabsContent value="gastos" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Gastos */}
                <Card>
                  <CardHeader>
                    <CardTitle>Gastos</CardTitle>
                    <CardDescription>Gastos realizados durante el turno</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="gastoConcepto">Concepto</Label>
                        <Input
                          id="gastoConcepto"
                          name="concepto"
                          value={nuevoGasto.concepto}
                          onChange={handleGastoChange}
                          placeholder="Descripción del gasto"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gastoMonto">Monto</Label>
                        <Input
                          id="gastoMonto"
                          name="monto"
                          type="number"
                          min="0"
                          value={nuevoGasto.monto || ""}
                          onChange={handleGastoChange}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gastoComprobante">Número de Comprobante</Label>
                        <Input
                          id="gastoComprobante"
                          name="numeroComprobante"
                          value={nuevoGasto.numeroComprobante || ""}
                          onChange={handleGastoChange}
                          placeholder="Opcional"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" onClick={agregarGasto}>
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Gasto
                        </Button>
                      </div>
                    </div>

                    {gastos.length > 0 && (
                      <div className="mt-4 border rounded-md">
                        <div className="bg-muted p-2 font-medium text-sm grid grid-cols-12 gap-2">
                          <div className="col-span-5">Concepto</div>
                          <div className="col-span-3">Monto</div>
                          <div className="col-span-3">Comprobante</div>
                          <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y">
                          {gastos.map((gasto) => (
                            <div key={gasto.id} className="p-2 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5 truncate">{gasto.concepto}</div>
                              <div className="col-span-3">${gasto.monto.toLocaleString()}</div>
                              <div className="col-span-3 truncate">{gasto.numeroComprobante || "Sin comprobante"}</div>
                              <div className="col-span-1 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => eliminarGasto(gasto.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-muted p-2 font-medium flex justify-between">
                          <span>Total Gastos:</span>
                          <span>${formData.totalGastos.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Retiros */}
                <Card>
                  <CardHeader>
                    <CardTitle>Retiros de Efectivo</CardTitle>
                    <CardDescription>Retiros realizados durante el turno</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="retiroConcepto">Concepto</Label>
                        <Input
                          id="retiroConcepto"
                          name="concepto"
                          value={nuevoRetiro.concepto}
                          onChange={handleRetiroChange}
                          placeholder="Motivo del retiro"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="retiroMonto">Monto</Label>
                        <Input
                          id="retiroMonto"
                          name="monto"
                          type="number"
                          min="0"
                          value={nuevoRetiro.monto || ""}
                          onChange={handleRetiroChange}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="retiroAutorizado">Autorizado por</Label>
                        <Input
                          id="retiroAutorizado"
                          name="autorizadoPor"
                          value={nuevoRetiro.autorizadoPor}
                          onChange={handleRetiroChange}
                          placeholder="Nombre del autorizante"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button type="button" onClick={agregarRetiro}>
                          <Plus className="mr-2 h-4 w-4" />
                          Agregar Retiro
                        </Button>
                      </div>
                    </div>

                    {retiros.length > 0 && (
                      <div className="mt-4 border rounded-md">
                        <div className="bg-muted p-2 font-medium text-sm grid grid-cols-12 gap-2">
                          <div className="col-span-5">Concepto</div>
                          <div className="col-span-3">Monto</div>
                          <div className="col-span-3">Autorizado</div>
                          <div className="col-span-1"></div>
                        </div>
                        <div className="divide-y">
                          {retiros.map((retiro) => (
                            <div key={retiro.id} className="p-2 grid grid-cols-12 gap-2 items-center">
                              <div className="col-span-5 truncate">{retiro.concepto}</div>
                              <div className="col-span-3">${retiro.monto.toLocaleString()}</div>
                              <div className="col-span-3 truncate">{retiro.autorizadoPor}</div>
                              <div className="col-span-1 flex justify-end">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => eliminarRetiro(retiro.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-muted p-2 font-medium flex justify-between">
                          <span>Total Retiros:</span>
                          <span>${formData.totalRetiros.toLocaleString()}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setActiveTab("efectivo")}>
                      Anterior
                    </Button>
                    <Button type="button" onClick={() => setActiveTab("balance")}>
                      Continuar
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            {/* Pestaña de Balance Final */}
            <TabsContent value="balance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Final</CardTitle>
                  <CardDescription>Resumen y cierre de caja</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Resumen de Ventas</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Ventas en Efectivo:</span>
                          <span>${formData.efectivo.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ventas con Tarjeta de Crédito:</span>
                          <span>${formData.tarjetaCredito.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ventas con Tarjeta de Débito:</span>
                          <span>${formData.tarjetaDebito.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ventas por Transferencia:</span>
                          <span>${formData.transferencia.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ventas por MercadoPago:</span>
                          <span>${formData.mercadoPago.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Ventas por Otros Métodos:</span>
                          <span>${formData.otros.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>Total Ventas:</span>
                          <span>${formData.ventasTotales.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Cálculo de Efectivo</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Saldo Inicial:</span>
                          <span>${formData.saldoInicial.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>+ Ventas en Efectivo:</span>
                          <span>${formData.efectivo.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Gastos:</span>
                          <span>${formData.totalGastos.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>- Retiros:</span>
                          <span>${formData.totalRetiros.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium pt-2 border-t">
                          <span>= Saldo Esperado:</span>
                          <span>${formData.saldoEsperado.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-medium">
                          <span>Saldo Real (contado):</span>
                          <span>${formData.saldoReal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="font-bold">Diferencia:</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-bold ${diferencia !== 0 ? (diferencia > 0 ? "text-green-600" : "text-red-600") : ""}`}>
                              ${diferencia.toLocaleString()} ({diferencia > 0 ? "Sobrante" : diferencia < 0 ? "Faltante" : "Sin diferencia"})
                            </span>
                            
                            {/* Indicador de semáforo */}
                            <div className="flex items-center gap-1 ml-2">
                              <div 
                                className={`h-3 w-3 rounded-full ${
                                  Math.abs(porcentajeDiferencia) < 0.5 
                                    ? "bg-green-500" 
                                    : Math.abs(porcentajeDiferencia) < 2 
                                      ? "bg-yellow-500" 
                                      : "bg-red-500"
                                }`} 
                              />
                              <span className="text-xs text-muted-foreground">
                                {Math.abs(porcentajeDiferencia).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Alerta de diferencia significativa */}
                  {Math.abs(diferencia) > 0 && (
                    <div
                      className={`p-4 border rounded-md ${Math.abs(porcentajeDiferencia) > 2 ? "bg-red-50 border-red-200" : "bg-yellow-50 border-yellow-200"}`}
                    >
                      <div className="flex items-start">
                        <AlertTriangle
                          className={`h-5 w-5 mr-2 flex-shrink-0 ${Math.abs(porcentajeDiferencia) > 2 ? "text-red-500" : "text-yellow-500"}`}
                        />
                        <div>
                          <h4 className="font-medium">
                            {Math.abs(porcentajeDiferencia) > 2
                              ? "Diferencia significativa detectada"
                              : "Diferencia detectada"}
                          </h4>
                          <p className="text-sm mt-1">
                            {Math.abs(porcentajeDiferencia) > 2
                              ? "La diferencia supera el 2% del saldo esperado. Se requiere autorización del supervisor."
                              : "Hay una diferencia entre el saldo esperado y el conteo real. Por favor, justifique la diferencia."}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Justificación de diferencia */}
                  {Math.abs(diferencia) > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="justificacionDiferencia">Justificación de la diferencia</Label>
                      <Textarea
                        id="justificacionDiferencia"
                        name="justificacionDiferencia"
                        value={formData.justificacionDiferencia}
                        onChange={handleInputChange}
                        placeholder="Explique el motivo de la diferencia..."
                        rows={3}
                        required
                      />
                    </div>
                  )}

                  {/* Autorización del supervisor para diferencias significativas */}
                  {needsSupervisor && (
                    <div className="space-y-4 p-4 border rounded-md bg-red-50 border-red-200">
                      <h4 className="font-medium">Autorización requerida</h4>
                      <p className="text-sm">
                        La diferencia es significativa y requiere autorización de un supervisor para completar el
                        cierre.
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="supervisor">Supervisor</Label>
                          <Input
                            id="supervisor"
                            name="supervisor"
                            value={formData.supervisor}
                            onChange={handleInputChange}
                            placeholder="Nombre del supervisor"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supervisorPin">PIN de autorización</Label>
                          <Input
                            id="supervisorPin"
                            name="supervisorPin"
                            type="password"
                            value={formData.supervisorPin}
                            onChange={handleInputChange}
                            placeholder="PIN del supervisor"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => setActiveTab("gastos")}>
                    Anterior
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    <Save className="mr-2 h-4 w-4" />
                    {isLoading ? "Guardando..." : "Finalizar Cierre"}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>
      </div>
    </DashboardLayout>
  )
}

