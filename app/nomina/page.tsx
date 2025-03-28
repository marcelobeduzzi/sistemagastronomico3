"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table"
import { dbService } from "@/lib/db-service"
import { formatCurrency, formatDate, generatePayslip } from "@/lib/export-utils"
import { useToast } from "@/components/ui/use-toast"
import { Download, RefreshCw, CheckCircle, FileText, Calendar, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { StatusBadge } from "@/components/status-badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { Employee, Payroll, Liquidation } from "@/types"

export default function NominaPage() {
  const [activeTab, setActiveTab] = useState("pendientes")
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [filteredPayrolls, setFilteredPayrolls] = useState<Payroll[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [historyPayrolls, setHistoryPayrolls] = useState<Payroll[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isGeneratingPayrolls, setIsGeneratingPayrolls] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [showAllPending, setShowAllPending] = useState(false)
  const { toast } = useToast()

  // Estados para el diálogo de pago
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo")
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [isHandSalaryPaid, setIsHandSalaryPaid] = useState(false)
  const [isBankSalaryPaid, setIsBankSalaryPaid] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedMonth, selectedYear, activeTab, showAllPending])

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Cargar empleados
      const employeesData = await dbService.getEmployees()
      setEmployees(employeesData)

      // Cargar nóminas según la pestaña activa
      if (activeTab === "pendientes" || activeTab === "liquidaciones") {
        // Cargar todas las nóminas pendientes
        const payrollsData = await dbService.getPayrollsByPeriod(selectedMonth, selectedYear, false)
        setPayrolls(payrollsData)

        console.log("Total nóminas pendientes:", payrollsData.length)

        // Filtrar las nóminas para el mes/año seleccionado
        const filtered = showAllPending
          ? payrollsData
          : payrollsData.filter((p) => p.month === selectedMonth && p.year === selectedYear)

        setFilteredPayrolls(filtered)
        console.log(
          `Nóminas pendientes ${showAllPending ? "todas" : `para ${selectedMonth}/${selectedYear}`}: ${filtered.length}`,
        )

        // Cargar liquidaciones pendientes
        const liquidationsData = await dbService.getLiquidations(false)
        setLiquidations(liquidationsData)
      } else if (activeTab === "historial") {
        // Cargar historial de nóminas pagadas
        const historyData = await dbService.getPayrollsByPeriod(selectedMonth, selectedYear, true)
        setHistoryPayrolls(historyData)
      }
    } catch (error) {
      console.error("Error al cargar datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePayrolls = async () => {
    setIsGeneratingPayrolls(true)
    try {
      console.log(`Generando nóminas para ${selectedMonth}/${selectedYear}`)
      // Llamar al servicio para generar nóminas
      await dbService.generatePayrolls(selectedMonth, selectedYear)

      toast({
        title: "Nóminas generadas",
        description: "Las nóminas han sido generadas correctamente.",
      })

      // Recargar datos
      loadData()
    } catch (error) {
      console.error("Error al generar nóminas:", error)
      toast({
        title: "Error",
        description: "No se pudieron generar las nóminas. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPayrolls(false)
    }
  }

  const handleToggleShowAllPending = () => {
    setShowAllPending(!showAllPending)
  }

  const handlePaymentConfirmation = async () => {
    if (!selectedPayroll) return

    try {
      // Actualizar el estado de pago de la nómina
      const updatedPayroll = {
        ...selectedPayroll,
        handSalaryPaid: isHandSalaryPaid,
        bankSalaryPaid: isBankSalaryPaid,
        isPaid: isHandSalaryPaid && isBankSalaryPaid,
        paymentDate: isHandSalaryPaid && isBankSalaryPaid ? paymentDate : null,
        paymentMethod: paymentMethod,
        paymentReference: paymentReference,
      }

      await dbService.updatePayroll(selectedPayroll.id, updatedPayroll)

      toast({
        title: "Pago confirmado",
        description: "El estado de pago ha sido actualizado correctamente.",
      })

      // Cerrar diálogo y recargar datos
      setIsPaymentDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error al confirmar pago:", error)
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleExportPayslip = async (payroll: Payroll) => {
    try {
      // Obtener datos del empleado
      const employee = employees.find((e) => e.id === payroll.employeeId)

      if (!employee) {
        toast({
          title: "Error",
          description: "No se encontró información del empleado.",
          variant: "destructive",
        })
        return
      }

      // Generar recibo de sueldo
      generatePayslip(payroll, employee)

      toast({
        title: "Recibo generado",
        description: "El recibo de sueldo ha sido generado correctamente.",
      })
    } catch (error) {
      console.error("Error al generar recibo:", error)
      toast({
        title: "Error",
        description: "No se pudo generar el recibo. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handlePayLiquidation = async (liquidation: Liquidation) => {
    try {
      // Marcar liquidación como pagada
      await dbService.updateLiquidation(liquidation.id, { isPaid: true, paymentDate: new Date().toISOString() })

      toast({
        title: "Liquidación pagada",
        description: "La liquidación ha sido marcada como pagada.",
      })

      // Recargar datos
      loadData()
    } catch (error) {
      console.error("Error al pagar liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar el pago de la liquidación. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  // Columnas para la tabla de nóminas pendientes
  const pendingPayrollColumns: ColumnDef<Payroll>[] = [
    {
      accessorKey: "employeeId",
      header: "Empleado",
      cell: ({ row }) => {
        const employee = employees.find((e) => e.id === row.original.employeeId)
        return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
      },
    },
    {
      accessorKey: "period",
      header: "Período",
      cell: ({ row }) => {
        const monthNames = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ]
        return `${monthNames[row.original.month - 1]} ${row.original.year}`
      },
    },
    {
      accessorKey: "bankSalary",
      header: "Sueldo Banco",
      cell: ({ row }) => formatCurrency(row.original.bankSalary),
    },
    {
      accessorKey: "handSalary",
      header: "Sueldo en Mano",
      cell: ({ row }) => formatCurrency(row.original.handSalary),
    },
    {
      accessorKey: "finalHandSalary",
      header: "Sueldo Final en Mano",
      cell: ({ row }) => formatCurrency(row.original.finalHandSalary),
    },
    {
      accessorKey: "totalSalary",
      header: "Total a Pagar",
      cell: ({ row }) => formatCurrency(row.original.totalSalary),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        if (row.original.isPaid) {
          return <StatusBadge status="Pagado" className="bg-green-100 text-green-800" />
        } else if (row.original.handSalaryPaid && !row.original.bankSalaryPaid) {
          return <StatusBadge status="Mano Pagado" className="bg-yellow-100 text-yellow-800" />
        } else if (!row.original.handSalaryPaid && row.original.bankSalaryPaid) {
          return <StatusBadge status="Banco Pagado" className="bg-yellow-100 text-yellow-800" />
        } else {
          return <StatusBadge status="Pendiente" className="bg-red-100 text-red-800" />
        }
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPayroll(row.original)
              setIsHandSalaryPaid(row.original.handSalaryPaid)
              setIsBankSalaryPaid(row.original.bankSalaryPaid)
              setPaymentMethod(row.original.paymentMethod || "efectivo")
              setPaymentReference(row.original.paymentReference || "")
              setIsPaymentDialogOpen(true)
            }}
          >
            <CheckCircle className="mr-1 h-4 w-4" />
            Confirmar Pago
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPayroll(row.original)
              setIsDetailsDialogOpen(true)
            }}
          >
            <FileText className="mr-1 h-4 w-4" />
            Detalles
          </Button>
        </div>
      ),
    },
  ]

  // Columnas para la tabla de liquidaciones
  const liquidationsColumns: ColumnDef<Liquidation>[] = [
    {
      accessorKey: "employeeId",
      header: "Empleado",
      cell: ({ row }) => {
        const employee = employees.find((e) => e.id === row.original.employeeId)
        return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
      },
    },
    {
      accessorKey: "terminationDate",
      header: "Fecha de Egreso",
      cell: ({ row }) => formatDate(row.original.terminationDate),
    },
    {
      accessorKey: "workedDays",
      header: "Días Trabajados",
      cell: ({ row }) => row.original.workedDays,
    },
    {
      accessorKey: "workedMonths",
      header: "Meses Trabajados",
      cell: ({ row }) => row.original.workedMonths,
    },
    {
      accessorKey: "baseSalary",
      header: "Salario Base",
      cell: ({ row }) => formatCurrency(row.original.baseSalary),
    },
    {
      accessorKey: "proportionalVacation",
      header: "Vacaciones Proporcionales",
      cell: ({ row }) => formatCurrency(row.original.proportionalVacation),
    },
    {
      accessorKey: "proportionalBonus",
      header: "Aguinaldo Proporcional",
      cell: ({ row }) => formatCurrency(row.original.proportionalBonus),
    },
    {
      accessorKey: "compensationAmount",
      header: "Indemnización",
      cell: ({ row }) => formatCurrency(row.original.compensationAmount),
    },
    {
      accessorKey: "totalAmount",
      header: "Total a Pagar",
      cell: ({ row }) => formatCurrency(row.original.totalAmount),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        if (row.original.isPaid) {
          return <StatusBadge status="Pagado" className="bg-green-100 text-green-800" />
        } else {
          return <StatusBadge status="Pendiente" className="bg-red-100 text-red-800" />
        }
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {!row.original.isPaid && (
            <Button variant="outline" size="sm" onClick={() => handlePayLiquidation(row.original)}>
              <CheckCircle className="mr-1 h-4 w-4" />
              Confirmar Pago
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Implementar vista de detalles de liquidación
            }}
          >
            <FileText className="mr-1 h-4 w-4" />
            Detalles
          </Button>
        </div>
      ),
    },
  ]

  // Columnas para la tabla de historial de nóminas
  const historyPayrollColumns: ColumnDef<Payroll>[] = [
    {
      accessorKey: "employeeId",
      header: "Empleado",
      cell: ({ row }) => {
        const employee = employees.find((e) => e.id === row.original.employeeId)
        return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
      },
    },
    {
      accessorKey: "period",
      header: "Período",
      cell: ({ row }) => {
        const monthNames = [
          "Enero",
          "Febrero",
          "Marzo",
          "Abril",
          "Mayo",
          "Junio",
          "Julio",
          "Agosto",
          "Septiembre",
          "Octubre",
          "Noviembre",
          "Diciembre",
        ]
        return `${monthNames[row.original.month - 1]} ${row.original.year}`
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Fecha de Pago",
      cell: ({ row }) => formatDate(row.original.paymentDate || ""),
    },
    {
      accessorKey: "bankSalary",
      header: "Sueldo Banco",
      cell: ({ row }) => formatCurrency(row.original.bankSalary),
    },
    {
      accessorKey: "finalHandSalary",
      header: "Sueldo Final en Mano",
      cell: ({ row }) => formatCurrency(row.original.finalHandSalary),
    },
    {
      accessorKey: "totalSalary",
      header: "Total Pagado",
      cell: ({ row }) => formatCurrency(row.original.totalSalary),
    },
    {
      accessorKey: "paymentMethod",
      header: "Método de Pago",
      cell: ({ row }) => {
        const methods: Record<string, string> = {
          efectivo: "Efectivo",
          transferencia: "Transferencia",
          cheque: "Cheque",
          otro: "Otro",
        }
        return methods[row.original.paymentMethod || "efectivo"] || row.original.paymentMethod
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleExportPayslip(row.original)}>
            <Download className="mr-1 h-4 w-4" />
            Recibo
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPayroll(row.original)
              setIsDetailsDialogOpen(true)
            }}
          >
            <FileText className="mr-1 h-4 w-4" />
            Detalles
          </Button>
        </div>
      ),
    },
  ]

  // Generar años para el selector (año actual y 5 años anteriores)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestión de Nómina</h2>
            <p className="text-muted-foreground">Administra los pagos de salarios y liquidaciones</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(Number.parseInt(value))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Seleccionar mes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Enero</SelectItem>
                <SelectItem value="2">Febrero</SelectItem>
                <SelectItem value="3">Marzo</SelectItem>
                <SelectItem value="4">Abril</SelectItem>
                <SelectItem value="5">Mayo</SelectItem>
                <SelectItem value="6">Junio</SelectItem>
                <SelectItem value="7">Julio</SelectItem>
                <SelectItem value="8">Agosto</SelectItem>
                <SelectItem value="9">Septiembre</SelectItem>
                <SelectItem value="10">Octubre</SelectItem>
                <SelectItem value="11">Noviembre</SelectItem>
                <SelectItem value="12">Diciembre</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(Number.parseInt(value))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Seleccionar año" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={handleGeneratePayrolls} disabled={isGeneratingPayrolls}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingPayrolls ? "animate-spin" : ""}`} />
            {isGeneratingPayrolls ? "Generando..." : "Generar Nóminas"}
          </Button>

          {activeTab === "pendientes" && (
            <Button variant={showAllPending ? "default" : "outline"} onClick={handleToggleShowAllPending}>
              <Eye className="mr-2 h-4 w-4" />
              {showAllPending ? "Mostrar solo mes actual" : "Ver todas las pendientes"}
            </Button>
          )}
        </div>

        <Tabs defaultValue="pendientes" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pendientes">Pagos Pendientes</TabsTrigger>
            <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
            <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            <Card>
              <CardHeader>
                <CardTitle>Pagos Pendientes</CardTitle>
                <CardDescription>
                  {showAllPending
                    ? "Mostrando todas las nóminas pendientes de pago"
                    : `Nóminas pendientes de pago para ${selectedMonth}/${selectedYear}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={pendingPayrollColumns}
                  data={filteredPayrolls}
                  searchColumn="employeeId"
                  searchPlaceholder="Buscar empleado..."
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liquidaciones">
            <Card>
              <CardHeader>
                <CardTitle>Liquidaciones Finales</CardTitle>
                <CardDescription>Liquidaciones pendientes por fin de relación laboral</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={liquidationsColumns}
                  data={liquidations}
                  searchColumn="employeeId"
                  searchPlaceholder="Buscar empleado..."
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="historial">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Pagos</CardTitle>
                <CardDescription>Nóminas pagadas para el período seleccionado</CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={historyPayrollColumns}
                  data={historyPayrolls}
                  searchColumn="employeeId"
                  searchPlaceholder="Buscar empleado..."
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo de confirmación de pago */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Pago de Nómina</DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!selectedPayroll) return "Confirme el estado de pago"

                  const employee = employees.find((e) => e.id === selectedPayroll.employeeId)
                  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Empleado"

                  const monthNames = [
                    "Enero",
                    "Febrero",
                    "Marzo",
                    "Abril",
                    "Mayo",
                    "Junio",
                    "Julio",
                    "Agosto",
                    "Septiembre",
                    "Octubre",
                    "Noviembre",
                    "Diciembre",
                  ]

                  return `${employeeName} - ${monthNames[selectedPayroll.month - 1]} ${selectedPayroll.year}`
                })()}
              </DialogDescription>
            </DialogHeader>

            {selectedPayroll && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Sueldo en Banco</h3>
                    <p className="text-lg font-bold">{formatCurrency(selectedPayroll.bankSalary)}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="bankSalaryPaid"
                        checked={isBankSalaryPaid}
                        onCheckedChange={(checked) => setIsBankSalaryPaid(checked === true)}
                      />
                      <Label htmlFor="bankSalaryPaid">Marcar como pagado</Label>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Sueldo en Mano</h3>
                    <p className="text-lg font-bold">{formatCurrency(selectedPayroll.finalHandSalary)}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Checkbox
                        id="handSalaryPaid"
                        checked={isHandSalaryPaid}
                        onCheckedChange={(checked) => setIsHandSalaryPaid(checked === true)}
                      />
                      <Label htmlFor="handSalaryPaid">Marcar como pagado</Label>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Detalles del Pago</h3>

                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentDate">Fecha de Pago</Label>
                        <Input
                          id="paymentDate"
                          type="date"
                          value={paymentDate}
                          onChange={(e) => setPaymentDate(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Método de Pago</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                          <SelectTrigger id="paymentMethod">
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="cheque">Cheque</SelectItem>
                            <SelectItem value="otro">Otro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="paymentReference">Referencia de Pago</Label>
                      <Input
                        id="paymentReference"
                        placeholder="Número de transferencia, cheque, etc."
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handlePaymentConfirmation}>Confirmar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de detalles de nómina */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Detalles de Nómina</DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!selectedPayroll) return "Detalles de la nómina"

                  const employee = employees.find((e) => e.id === selectedPayroll.employeeId)
                  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Empleado"

                  const monthNames = [
                    "Enero",
                    "Febrero",
                    "Marzo",
                    "Abril",
                    "Mayo",
                    "Junio",
                    "Julio",
                    "Agosto",
                    "Septiembre",
                    "Octubre",
                    "Noviembre",
                    "Diciembre",
                  ]

                  return `${employeeName} - ${monthNames[selectedPayroll.month - 1]} ${selectedPayroll.year}`
                })()}
              </DialogDescription>
            </DialogHeader>

            {selectedPayroll && (
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Información del Empleado</h3>
                    {(() => {
                      const employee = employees.find((e) => e.id === selectedPayroll.employeeId)
                      if (!employee) return <p>Información no disponible</p>

                      return (
                        <div className="space-y-1 text-sm">
                          <p>
                            <span className="font-medium">Nombre:</span> {employee.firstName} {employee.lastName}
                          </p>
                          <p>
                            <span className="font-medium">DNI:</span> {employee.documentId}
                          </p>
                          <p>
                            <span className="font-medium">Cargo:</span> {employee.position}
                          </p>
                          <p>
                            <span className="font-medium">Local:</span> {employee.local}
                          </p>
                          <p>
                            <span className="font-medium">Fecha de ingreso:</span> {formatDate(employee.hireDate)}
                          </p>
                        </div>
                      )
                    })()}
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Información de Pago</h3>
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Estado:</span> {selectedPayroll.isPaid ? "Pagado" : "Pendiente"}
                      </p>
                      {selectedPayroll.paymentDate && (
                        <p>
                          <span className="font-medium">Fecha de pago:</span> {formatDate(selectedPayroll.paymentDate)}
                        </p>
                      )}
                      {selectedPayroll.paymentMethod && (
                        <p>
                          <span className="font-medium">Método de pago:</span>{" "}
                          {{
                            efectivo: "Efectivo",
                            transferencia: "Transferencia",
                            cheque: "Cheque",
                            otro: "Otro",
                          }[selectedPayroll.paymentMethod] || selectedPayroll.paymentMethod}
                        </p>
                      )}
                      {selectedPayroll.paymentReference && (
                        <p>
                          <span className="font-medium">Referencia:</span> {selectedPayroll.paymentReference}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium mb-2">Detalle de Salario</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Sueldo Base:</span> {formatCurrency(selectedPayroll.baseSalary)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Sueldo en Banco:</span>{" "}
                        {formatCurrency(selectedPayroll.bankSalary)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Sueldo en Mano Original:</span>{" "}
                        {formatCurrency(selectedPayroll.handSalary)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">Deducciones:</span> {formatCurrency(selectedPayroll.deductions)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Adiciones:</span> {formatCurrency(selectedPayroll.additions)}
                      </p>
                      <p className="text-sm">
                        <span className="font-medium">Sueldo Final en Mano:</span>{" "}
                        {formatCurrency(selectedPayroll.finalHandSalary)}
                      </p>
                      <p className="text-sm font-bold mt-2">
                        <span className="font-medium">TOTAL A PAGAR:</span>{" "}
                        {formatCurrency(selectedPayroll.totalSalary)}
                      </p>
                    </div>
                  </div>
                </div>

                {selectedPayroll.details && selectedPayroll.details.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Conceptos</h3>
                    <div className="border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Concepto
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Tipo
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {selectedPayroll.details.map((detail, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{detail.concept}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {detail.type === "addition" ? "Adición" : "Deducción"}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                {detail.type === "addition"
                                  ? formatCurrency(detail.amount)
                                  : `- ${formatCurrency(detail.amount)}`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2">
                  {selectedPayroll.isPaid && (
                    <Button variant="outline" onClick={() => handleExportPayslip(selectedPayroll)}>
                      <Download className="mr-2 h-4 w-4" />
                      Descargar Recibo
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}





