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
import { ArrowLeft, Save, AlertTriangle, Plus, Trash2, CheckCircle, XCircle } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Lista de locales para seleccionar
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

// Interfaz para apertura
interface Apertura {
  id: string
  local_id: string
  local_name: string
  date: string
  shift: string
  responsible: string
  initial_amount: number
  status: string
  has_closing: boolean
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
  const [aperturasPendientes, setAperturasPendientes] = useState<Apertura[]>([])
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
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
    opening_id: "",
    local_id: "",
    local_name: "",
    date: format(new Date(), "yyyy-MM-dd"),
    shift: "mañana",
    responsible: "",
    supervisor: "",
    supervisor_pin: "",

    // Ventas
    total_sales: 0,
    cash_sales: 0,
    credit_card_sales: 0,
    debit_card_sales: 0,
    transfer_sales: 0,
    mercado_pago_sales: 0,
    other_sales: 0,

    // Desglose de billetes
    bills_1000: 0,
    bills_500: 0,
    bills_200: 0,
    bills_100: 0,
    bills_50: 0,
    bills_20: 0,
    bills_10: 0,
    coins: 0,

    // Cálculos
    initial_balance: 0,
    total_expenses: 0,
    total_withdrawals: 0,
    expected_balance: 0,
    actual_balance: 0,
    difference: 0,
    difference_percentage: 0,
    difference_justification: "",

