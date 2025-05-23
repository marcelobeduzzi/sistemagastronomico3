"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DataTable } from "@/components/data-table"
import { dbService } from "@/lib/db-service"
import { formatCurrency, formatDate, generatePayslip } from "@/lib/export-utils"
import { useToast } from "@/components/ui/use-toast"
import {
  Download,
  RefreshCw,
  CheckCircle,
  FileText,
  Calendar,
  Eye,
  ArrowLeft,
  Calculator,
  Loader2,
  PlusCircle,
  DollarSign,
  CreditCard,
  Wallet,
  Filter,
} from "lucide-react"
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
import { Badge } from "@/components/ui/badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { Employee, Payroll, Liquidation, Attendance } from "@/types"
import { supabase } from "@/lib/supabase/client" // Importamos la instancia compartida
import Link from "next/link"
import { payrollService } from "@/lib/payroll-service" // Importamos el servicio de nóminas

export default function NominaPage() {
  const router = useRouter()
  // Ya no creamos una nueva instancia, usamos la compartida
  const [activeTab, setActiveTab] = useState("pendientes")
  const [payrolls, setPayrolls] = useState<Payroll[]>([])
  const [filteredPayrolls, setFilteredPayrolls] = useState<Payroll[]>([])
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [historyPayrolls, setHistoryPayrolls] = useState<Payroll[]>([])
  const [historyLiquidations, setHistoryLiquidations] = useState<Liquidation[]>([])
  const [filteredHistory, setFilteredHistory] = useState<(Payroll | Liquidation)[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [inactiveEmployees, setInactiveEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [isGeneratingPayrolls, setIsGeneratingPayrolls] = useState(false)
  const [isGeneratingLiquidations, setIsGeneratingLiquidations] = useState(false)
  const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null)
  const [selectedLiquidation, setSelectedLiquidation] = useState<Liquidation | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isLiquidationPaymentDialogOpen, setIsLiquidationPaymentDialogOpen] = useState(false)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const [showAllPending, setShowAllPending] = useState(false)
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [isLoadingAttendances, setIsLoadingAttendances] = useState(false)
  const [historyFilter, setHistoryFilter] = useState<"all" | "payroll" | "liquidation">("all")
  const { toast } = useToast()

  // Estados para el diálogo de pago
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [paymentMethod, setPaymentMethod] = useState<string>("efectivo")
  const [paymentReference, setPaymentReference] = useState<string>("")
  const [paymentNotes, setPaymentNotes] = useState<string>("")
  const [isHandSalaryPaid, setIsHandSalaryPaid] = useState(false)
  const [isBankSalaryPaid, setIsBankSalaryPaid] = useState(false)
  const [sessionStatus, setSessionStatus] = useState<"valid" | "invalid" | "checking">("checking")

  // Estados para el bono de presentismo
  const [hasAttendanceBonus, setHasAttendanceBonus] = useState(false)
  const [attendanceBonus, setAttendanceBonus] = useState(50000) // Valor predeterminado del bono
  const [isAttendanceBonusDialogOpen, setIsAttendanceBonusDialogOpen] = useState(false)

  // Nuevos estados para los totales
  const [payrollTotals, setPayrollTotals] = useState({
    totalHand: 0,
    totalBank: 0,
    totalAmount: 0,
  })

  const [liquidationTotals, setLiquidationTotals] = useState({
    totalAmount: 0,
  })

  // Verificar sesión al cargar la página
  useEffect(() => {
    const checkSession = async () => {
      try {
        // Primero verificar si hay un token de diagnóstico
        const diagnosticSession = localStorage.getItem("diagnostic_session")

        if (diagnosticSession === "active") {
          console.log("Sesión de diagnóstico detectada")
          setSessionStatus("valid")
          return
        }

        // Si no hay token de diagnóstico, verificar sesión normal
        const {
          data: { session },
        } = await supabase.auth.getSession()

        // Agregar logs para diagnóstico
        console.log("Estado de sesión:", session ? "Válida" : "Inválida")

        if (session) {
          console.log("Usuario autenticado:", session.user.email)
          console.log("Rol del usuario:", session.user.user_metadata?.role)
        }

        setSessionStatus(session ? "valid" : "invalid")
      } catch (error) {
        console.error("Error al verificar sesión:", error)
        setSessionStatus("invalid")
      }
    }

    checkSession()
  }, [])

  useEffect(() => {
    if (sessionStatus === "valid") {
      loadData()
    }
  }, [selectedMonth, selectedYear, activeTab, showAllPending, sessionStatus, historyFilter])

  // Función para calcular los totales de nóminas
  useEffect(() => {
  if (filteredPayrolls.length > 0) {
    const totals = filteredPayrolls.reduce(
      (acc, payroll) => {
        // Asegurarse de usar los campos correctos con fallbacks
        const finalHandSalary = payroll.finalHandSalary || payroll.final_hand_salary || 0
        const bankSalary = payroll.bankSalary || payroll.bank_salary || 0
        const totalSalary = payroll.totalSalary || payroll.total_salary || 0

        return {
          totalHand: acc.totalHand + finalHandSalary,
          totalBank: acc.totalBank + bankSalary,
          totalAmount: acc.totalAmount + totalSalary,
        }
      },
      { totalHand: 0, totalBank: 0, totalAmount: 0 },
    )

    setPayrollTotals(totals)
  } else {
    setPayrollTotals({ totalHand: 0, totalBank: 0, totalAmount: 0 })
  }
}, [filteredPayrolls])

  // Función para calcular los totales de liquidaciones
  useEffect(() => {
    if (liquidations.length > 0) {
      const total = liquidations.reduce((acc, liquidation) => {
        return acc + (liquidation.totalAmount || 0)
      }, 0)

      setLiquidationTotals({ totalAmount: total })
    } else {
      setLiquidationTotals({ totalAmount: 0 })
    }
  }, [liquidations])

  // Función para preservar la sesión al navegar a otras páginas
  const preserveSession = () => {
    // Almacenar un token temporal en localStorage
    localStorage.setItem("nomina_session", "active")
  }

  const loadData = async () => {
    setIsLoading(true)
    try {
      // Cargar empleados
      const employeesData = await dbService.getEmployees()
      const activeEmployees = employeesData.filter((emp) => emp.status === "active")
      const inactiveEmps = employeesData.filter((emp) => emp.status === "inactive" && emp.terminationDate)

      setEmployees(activeEmployees)
      setInactiveEmployees(inactiveEmps)

      // Cargar nóminas según la pestaña activa
      if (activeTab === "pendientes" || activeTab === "liquidaciones") {
        // Cargar todas las nóminas pendientes
        // Cargar todas las nóminas pendientes
const payrollsData = await dbService.getPayrollsByPeriod(selectedMonth, selectedYear, false)

// Corregir el mapeo de datos para asegurar que los valores sean correctos
const correctedPayrolls = payrollsData.map(payroll => {
  console.log('Datos originales de nómina:', payroll)
  
  // Asegurar que usamos los campos correctos
  const finalHandSalary = payroll.final_hand_salary || payroll.finalHandSalary || 0
  const bankSalary = payroll.bank_salary || payroll.bankSalary || 0
  const totalSalary = payroll.total_salary || payroll.totalSalary || (finalHandSalary + bankSalary)
  
  const corrected = {
    ...payroll,
    finalHandSalary: finalHandSalary,
    bankSalary: bankSalary,
    totalSalary: totalSalary
  }
  
  console.log('Datos corregidos de nómina:', corrected)
  return corrected
})

setPayrolls(correctedPayrolls)

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

        // Cargar historial de liquidaciones pagadas
        const liquidationsHistoryData = await dbService.getLiquidations(true)
        setHistoryLiquidations(liquidationsHistoryData)

        // Aplicar filtro al historial
        let filteredData: (Payroll | Liquidation)[] = []

        if (historyFilter === "all") {
          // Combinar ambos tipos y ordenar por fecha de pago
          filteredData = [...historyData, ...liquidationsHistoryData].sort((a, b) => {
            const dateA = new Date(a.paymentDate || "")
            const dateB = new Date(b.paymentDate || "")
            return dateB.getTime() - dateA.getTime() // Orden descendente
          })
        } else if (historyFilter === "payroll") {
          filteredData = historyData
        } else if (historyFilter === "liquidation") {
          filteredData = liquidationsHistoryData
        }

        setFilteredHistory(filteredData)
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

      // Obtener IDs de empleados activos
      const employeeIds = employees.map((emp) => emp.id)

      // Usar el servicio de nóminas para generar las nóminas
      await payrollService.generatePayrolls(employeeIds, selectedMonth, selectedYear)

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

  // Manejar generación de liquidaciones
  const handleGenerateLiquidations = async () => {
    if (inactiveEmployees.length === 0) {
      toast({
        title: "Información",
        description: "No hay empleados inactivos con fecha de egreso para generar liquidaciones.",
      })
      return
    }

    try {
      setIsGeneratingLiquidations(true)

      // Generar liquidaciones para empleados inactivos
      const result = await dbService.generateLiquidations(inactiveEmployees)

      // Actualizar la lista de liquidaciones
      const updatedLiquidations = await dbService.getLiquidations(false)
      setLiquidations(updatedLiquidations)

      toast({
        title: "Éxito",
        description: `Se generaron ${result.generated} liquidaciones nuevas, se actualizaron ${result.updated} existentes y se omitieron ${result.skipped}.`,
      })

      // Cambiar a la pestaña de liquidaciones
      setActiveTab("liquidaciones")
    } catch (error) {
      console.error("Error al generar liquidaciones:", error)
      toast({
        title: "Error",
        description: "No se pudieron generar las liquidaciones. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLiquidations(false)
    }
  }

  const handleToggleShowAllPending = () => {
    setShowAllPending(!showAllPending)
  }

  const handlePaymentConfirmation = async () => {
    if (!selectedPayroll) return

    try {
      // Actualizar el estado de pago de la nómina usando el servicio de nóminas
      if (isHandSalaryPaid) {
        await payrollService.updatePayrollStatus(selectedPayroll.id, "is_paid_hand", true)
      }

      if (isBankSalaryPaid) {
        await payrollService.updatePayrollStatus(selectedPayroll.id, "is_paid_bank", true)
      }

      if (isHandSalaryPaid && isBankSalaryPaid) {
        await payrollService.updatePayrollStatus(selectedPayroll.id, "is_paid", true)
        await payrollService.updatePaymentDetails(selectedPayroll.id, paymentMethod, paymentReference)
      }

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

  // Manejar confirmación de pago de liquidación
  const handleLiquidationPaymentConfirmation = async () => {
    if (!selectedLiquidation) return

    try {
      // Actualizar el estado de pago de la liquidación
      const updatedLiquidation = {
        ...selectedLiquidation,
        isPaid: true,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod,
        paymentReference: paymentReference,
        notes: paymentNotes,
      }

      await dbService.updateLiquidation(updatedLiquidation)

      toast({
        title: "Pago confirmado",
        description: "La liquidación ha sido marcada como pagada correctamente.",
      })

      // Cerrar diálogo y recargar datos
      setIsLiquidationPaymentDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error al confirmar pago de liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago. Intente nuevamente.",
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
      // Redirigir a la página de detalles de liquidación para registrar el pago
      router.push(`/nomina/liquidations/${liquidation.id}`)
    } catch (error) {
      console.error("Error al navegar a la página de liquidación:", error)
      toast({
        title: "Error",
        description: "No se pudo abrir la página de liquidación. Intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  // Función para cargar las asistencias del empleado para el período de la nómina
  const loadAttendancesForPayroll = async (payroll: Payroll) => {
    if (!payroll) return

    setIsLoadingAttendances(true)
    setAttendances([])

    try {
      // Calcular el rango de fechas para el mes de la nómina
      const startDate = new Date(payroll.year, payroll.month - 1, 1)
      const endDate = new Date(payroll.year, payroll.month, 0)

      // Formatear fechas para la API
      const startDateStr = startDate.toISOString().split("T")[0]
      const endDateStr = endDate.toISOString().split("T")[0]

      // Cargar asistencias
      const attendanceData = await dbService.getAttendancesByDateRange(payroll.employeeId, startDateStr, endDateStr)

      setAttendances(attendanceData)
    } catch (error) {
      console.error("Error al cargar asistencias:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las asistencias del empleado.",
        variant: "destructive",
      })
    } finally {
      setIsLoadingAttendances(false)
    }
  }

  // Función para abrir el diálogo de detalles y cargar asistencias
  const handleOpenDetailsDialog = async (payroll: Payroll) => {
    setSelectedPayroll(payroll)
    setHasAttendanceBonus(payroll.hasAttendanceBonus || false)
    setAttendanceBonus(payroll.attendanceBonus || 50000)
    setIsDetailsDialogOpen(true)
    await loadAttendancesForPayroll(payroll)
  }

  // Función para abrir el diálogo de bono de presentismo
  const handleOpenAttendanceBonusDialog = (payroll: Payroll) => {
    setSelectedPayroll(payroll)
    setHasAttendanceBonus(payroll.hasAttendanceBonus || false)
    setAttendanceBonus(payroll.attendanceBonus || 50000)
    setIsAttendanceBonusDialogOpen(true)
  }

  // Función para actualizar el bono de presentismo
  const handleUpdateBonus = async () => {
    if (!selectedPayroll) return

    try {
      // Calcular el nuevo total con o sin bono
      const bonusAmount = hasAttendanceBonus ? attendanceBonus : 0

      // Calcular el nuevo total incluyendo el bono
      const newTotal =
        selectedPayroll.baseSalary + selectedPayroll.bankSalary + selectedPayroll.handSalary + bonusAmount

      // Asegurarse de que todos los campos necesarios estén incluidos en la actualización
      const updateData = {
        hasAttendanceBonus,
        attendanceBonus: bonusAmount,
        totalSalary: newTotal,
      }

      console.log("Enviando actualización de bono:", updateData)
      await dbService.updatePayroll(selectedPayroll.id, updateData)

      toast({
        title: "Bono actualizado",
        description: hasAttendanceBonus
          ? `Se ha aplicado el bono de presentismo de ${formatCurrency(attendanceBonus)}`
          : "Se ha removido el bono de presentismo",
      })

      setIsAttendanceBonusDialogOpen(false)
      loadData()
    } catch (error) {
      console.error("Error al actualizar bono:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar el bono. Intente nuevamente.",
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
      accessorKey: "attendanceBonus",
      header: "Bono Presentismo",
      cell: ({ row }) => {
        if (row.original.hasAttendanceBonus) {
          return <span className="text-green-600">+{formatCurrency(row.original.attendanceBonus || 0)}</span>
        }
        return "-"
      },
    },
    {
  accessorKey: "totalSalary",
  header: "Total a Pagar",
  cell: ({ row }) => {
    // Asegurarse de usar el valor correcto para el total
    // Debe ser la suma de final_hand_salary + bank_salary
    const totalSalary = row.original.totalSalary || row.original.total_salary || 0
    return formatCurrency(totalSalary)
  },
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

          <Button variant="outline" size="sm" onClick={() => handleOpenDetailsDialog(row.original)}>
            <FileText className="mr-1 h-4 w-4" />
            Detalles
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleOpenAttendanceBonusDialog(row.original)}>
            <PlusCircle className="mr-1 h-4 w-4" />
            Bono
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
        const employee = [...employees, ...inactiveEmployees].find((e) => e.id === row.original.employeeId)
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
      accessorKey: "proportionalVacation",
      header: "Vacaciones Prop.",
      cell: ({ row }) => (
        <div className="flex items-center">
          {formatCurrency(row.original.proportionalVacation)}
          {!row.original.isPaid && (
            <Checkbox
              className="ml-2"
              checked={row.original.includeVacation}
              onCheckedChange={(checked) => {
                const updatedLiquidation = {
                  ...row.original,
                  includeVacation: checked === true,
                  totalAmount: calculateTotalAmount(row.original, {
                    includeVacation: checked === true,
                    includeBonus: row.original.includeBonus,
                  }),
                }
                dbService
                  .updateLiquidation(updatedLiquidation)
                  .then(() => loadData())
                  .catch((error) => {
                    console.error("Error al actualizar liquidación:", error)
                    toast({
                      title: "Error",
                      description: "No se pudo actualizar la liquidación",
                      variant: "destructive",
                    })
                  })
              }}
            />
          )}
        </div>
      ),
    },
    {
      accessorKey: "proportionalBonus",
      header: "Aguinaldo Prop.",
      cell: ({ row }) => (
        <div className="flex items-center">
          {formatCurrency(row.original.proportionalBonus)}
          {!row.original.isPaid && (
            <Checkbox
              className="ml-2"
              checked={row.original.includeBonus}
              onCheckedChange={(checked) => {
                const updatedLiquidation = {
                  ...row.original,
                  includeBonus: checked === true,
                  totalAmount: calculateTotalAmount(row.original, {
                    includeVacation: row.original.includeVacation,
                    includeBonus: checked === true,
                  }),
                }
                dbService
                  .updateLiquidation(updatedLiquidation)
                  .then(() => loadData())
                  .catch((error) => {
                    console.error("Error al actualizar liquidación:", error)
                    toast({
                      title: "Error",
                      description: "No se pudo actualizar la liquidación",
                      variant: "destructive",
                    })
                  })
              }}
            />
          )}
        </div>
      ),
    },
    {
      accessorKey: "compensationAmount",
      header: "Pago Último Mes",
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
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedLiquidation(row.original)
                  setPaymentDate(new Date().toISOString().split("T")[0])
                  setPaymentMethod("transferencia")
                  setPaymentReference("")
                  setPaymentNotes("")
                  setIsLiquidationPaymentDialogOpen(true)
                }}
              >
                <CheckCircle className="mr-1 h-4 w-4" />
                Confirmar Pago
              </Button>
              <Button variant="outline" size="sm" onClick={() => handlePayLiquidation(row.original)}>
                <FileText className="mr-1 h-4 w-4" />
                Ver Detalles
              </Button>
            </>
          )}
          {row.original.isPaid && (
            <Button variant="outline" size="sm" onClick={() => router.push(`/nomina/liquidations/${row.original.id}`)}>
              <Eye className="mr-1 h-4 w-4" />
              Ver
            </Button>
          )}
        </div>
      ),
    },
  ]

  // Función para calcular el monto total de la liquidación
  const calculateTotalAmount = (
    liquidation: Liquidation,
    options: { includeVacation?: boolean; includeBonus?: boolean },
  ): number => {
    let total = 0

    // Calcular el pago por días del último mes
    const dailySalary = liquidation.baseSalary / 30
    const lastMonthPayment = dailySalary * (liquidation.daysToPayInLastMonth || 0)
    total += lastMonthPayment

    // Agregar vacaciones proporcionales si se incluyen
    if (options.includeVacation) {
      total += liquidation.proportionalVacation
    }

    // Agregar aguinaldo proporcional si se incluye
    if (options.includeBonus) {
      total += liquidation.proportionalBonus
    }

    // Siempre agregar indemnización
    total += liquidation.compensationAmount

    return total
  }

  // Columnas para la tabla de historial de pagos (nóminas y liquidaciones)
  const historyColumns: ColumnDef<Payroll | Liquidation>[] = [
    {
      accessorKey: "type",
      header: "Tipo",
      cell: ({ row }) => {
        // Determinar si es nómina o liquidación
        const isLiquidation = "terminationDate" in row.original
        return (
          <Badge className={isLiquidation ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}>
            {isLiquidation ? "Liquidación" : "Nómina"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "employeeId",
      header: "Empleado",
      cell: ({ row }) => {
        const allEmployees = [...employees, ...inactiveEmployees]
        const employee = allEmployees.find((e) => e.id === row.original.employeeId)
        return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
      },
    },
    {
      accessorKey: "period",
      header: "Período",
      cell: ({ row }) => {
        // Si es nómina, mostrar mes/año
        if ("month" in row.original) {
          const payroll = row.original as Payroll
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
          return `${monthNames[payroll.month - 1]} ${payroll.year}`
        }
        // Si es liquidación, mostrar fecha de egreso
        else if ("terminationDate" in row.original) {
          const liquidation = row.original as Liquidation
          return `Egreso: ${formatDate(liquidation.terminationDate)}`
        }
        return "-"
      },
    },
    {
      accessorKey: "paymentDate",
      header: "Fecha de Pago",
      cell: ({ row }) => formatDate(row.original.paymentDate || ""),
    },
    {
      accessorKey: "amount",
      header: "Monto Total",
      cell: ({ row }) => {
        if ("totalSalary" in row.original) {
          return formatCurrency(row.original.totalSalary)
        } else if ("totalAmount" in row.original) {
          return formatCurrency(row.original.totalAmount)
        }
        return "-"
      },
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
      cell: ({ row }) => {
        // Si es nómina
        if ("month" in row.original) {
          const payroll = row.original as Payroll
          return (
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleExportPayslip(payroll)}>
                <Download className="mr-1 h-4 w-4" />
                Recibo
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleOpenDetailsDialog(payroll)}>
                <FileText className="mr-1 h-4 w-4" />
                Detalles
              </Button>
            </div>
          )
        }
        // Si es liquidación
        else if ("terminationDate" in row.original) {
          const liquidation = row.original as Liquidation
          return (
            <Button variant="outline" size="sm" onClick={() => router.push(`/nomina/liquidations/${liquidation.id}`)}>
              <Eye className="mr-1 h-4 w-4" />
              Ver Liquidación
            </Button>
          )
        }
        return null
      },
    },
  ]

  // Generar años para el selector (año actual y 5 años anteriores)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i)

  // Si no hay sesión válida, mostrar mensaje
  if (sessionStatus === "invalid") {
    return (
      <DashboardLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <Card className="border-red-200 bg-red-50">
            <CardHeader className="pb-2">
              <CardTitle className="text-red-700">Sesión no válida</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-700">
                No se ha detectado una sesión válida. Por favor inicie sesión para continuar.
              </p>
              <div className="mt-4">
                <Button asChild>
                  <Link href="/login">Iniciar Sesión</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  // Si está verificando la sesión, mostrar cargando
  if (sessionStatus === "checking") {
    return (
      <DashboardLayout>
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
            <span className="ml-2">Verificando sesión...</span>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Gestión de Nómina</h2>
            <p className="text-muted-foreground">Administra los pagos de salarios y liquidaciones</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" asChild onClick={preserveSession}>
              <Link href="/diagnostico">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver a Diagnóstico
              </Link>
            </Button>
            <Button variant="outline" asChild onClick={preserveSession}>
              <Link href="/nomina/liquidations/migration">
                <PlusCircle className="mr-2 h-4 w-4" />
                Herramientas
              </Link>
            </Button>
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

          <Button
  variant="outline"
  onClick={async () => {
    try {
      setIsGeneratingPayrolls(true)
      // Obtener IDs de empleados activos
      const employeeIds = employees.map((emp) => emp.id)

      console.log("=== INICIO DE REGENERACIÓN DE NÓMINAS ===")
      console.log(`Regenerando nóminas para ${selectedMonth}/${selectedYear}`)
      console.log(`Empleados seleccionados: ${employeeIds.length}`)

      // Usar el servicio de nóminas para regenerar las nóminas
      await payrollService.forceRegeneratePayrolls(employeeIds, selectedMonth, selectedYear)

      console.log("=== FIN DE REGENERACIÓN DE NÓMINAS ===")

      toast({
        title: "Nóminas regeneradas",
        description: "Las nóminas han sido regeneradas correctamente. Revisa la consola para ver detalles.",
      })

      // Recargar datos
      loadData()
    } catch (error) {
      console.error("Error al regenerar nóminas:", error)
      toast({
        title: "Error",
        description: "No se pudieron regenerar las nóminas. Intente nuevamente.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingPayrolls(false)
    }
  }}
  disabled={isGeneratingPayrolls}
>
  <RefreshCw className={`mr-2 h-4 w-4 ${isGeneratingPayrolls ? "animate-spin" : ""}`} />
  {isGeneratingPayrolls ? "Regenerando..." : "Regenerar Nóminas (Debug)"}
</Button>

          {activeTab === "liquidaciones" && (
            <>
              <Button
                variant="outline"
                onClick={handleGenerateLiquidations}
                disabled={isGeneratingLiquidations || inactiveEmployees.length === 0}
              >
                {isGeneratingLiquidations ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="mr-2 h-4 w-4" />
                )}
                Generar Liquidaciones
              </Button>

              <Button variant="outline" onClick={() => router.push("/nomina/liquidations/create")}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Liquidación
              </Button>
            </>
          )}

          {activeTab === "pendientes" && (
            <Button variant={showAllPending ? "default" : "outline"} onClick={handleToggleShowAllPending}>
              <Eye className="mr-2 h-4 w-4" />
              {showAllPending ? "Mostrar solo mes actual" : "Ver todas las pendientes"}
            </Button>
          )}

          {activeTab === "historial" && (
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select
                value={historyFilter}
                onValueChange={(value: "all" | "payroll" | "liquidation") => setHistoryFilter(value)}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los pagos</SelectItem>
                  <SelectItem value="payroll">Solo nóminas</SelectItem>
                  <SelectItem value="liquidation">Solo liquidaciones</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <Tabs defaultValue="pendientes" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="pendientes">Pagos Pendientes</TabsTrigger>
            <TabsTrigger value="liquidaciones">Liquidaciones</TabsTrigger>
            <TabsTrigger value="historial">Historial de Pagos</TabsTrigger>
          </TabsList>

          <TabsContent value="pendientes">
            {/* Totalizador de nóminas pendientes */}
            {filteredPayrolls.length > 0 && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Resumen de Pagos Pendientes</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-blue-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Wallet className="h-5 w-5 text-blue-600" />
                          <span className="ml-2 font-medium">Total a Pagar en Mano</span>
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(payrollTotals.totalHand)}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-green-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <CreditCard className="h-5 w-5 text-green-600" />
                          <span className="ml-2 font-medium">Total a Pagar en Banco</span>
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(payrollTotals.totalBank)}</span>
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                          <span className="ml-2 font-medium">Total a Pagar</span>
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(payrollTotals.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
            {/* Totalizador de liquidaciones */}
            {liquidations.length > 0 && (
              <Card className="mb-6">
                <CardContent className="pt-6">
                  <h3 className="text-lg font-medium mb-4">Resumen de Liquidaciones Pendientes</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-lg bg-purple-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <DollarSign className="h-5 w-5 text-purple-600" />
                          <span className="ml-2 font-medium">Total a Pagar por Liquidaciones</span>
                        </div>
                        <span className="text-lg font-bold">{formatCurrency(liquidationTotals.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                <CardDescription>
                  {historyFilter === "all"
                    ? "Todos los pagos realizados (nóminas y liquidaciones)"
                    : historyFilter === "payroll"
                      ? "Nóminas mensuales pagadas"
                      : "Liquidaciones finales pagadas"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable
                  columns={historyColumns}
                  data={filteredHistory}
                  searchColumn="employeeId"
                  searchPlaceholder="Buscar empleado..."
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Diálogo de confirmación de pago de nómina */}
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

        {/* Diálogo de confirmación de pago de liquidación */}
        <Dialog open={isLiquidationPaymentDialogOpen} onOpenChange={setIsLiquidationPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmar Pago de Liquidación</DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!selectedLiquidation) return "Confirme el pago de la liquidación"

                  const employee = [...employees, ...inactiveEmployees].find(
                    (e) => e.id === selectedLiquidation.employeeId,
                  )
                  const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Empleado"

                  return `${employeeName} - Liquidación Final`
                })()}
              </DialogDescription>
            </DialogHeader>

            {selectedLiquidation && (
              <div className="grid gap-4 py-4">
                <div className="border-b pb-4">
                  <h3 className="font-medium mb-2">Detalles de la Liquidación</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Fecha de Egreso</p>
                      <p>{formatDate(selectedLiquidation.terminationDate)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Monto Total</p>
                      <p className="text-lg font-bold">{formatCurrency(selectedLiquidation.totalAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium mb-2">Detalles del Pago</h3>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="liquidationPaymentDate">Fecha de Pago</Label>
                      <Input
                        id="liquidationPaymentDate"
                        type="date"
                        value={paymentDate}
                        onChange={(e) => setPaymentDate(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="liquidationPaymentMethod">Método de Pago</Label>
                      <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                        <SelectTrigger id="liquidationPaymentMethod">
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
                    <Label htmlFor="liquidationPaymentReference">Referencia de Pago</Label>
                    <Input
                      id="liquidationPaymentReference"
                      placeholder="Número de transferencia, cheque, etc."
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="liquidationPaymentNotes">Notas</Label>
                    <Input
                      id="liquidationPaymentNotes"
                      placeholder="Observaciones adicionales"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsLiquidationPaymentDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleLiquidationPaymentConfirmation}>Confirmar Pago</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de detalles de nómina */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalles de Nómina</DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!selectedPayroll) return "Detalles de la nómina"

                  const employee = employees.find((e) => e.id === selectedPayroll.employeeId)
                  return employee ? `${employee.firstName} ${employee.lastName}` : "Empleado"
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
                      {selectedPayroll.hasAttendanceBonus && (
                        <p>
                          <span className="font-medium">Bono de Presentismo:</span>{" "}
                          {formatCurrency(selectedPayroll.attendanceBonus || 0)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Resultados del Cálculo */}
                <Card className="bg-blue-50 border-blue-200">
                  <CardHeader className="bg-blue-100">
                    <CardTitle>
                      Resultados del Cálculo para {(() => {
                        const employee = employees.find((e) => e.id === selectedPayroll.employeeId)
                        return employee ? `${employee.firstName} ${employee.lastName}` : "Empleado"
                      })()}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div>
                        <h3 className="font-medium mb-4 text-blue-800">Valores Base</h3>
                        <div className="space-y-3">
                          <p>
                            <span className="font-medium">Sueldo Base:</span>
                            <br />
                            {formatCurrency(selectedPayroll.baseSalary)}
                          </p>
                          <p>
                            <span className="font-medium">Sueldo en Banco:</span>
                            <br />
                            {formatCurrency(selectedPayroll.bankSalary)}
                          </p>
                          <p>
                            <span className="font-medium">Sueldo en Mano Original:</span>
                            <br />
                            {formatCurrency(selectedPayroll.handSalary)}
                          </p>
                          <p>
                            <span className="font-medium">Valor del Minuto:</span>
                            <br />
                            {formatCurrency(
                              (() => {
                                const totalSalary =
                                  selectedPayroll.bankSalary > selectedPayroll.baseSalary
                                    ? selectedPayroll.bankSalary + selectedPayroll.baseSalary
                                    : selectedPayroll.baseSalary
                                return totalSalary / (30 * 8 * 60)
                              })(),
                            )}
                          </p>
                        </div>

                        <h3 className="font-medium mb-4 mt-6 text-blue-800">Ajustes</h3>
                        <div className="space-y-3">
                          <p>
                            <span className="font-medium">Total Deducciones:</span>
                            <br />
                            <span className="text-red-600">-{formatCurrency(selectedPayroll.deductions)}</span>
                          </p>
                          <p>
                            <span className="font-medium">Total Adiciones:</span>
                            <br />
                            <span className="text-green-600">+{formatCurrency(selectedPayroll.additions)}</span>
                          </p>
                          {selectedPayroll.hasAttendanceBonus && (
                            <p>
                              <span className="font-medium">Bono de Presentismo:</span>
                              <br />
                              <span className="text-green-600">
                                +{formatCurrency(selectedPayroll.attendanceBonus || 0)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <h3 className="font-medium mb-4 text-blue-800">Resultados Finales</h3>
                        <div className="space-y-3">
                          <p>
                            <span className="font-medium">Sueldo Final en Mano:</span>
                            <br />
                            <span className="text-lg font-bold">{formatCurrency(selectedPayroll.finalHandSalary)}</span>
                          </p>
                          <p>
                            <span className="font-medium">Total a Pagar:</span>
                            <br />
                            <span className="text-lg font-bold">{formatCurrency(selectedPayroll.totalSalary)}</span>
                          </p>
                        </div>

                        {attendances.length > 0 && (
                          <div className="mt-6 p-4 bg-white rounded-md border border-blue-200">
                            <h4 className="font-medium text-blue-800 mb-2">Detalles de Cálculo</h4>
                            <ul className="space-y-2 text-sm">
                              {attendances.filter((a) => a.isAbsent && !a.isJustified).length > 0 && (
                                <li>
                                  <span className="font-medium">Ausencias Injustificadas:</span>{" "}
                                  {attendances.filter((a) => a.isAbsent && !a.isJustified).length} días
                                </li>
                              )}

                              {attendances.filter((a) => a.lateMinutes > 0).length > 0 && (
                                <li>
                                  <span className="font-medium">Llegadas Tarde:</span>{" "}
                                  {attendances.filter((a) => a.lateMinutes > 0).length} días, total{" "}
                                  {attendances.reduce((sum, a) => sum + (a.lateMinutes || 0), 0)} minutos
                                </li>
                              )}

                              {attendances.filter((a) => a.earlyDepartureMinutes > 0).length > 0 && (
                                <li>
                                  <span className="font-medium">Salidas Anticipadas:</span>{" "}
                                  {attendances.filter((a) => a.earlyDepartureMinutes > 0).length} días, total{" "}
                                  {attendances.reduce((sum, a) => sum + (a.earlyDepartureMinutes || 0), 0)} minutos
                                </li>
                              )}

                              {attendances.filter((a) => a.extraMinutes > 0).length > 0 && (
                                <li>
                                  <span className="font-medium">Horas Extra:</span>{" "}
                                  {attendances.filter((a) => a.extraMinutes > 0).length} días, total{" "}
                                  {attendances.reduce((sum, a) => sum + (a.extraMinutes || 0), 0)} minutos
                                </li>
                              )}

                              {attendances.filter((a) => a.isHoliday && !a.isAbsent).length > 0 && (
                                <li>
                                  <span className="font-medium">Días Feriados Trabajados:</span>{" "}
                                  {attendances.filter((a) => a.isHoliday && !a.isAbsent).length} días
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Tabla de asistencias */}
                {attendances.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2">Asistencias en el Período</h3>
                    <div className="border rounded-md">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Fecha
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Entrada
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Salida
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Min. Tarde
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Min. Salida Ant.
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Min. Extra
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Balance Min.
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Estado
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {attendances.map((attendance) => (
                            <tr key={attendance.id}>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(attendance.date)}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{attendance.checkIn || "-"}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{attendance.checkOut || "-"}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{attendance.lateMinutes || 0}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {attendance.earlyDepartureMinutes || 0}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">{attendance.extraMinutes || 0}</td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {attendance.totalMinutesBalance || 0}
                              </td>
                              <td className="px-4 py-2 whitespace-nowrap text-sm">
                                {attendance.isAbsent
                                  ? attendance.isJustified
                                    ? "Ausente Justificado"
                                    : "Ausente Injustificado"
                                  : attendance.isHoliday
                                    ? "Feriado"
                                    : "Normal"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {isLoadingAttendances && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700"></div>
                    <span className="ml-2">Cargando asistencias...</span>
                  </div>
                )}

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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Descripción
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
                                <span
                                  className={
                                    detail.type === "addition"
                                      ? "text-green-600 font-medium"
                                      : "text-red-600 font-medium"
                                  }
                                >
                                  {detail.type === "addition" ? "+" : "-"}
                                  {formatCurrency(detail.amount)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{detail.description || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsDialogOpen(false)}>
                Cerrar
              </Button>
              {selectedPayroll && !selectedPayroll.isPaid && (
                <Button
                  onClick={() => {
                    setSelectedPayroll(selectedPayroll)
                    setIsHandSalaryPaid(selectedPayroll.handSalaryPaid)
                    setIsBankSalaryPaid(selectedPayroll.bankSalaryPaid)
                    setPaymentMethod(selectedPayroll.paymentMethod || "efectivo")
                    setPaymentReference(selectedPayroll.paymentReference || "")
                    setIsDetailsDialogOpen(false)
                    setIsPaymentDialogOpen(true)
                  }}
                >
                  <CheckCircle className="mr-1 h-4 w-4" />
                  Confirmar Pago
                </Button>
              )}
              {selectedPayroll && (
                <Button variant="outline" onClick={() => handleExportPayslip(selectedPayroll)}>
                  <Download className="mr-1 h-4 w-4" />
                  Generar Recibo
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Diálogo de bono de presentismo */}
        <Dialog open={isAttendanceBonusDialogOpen} onOpenChange={setIsAttendanceBonusDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Bono de Presentismo</DialogTitle>
              <DialogDescription>
                {(() => {
                  if (!selectedPayroll) return "Configurar bono de presentismo"

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
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasAttendanceBonus"
                    checked={hasAttendanceBonus}
                    onCheckedChange={(checked) => setHasAttendanceBonus(checked === true)}
                    disabled={selectedPayroll.isPaid}
                  />
                  <Label htmlFor="hasAttendanceBonus" className="font-medium">
                    Aplicar Bono de Presentismo
                  </Label>
                </div>

                {hasAttendanceBonus && (
                  <div className="space-y-2">
                    <Label htmlFor="attendanceBonus">Monto del Bono</Label>
                    <Input
                      id="attendanceBonus"
                      type="number"
                      value={attendanceBonus}
                      onChange={(e) => setAttendanceBonus(Number(e.target.value) || 0)}
                      disabled={selectedPayroll.isPaid}
                    />
                  </div>
                )}

                {selectedPayroll.hasAttendanceBonus && (
                  <div className="mt-2 text-sm">
                    <p>Bono actual: {formatCurrency(selectedPayroll.attendanceBonus || 0)}</p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAttendanceBonusDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleUpdateBonus} disabled={selectedPayroll?.isPaid}>
                Actualizar Bono
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