    // Estado
    status: "pendiente",
    has_alert: false,
  })

  // Cargar aperturas pendientes
  useEffect(() => {
    const fetchAperturasPendientes = async () => {
      try {
        const { data, error } = await supabase
          .from("cash_register_openings")
          .select("*")
          .eq("has_closing", false)
          .eq("status", "aprobado")
          .order("date", { ascending: false })

        if (error) throw error

        setAperturasPendientes(data || [])
      } catch (error) {
        console.error("Error al cargar aperturas pendientes:", error)
      }
    }

    fetchAperturasPendientes()
  }, [supabase])

  // Calcular el total de ventas
  useEffect(() => {
    const totalVentas =
      formData.cash_sales +
      formData.credit_card_sales +
      formData.debit_card_sales +
      formData.transfer_sales +
      formData.mercado_pago_sales +
      formData.other_sales

    setFormData((prev) => ({
      ...prev,
      total_sales: totalVentas,
    }))
  }, [
    formData.cash_sales,
    formData.credit_card_sales,
    formData.debit_card_sales,
    formData.transfer_sales,
    formData.mercado_pago_sales,
    formData.other_sales,
  ])

  // Calcular el total de efectivo basado en el desglose de billetes
  useEffect(() => {
    const total =
      formData.bills_1000 * 1000 +
      formData.bills_500 * 500 +
      formData.bills_200 * 200 +
      formData.bills_100 * 100 +
      formData.bills_50 * 50 +
      formData.bills_20 * 20 +
      formData.bills_10 * 10 +
      formData.coins

    setTotalEfectivoCalculado(total)

    setFormData((prev) => ({
      ...prev,
      actual_balance: total,
    }))
  }, [
    formData.bills_1000,
    formData.bills_500,
    formData.bills_200,
    formData.bills_100,
    formData.bills_50,
    formData.bills_20,
    formData.bills_10,
    formData.coins,
  ])

  // Calcular totales de gastos y retiros
  useEffect(() => {
    const totalGastos = gastos.reduce((sum, gasto) => sum + gasto.monto, 0)
    const totalRetiros = retiros.reduce((sum, retiro) => sum + retiro.monto, 0)

    setFormData((prev) => ({
      ...prev,
      total_expenses: totalGastos,
      total_withdrawals: totalRetiros,
    }))
  }, [gastos, retiros])

  // Calcular saldo esperado
  useEffect(() => {
    const saldoEsperado =
      formData.initial_balance + formData.cash_sales - formData.total_expenses - formData.total_withdrawals

    setFormData((prev) => ({
      ...prev,
      expected_balance: saldoEsperado,
    }))
  }, [formData.initial_balance, formData.cash_sales, formData.total_expenses, formData.total_withdrawals])

  // Calcular diferencia y porcentaje
  useEffect(() => {
    const diferencia = formData.actual_balance - formData.expected_balance
    const porcentaje = formData.expected_balance !== 0 ? Math.abs((diferencia / formData.expected_balance) * 100) : 0

    setDiferencia(diferencia)
    setPorcentajeDiferencia(porcentaje)

    setFormData((prev) => ({
      ...prev,
      difference: diferencia,
      difference_percentage: porcentaje,
    }))

    // Si la diferencia es significativa, requerir supervisor
    setNeedsSupervisor(porcentaje > 2)
  }, [formData.actual_balance, formData.expected_balance])

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
      [name]: value === "" ? 0 : Number(value),
    }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Si cambia el local, actualizar el nombre del local
    if (name === "local_id") {
      const selectedLocal = locales.find((local) => local.id === value)
      if (selectedLocal) {
        setFormData((prev) => ({
          ...prev,
          local_name: selectedLocal.name,
        }))
      }
    }

    // Si selecciona una apertura, cargar sus datos
    if (name === "opening_id" && value) {
      const selectedApertura = aperturasPendientes.find((apertura) => apertura.id === value)
      if (selectedApertura) {
        setFormData((prev) => ({
          ...prev,
          local_id: selectedApertura.local_id,
          local_name: selectedApertura.local_name,
          date: selectedApertura.date,
          shift: selectedApertura.shift,
          responsible: selectedApertura.responsible,
          initial_balance: selectedApertura.initial_amount,
        }))
      }
    }
  }

  // Manejar cambios en el nuevo gasto
  const handleGastoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setNuevoGasto((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
    }))
  }

  // Manejar cambio en checkbox
  const handleCheckboxChange = (checked: boolean) => {
    setNuevoGasto((prev) => ({
      ...prev,
      tieneComprobante: checked,
    }))
  }

  // Manejar cambios en el nuevo retiro
  const handleRetiroChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setNuevoRetiro((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? 0 : Number(value)) : value,
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
    if (!formData.local_id) {
      toast({
        title: "Error",
        description: "Debes seleccionar un local",
        variant: "destructive",
      })
      return false
    }

    if (!formData.responsible) {
      toast({
        title: "Error",
        description: "Debes ingresar el nombre del responsable",
        variant: "destructive",
      })
      return false
    }

    if (formData.total_sales <= 0) {
      toast({
        title: "Error",
        description: "El total de ventas debe ser mayor a cero",
        variant: "destructive",
      })
      return false
    }

    if (Math.abs(diferencia) > 0 && !formData.difference_justification) {
      toast({
        title: "Error",
        description: "Debes justificar la diferencia en el saldo",
        variant: "destructive",
      })
      return false
    }

    if (needsSupervisor && (!formData.supervisor || !formData.supervisor_pin)) {
      toast({
        title: "Error",
        description: "Se requiere autorización del supervisor para diferencias significativas",
        variant: "destructive",
      })
      return false
    }

    return true
  }

  // Mostrar diálogo de confirmación
  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setShowConfirmDialog(true)
  }

  // Guardar el cierre de caja
  const handleSubmit = async () => {
    try {
      setIsLoading(true)
      setShowConfirmDialog(false)

      // 1. Guardar el cierre de caja
      const cierreData = {
        opening_id: formData.opening_id || null,
        local_id: formData.local_id,
        local_name: formData.local_name,
        date: formData.date,
        shift: formData.shift,
        responsible: formData.responsible,
        supervisor: needsSupervisor ? formData.supervisor : null,
        supervisor_pin: needsSupervisor ? formData.supervisor_pin : null,

        // Ventas
        total_sales: formData.total_sales,
        cash_sales: formData.cash_sales,
        credit_card_sales: formData.credit_card_sales,
        debit_card_sales: formData.debit_card_sales,
        transfer_sales: formData.transfer_sales,
        mercado_pago_sales: formData.mercado_pago_sales,
        other_sales: formData.other_sales,

        // Desglose de billetes
        bills_1000: formData.bills_1000,
        bills_500: formData.bills_500,
        bills_200: formData.bills_200,
        bills_100: formData.bills_100,
        bills_50: formData.bills_50,
        bills_20: formData.bills_20,
        bills_10: formData.bills_10,
        coins: formData.coins,

        // Cálculos
        initial_balance: formData.initial_balance,
        total_expenses: formData.total_expenses,
        total_withdrawals: formData.total_withdrawals,
        expected_balance: formData.expected_balance,
        actual_balance: formData.actual_balance,
        difference: diferencia,
        difference_percentage: porcentajeDiferencia,
        difference_justification: formData.difference_justification,

        // Estado
        status: needsSupervisor ? "pendiente" : "aprobado",
        has_alert: Math.abs(porcentajeDiferencia) > 0.5,

        // Gastos y retiros como JSON
        expenses: JSON.stringify(gastos),
        withdrawals: JSON.stringify(retiros),
      }

      // Insertar en la base de datos
      const { data: cierreInsertado, error: cierreError } = await supabase
        .from("cash_register_closings")
        .insert(cierreData)
        .select("id")
        .single()

      if (cierreError) throw cierreError

      // 2. Actualizar la apertura si existe
      if (formData.opening_id) {
        const { error: aperturaError } = await supabase
          .from("cash_register_openings")
          .update({ has_closing: true })
          .eq("id", formData.opening_id)

        if (aperturaError) console.error("Error al actualizar apertura:", aperturaError)
      }

      // 3. Generar alertas si es necesario
      if (Math.abs(porcentajeDiferencia) > 0.5) {
        const alertLevel = Math.abs(porcentajeDiferencia) > 2 ? "high" : "medium"

        const alertaData = {
          cash_register_id: cierreInsertado.id,
          type: "diferencia_caja",
          alert_level: alertLevel,
          message: `Diferencia ${diferencia > 0 ? "positiva" : "negativa"} de $${Math.abs(diferencia)} (${Math.abs(porcentajeDiferencia).toFixed(2)}%)`,
          details: JSON.stringify({
            amount: Math.abs(diferencia),
            percentage: Math.abs(porcentajeDiferencia),
            expected: formData.expected_balance,
            actual: formData.actual_balance,
          }),
          status: "pending",
          local_id: formData.local_id,
          local_name: formData.local_name,
          created_at: new Date().toISOString(),
        }

        const { error: alertaError } = await supabase.from("cash_register_alerts").insert(alertaData)

        if (alertaError) console.error("Error al generar alerta:", alertaError)
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

        <form onSubmit={handleSubmitClick}>
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
                    {aperturasPendientes.length > 0 && (
                      <div className="space-y-2">
                        <Label htmlFor="opening_id">Apertura Pendiente</Label>
                        <Select
                          name="opening_id"
                          value={formData.opening_id}
                          onValueChange={(value) => handleSelectChange("opening_id", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar apertura" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="nueva">Nueva apertura</SelectItem>
                            {aperturasPendientes.map((apertura) => (
                              <SelectItem key={apertura.id} value={apertura.id}>
                                {apertura.local_name} - {apertura.date} ({apertura.shift})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="local_id">Local</Label>
                      <Select
                        name="local_id"
                        value={formData.local_id}
                        onValueChange={(value) => handleSelectChange("local_id", value)}
                        disabled={!!formData.opening_id}
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
                      <Label htmlFor="date">Fecha</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={formData.date}
                        onChange={handleInputChange}
                        disabled={!!formData.opening_id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="shift">Turno</Label>
                      <Select
                        name="shift"
                        value={formData.shift}
                        onValueChange={(value) => handleSelectChange("shift", value)}
                        disabled={!!formData.opening_id}
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
                      <Label htmlFor="responsible">Responsable de Caja</Label>
                      <Input
                        id="responsible"
                        name="responsible"
                        value={formData.responsible}
                        onChange={handleInputChange}
                        placeholder="Nombre del responsable"
                        disabled={!!formData.opening_id}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="initial_balance">Saldo Inicial</Label>
                      <Input
                        id="initial_balance"
                        name="initial_balance"
                        type="number"
                        min="0"
                        value={formData.initial_balance || ""}
                        onChange={handleNumberChange}
                        disabled={!!formData.opening_id}
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
                      <Label htmlFor="cash_sales">Efectivo</Label>
                      <Input
                        id="cash_sales"
                        name="cash_sales"
                        type="number"
                        min="0"
                        value={formData.cash_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="credit_card_sales">Tarjeta de Crédito</Label>
                      <Input
                        id="credit_card_sales"
                        name="credit_card_sales"
                        type="number"
                        min="0"
                        value={formData.credit_card_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="debit_card_sales">Tarjeta de Débito</Label>
                      <Input
                        id="debit_card_sales"
                        name="debit_card_sales"
                        type="number"
                        min="0"
                        value={formData.debit_card_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="transfer_sales">Transferencia</Label>
                      <Input
                        id="transfer_sales"
                        name="transfer_sales"
                        type="number"
                        min="0"
                        value={formData.transfer_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mercado_pago_sales">MercadoPago</Label>
                      <Input
                        id="mercado_pago_sales"
                        name="mercado_pago_sales"
                        type="number"
                        min="0"
                        value={formData.mercado_pago_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="other_sales">Otros métodos</Label>
                      <Input
                        id="other_sales"
                        name="other_sales"
                        type="number"
                        min="0"
                        value={formData.other_sales || ""}
                        onChange={handleNumberChange}
                      />
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Ventas:</span>
                        <span className="text-xl font-bold">${formData.total_sales.toLocaleString()}</span>
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
                        <Label htmlFor="bills_1000">Billetes de $1000</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_1000"
                            name="bills_1000"
                            type="number"
                            min="0"
                            value={formData.bills_1000 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_1000 * 1000}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bills_500">Billetes de $500</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_500"
                            name="bills_500"
                            type="number"
                            min="0"
                            value={formData.bills_500 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_500 * 500}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bills_200">Billetes de $200</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_200"
                            name="bills_200"
                            type="number"
                            min="0"
                            value={formData.bills_200 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_200 * 200}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bills_100">Billetes de $100</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_100"
                            name="bills_100"
                            type="number"
                            min="0"
                            value={formData.bills_100 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_100 * 100}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="bills_50">Billetes de $50</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_50"
                            name="bills_50"
                            type="number"
                            min="0"
                            value={formData.bills_50 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_50 * 50}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bills_20">Billetes de $20</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_20"
                            name="bills_20"
                            type="number"
                            min="0"
                            value={formData.bills_20 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_20 * 20}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bills_10">Billetes de $10</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="bills_10"
                            name="bills_10"
                            type="number"
                            min="0"
                            value={formData.bills_10 || ""}
                            onChange={handleNumberChange}
                          />
                          <span className="text-sm font-medium">= ${formData.bills_10 * 10}</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="coins">Monedas (total)</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="coins"
                            name="coins"
                            type="number"
                            min="0"
                            value={formData.coins || ""}
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
                    <CardDescription>Registro de gastos realizados</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {gastos.map((gasto) => (
                      <div key={gasto.id} className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium">{gasto.concepto}</p>
                          <p className="text-sm text-gray-500">${gasto.monto.toLocaleString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => eliminarGasto(gasto.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="nuevo_gasto_concepto">Nuevo Gasto</Label>
                      <Input
                        id="nuevo_gasto_concepto"
                        name="concepto"
                        placeholder="Concepto del gasto"
                        value={nuevoGasto.concepto}
                        onChange={handleGastoChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nuevo_gasto_monto">Monto</Label>
                      <Input
                        id="nuevo_gasto_monto"
                        name="monto"
                        type="number"
                        placeholder="Monto del gasto"
                        value={nuevoGasto.monto || ""}
                        onChange={handleGastoChange}
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="tiene_comprobante"
                        checked={nuevoGasto.tieneComprobante}
                        onCheckedChange={handleCheckboxChange}
                      />
                      <Label htmlFor="tiene_comprobante">Tiene Comprobante</Label>
                    </div>

                    <Button className="w-full" onClick={agregarGasto}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Gasto
                    </Button>
                  </CardContent>
                </Card>

                {/* Retiros */}
                <Card>
                  <CardHeader>
                    <CardTitle>Retiros</CardTitle>
                    <CardDescription>Registro de retiros de efectivo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {retiros.map((retiro) => (
                      <div key={retiro.id} className="flex items-center justify-between py-2 border-b">
                        <div>
                          <p className="font-medium">{retiro.concepto}</p>
                          <p className="text-sm text-gray-500">Autorizado por: {retiro.autorizadoPor}</p>
                          <p className="text-sm text-gray-500">${retiro.monto.toLocaleString()}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => eliminarRetiro(retiro.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <Label htmlFor="nuevo_retiro_concepto">Nuevo Retiro</Label>
                      <Input
                        id="nuevo_retiro_concepto"
                        name="concepto"
                        placeholder="Concepto del retiro"
                        value={nuevoRetiro.concepto}
                        onChange={handleRetiroChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nuevo_retiro_monto">Monto</Label>
                      <Input
                        id="nuevo_retiro_monto"
                        name="monto"
                        type="number"
                        placeholder="Monto del retiro"
                        value={nuevoRetiro.monto || ""}
                        onChange={handleRetiroChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nuevo_retiro_autorizado_por">Autorizado por</Label>
                      <Input
                        id="nuevo_retiro_autorizado_por"
                        name="autorizadoPor"
                        placeholder="Nombre de quien autoriza"
                        value={nuevoRetiro.autorizadoPor}
                        onChange={handleRetiroChange}
                      />
                    </div>

                    <Button className="w-full" onClick={agregarRetiro}>
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar Retiro
                    </Button>
                  </CardContent>
                </Card>
              </div>
              <div className="flex justify-between">
                <Button type="button" variant="outline" onClick={() => setActiveTab("efectivo")}>
                  Anterior
                </Button>
                <Button type="button" onClick={() => setActiveTab("balance")}>
                  Continuar
                </Button>
              </div>
            </TabsContent>

            {/* Pestaña de Balance Final */}
            <TabsContent value="balance" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Balance Final</CardTitle>
                  <CardDescription>Resumen del cierre de caja</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Total Ventas:</Label>
                      <Input type="text" value={`$${formData.total_sales.toLocaleString()}`} readOnly />
                    </div>
                    <div>
                      <Label>Saldo Inicial:</Label>
                      <Input type="text" value={`$${formData.initial_balance.toLocaleString()}`} readOnly />
                    </div>
                    <div>
                      <Label>Total Gastos:</Label>
                      <Input type="text" value={`$${formData.total_expenses.toLocaleString()}`} readOnly />
                    </div>
                    <div>
                      <Label>Total Retiros:</Label>
                      <Input type="text" value={`$${formData.total_withdrawals.toLocaleString()}`} readOnly />
                    </div>
                    <div>
                      <Label>Saldo Esperado:</Label>
                      <Input type="text" value={`$${formData.expected_balance.toLocaleString()}`} readOnly />
                    </div>
                    <div>
                      <Label>Saldo Real:</Label>
                      <Input type="text" value={`$${formData.actual_balance.toLocaleString()}`} readOnly />
                    </div>
                  </div>

                  <div className="mt-6 p-4 border rounded-md bg-amber-500/10">
                    <div className="flex items-center space-x-2">
                      {diferencia !== 0 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      )}
                      <Label className="text-sm font-medium">
                        Diferencia:{" "}
                        <span className={diferencia !== 0 ? (diferencia > 0 ? "text-green-600" : "text-red-600") : ""}>
                          ${diferencia.toLocaleString()} ({porcentajeDiferencia.toFixed(2)}%)
                        </span>
                      </Label>
                    </div>
                    {diferencia !== 0 && (
                      <Textarea
                        placeholder="Justificación de la diferencia"
                        name="difference_justification"
                        value={formData.difference_justification}
                        onChange={handleInputChange}
                        className="mt-2"
                      />
                    )}
                  </div>

                  {needsSupervisor && (
                    <div className="mt-6 p-4 border rounded-md bg-red-500/10">
                      <p className="text-sm font-medium text-red-500">Se requiere autorización del supervisor</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <Label htmlFor="supervisor">Nombre del Supervisor</Label>
                          <Input
                            id="supervisor"
                            name="supervisor"
                            placeholder="Nombre del supervisor"
                            value={formData.supervisor}
                            onChange={handleInputChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="supervisor_pin">PIN del Supervisor</Label>
                          <Input
                            id="supervisor_pin"
                            name="supervisor_pin"
                            type="password"
                            placeholder="PIN del supervisor"
                            value={formData.supervisor_pin}
                            onChange={handleInputChange}
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
                  <Button type="submit">
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Cierre
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </form>

        {/* Diálogo de confirmación */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar cierre de caja</DialogTitle>
              <DialogDescription>
                ¿Estás seguro de que deseas finalizar el cierre de caja? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="flex justify-between font-medium">
                <span>Total Ventas:</span>
                <span>${formData.total_sales.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Saldo Esperado:</span>
                <span>${formData.expected_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Saldo Real:</span>
                <span>${formData.actual_balance.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Diferencia:</span>
                <span className={diferencia !== 0 ? (diferencia > 0 ? "text-green-600" : "text-red-600") : ""}>
                  ${diferencia.toLocaleString()}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={isLoading}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {isLoading ? "Guardando..." : "Confirmar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

