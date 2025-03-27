"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import { dbService } from "@/lib/db-service"
import { exportToCSV, formatDate } from "@/lib/export-utils"
import type { Attendance, Employee } from "@/types"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Plus, Calendar, Edit, FileText } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { SimpleDatePicker } from "@/components/simple-date-picker"
import { StatusBadge } from "@/components/status-badge"
import { useToast } from "@/components/ui/use-toast"

export default function AsistenciasPage() {
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    // Crear una fecha con la hora fija a mediodía para evitar problemas de zona horaria
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0)
  })
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null)
  const { toast } = useToast()

  // Estado para el formulario de nueva asistencia
  const [newAttendance, setNewAttendance] = useState<Omit<Attendance, "id">>({
    employeeId: "",
    date: new Date().toISOString().split("T")[0],
    checkIn: "",
    checkOut: "",
    expectedCheckIn: "",
    expectedCheckOut: "",
    lateMinutes: 0,
    earlyDepartureMinutes: 0,
    isHoliday: false,
    isAbsent: false,
    isJustified: false,
    notes: "",
  })

  // Estado para el formulario de edición de asistencia
  const [editAttendance, setEditAttendance] = useState<Attendance | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        // Obtener empleados
        const employeeData = await dbService.getEmployees()
        setEmployees(employeeData)

        // Obtener asistencias
        // Importante: Asegurarnos de que la fecha se formatea correctamente
        const formattedDate = selectedDate.toISOString().split("T")[0]
        console.log("Fecha formateada para consulta:", formattedDate)

        const attendanceData = await dbService.getAttendances({
          date: formattedDate,
          ...(selectedEmployee ? { employeeId: selectedEmployee } : {}),
        })
        setAttendances(attendanceData)
      } catch (error) {
        console.error("Error al cargar datos de asistencias:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedDate, selectedEmployee])

  // Función para manejar el cambio de fecha
  const handleDateChange = (date: Date) => {
    // Crear una copia de la fecha para evitar referencias
    const newDate = new Date(date)

    // Imprimir información de depuración
    console.log("Fecha seleccionada (local):", newDate.toLocaleString())
    console.log("Día:", newDate.getDate())
    console.log("Mes:", newDate.getMonth() + 1)
    console.log("Año:", newDate.getFullYear())

    // Actualizar el estado con la nueva fecha
    setSelectedDate(newDate)
  }

  const handleExportCSV = () => {
    // Preparar datos para exportar
    const data = attendances.map((attendance) => {
      const employee = employees.find((e) => e.id === attendance.employeeId)
      return {
        Empleado: employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido",
        Fecha: formatDate(attendance.date),
        "Hora Entrada": attendance.checkIn,
        "Hora Salida": attendance.checkOut,
        "Hora Entrada Esperada": attendance.expectedCheckIn,
        "Hora Salida Esperada": attendance.expectedCheckOut,
        "Minutos Tarde": attendance.lateMinutes,
        "Minutos Salida Anticipada": attendance.earlyDepartureMinutes,
        "Es Feriado": attendance.isHoliday ? "Sí" : "No",
        Ausente: attendance.isAbsent ? "Sí" : "No",
        Justificado: attendance.isJustified ? "Sí" : "No",
        Notas: attendance.notes || "",
      }
    })

    exportToCSV(data, `asistencias_${selectedDate.toISOString().split("T")[0]}`)
  }

  const handleEmployeeChange = (employeeId: string) => {
    setSelectedEmployee(employeeId)

    // Si se selecciona un empleado, actualizar los horarios esperados
    if (employeeId) {
      const employee = employees.find((e) => e.id === employeeId)
      if (employee) {
        let expectedCheckIn = ""
        let expectedCheckOut = ""

        switch (employee.workShift) {
          case "morning":
            expectedCheckIn = "08:00"
            expectedCheckOut = "16:00"
            break
          case "afternoon":
            expectedCheckIn = "16:00"
            expectedCheckOut = "00:00"
            break
          case "night":
            expectedCheckIn = "00:00"
            expectedCheckOut = "08:00"
            break
          case "full_time":
            expectedCheckIn = "09:00"
            expectedCheckOut = "18:00"
            break
          case "part_time":
            expectedCheckIn = "18:00"
            expectedCheckOut = "22:00"
            break
        }

        setNewAttendance((prev) => ({
          ...prev,
          employeeId,
          expectedCheckIn,
          expectedCheckOut,
        }))
      }
    }
  }

  const calculateMinutes = () => {
    if (!newAttendance.checkIn || !newAttendance.expectedCheckIn || newAttendance.isAbsent) {
      setNewAttendance((prev) => ({ ...prev, lateMinutes: 0 }))
      return
    }

    // Calcular minutos tarde
    const [checkInHour, checkInMinute] = newAttendance.checkIn.split(":").map(Number)
    const [expectedCheckInHour, expectedCheckInMinute] = newAttendance.expectedCheckIn.split(":").map(Number)

    const checkInDate = new Date()
    checkInDate.setHours(checkInHour, checkInMinute, 0, 0)

    const expectedCheckInDate = new Date()
    expectedCheckInDate.setHours(expectedCheckInHour, expectedCheckInMinute, 0, 0)

    const diffMinutes = Math.floor((checkInDate.getTime() - expectedCheckInDate.getTime()) / (1000 * 60))

    // Solo contar minutos tarde si son más de 10 (tolerancia)
    const lateMinutes = diffMinutes > 10 ? diffMinutes : 0

    setNewAttendance((prev) => ({ ...prev, lateMinutes }))
  }

  const calculateEarlyDeparture = () => {
    if (!newAttendance.checkOut || !newAttendance.expectedCheckOut || newAttendance.isAbsent) {
      setNewAttendance((prev) => ({ ...prev, earlyDepartureMinutes: 0 }))
      return
    }

    // Calcular minutos de salida anticipada
    const [checkOutHour, checkOutMinute] = newAttendance.checkOut.split(":").map(Number)
    const [expectedCheckOutHour, expectedCheckOutMinute] = newAttendance.expectedCheckOut.split(":").map(Number)

    const checkOutDate = new Date()
    checkOutDate.setHours(checkOutHour, checkOutMinute, 0, 0)

    const expectedCheckOutDate = new Date()
    expectedCheckOutDate.setHours(expectedCheckOutHour, expectedCheckOutMinute, 0, 0)

    const diffMinutes = Math.floor((expectedCheckOutDate.getTime() - checkOutDate.getTime()) / (1000 * 60))

    // Solo contar minutos de salida anticipada si son positivos
    const earlyDepartureMinutes = diffMinutes > 0 ? diffMinutes : 0

    setNewAttendance((prev) => ({ ...prev, earlyDepartureMinutes }))
  }

  const handleSubmit = async () => {
    try {
      // Crear nueva asistencia
      const createdAttendance = await dbService.createAttendance(newAttendance)

      // Actualizar la lista de asistencias
      setAttendances((prev) => [...prev, createdAttendance])

      // Cerrar el diálogo y resetear el formulario
      setIsDialogOpen(false)
      setNewAttendance({
        employeeId: "",
        date: new Date().toISOString().split("T")[0],
        checkIn: "",
        checkOut: "",
        expectedCheckIn: "",
        expectedCheckOut: "",
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        isHoliday: false,
        isAbsent: false,
        isJustified: false,
        notes: "",
      })

      toast({
        title: "Asistencia registrada",
        description: "La asistencia ha sido registrada correctamente.",
      })
    } catch (error) {
      console.error("Error al crear asistencia:", error)
      toast({
        title: "Error",
        description: "Error al registrar la asistencia. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  // Función para abrir el diálogo de edición
  const handleEditAttendance = (attendance: Attendance) => {
    setSelectedAttendance(attendance)
    setEditAttendance(attendance)
    setIsEditDialogOpen(true)
  }

  // Función para guardar los cambios de la edición
  const handleSaveEdit = async () => {
    if (!editAttendance) return

    try {
      // Actualizar la asistencia en la base de datos
      const updatedAttendance = await dbService.updateAttendance(editAttendance.id, editAttendance)

      // Actualizar la lista de asistencias
      setAttendances((prev) =>
        prev.map((attendance) => (attendance.id === updatedAttendance.id ? updatedAttendance : attendance)),
      )

      // Cerrar el diálogo de edición
      setIsEditDialogOpen(false)
      setEditAttendance(null)

      toast({
        title: "Asistencia actualizada",
        description: "La asistencia ha sido actualizada correctamente.",
      })
    } catch (error) {
      console.error("Error al actualizar asistencia:", error)
      toast({
        title: "Error",
        description: "Error al actualizar la asistencia. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<Attendance>[] = [
    {
      accessorKey: "employeeId",
      header: "Empleado",
      cell: ({ row }) => {
        const employee = employees.find((e) => e.id === row.original.employeeId)
        return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
      },
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "checkIn",
      header: "Hora Entrada",
      cell: ({ row }) => (row.original.isAbsent ? "-" : row.original.checkIn),
    },
    {
      accessorKey: "checkOut",
      header: "Hora Salida",
      cell: ({ row }) => (row.original.isAbsent ? "-" : row.original.checkOut),
    },
    {
      accessorKey: "lateMinutes",
      header: "Min. Tarde",
      cell: ({ row }) => (row.original.isAbsent ? "-" : row.original.lateMinutes),
    },
    {
      accessorKey: "earlyDepartureMinutes",
      header: "Min. Salida Anticipada",
      cell: ({ row }) => (row.original.isAbsent ? "-" : row.original.earlyDepartureMinutes),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        if (row.original.isAbsent) {
          return row.original.isJustified ? (
            <StatusBadge status="Justificado" className="bg-yellow-100 text-yellow-800" />
          ) : (
            <StatusBadge status="Ausente" className="bg-red-100 text-red-800" />
          )
        }

        if (row.original.isHoliday) {
          return <StatusBadge status="Feriado" className="bg-blue-100 text-blue-800" />
        }

        if (row.original.lateMinutes > 10) {
          return <StatusBadge status="Tarde" className="bg-yellow-100 text-yellow-800" />
        }

        return <StatusBadge status="Presente" className="bg-green-100 text-green-800" />
      },
    },
    {
      id: "actions",
      header: () => <div className="text-center">Acciones</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-center space-x-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                <FileText className="mr-1 h-4 w-4" />
                Ver
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Detalles de Asistencia</DialogTitle>
                <DialogDescription>{formatDate(row.original.date)}</DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium">Información del Empleado</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    {(() => {
                      const employee = employees.find((e) => e.id === row.original.employeeId)
                      return (
                        <>
                          <p>
                            <span className="font-medium">Nombre:</span>{" "}
                            {employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"}
                          </p>
                          <p>
                            <span className="font-medium">Cargo:</span> {employee?.position || "-"}
                          </p>
                          <p>
                            <span className="font-medium">Local:</span> {employee?.local || "-"}
                          </p>
                          <p>
                            <span className="font-medium">Turno:</span>{" "}
                            {employee?.workShift === "morning"
                              ? "Mañana"
                              : employee?.workShift === "afternoon"
                                ? "Tarde"
                                : employee?.workShift === "night"
                                  ? "Noche"
                                  : employee?.workShift === "full_time"
                                    ? "Tiempo Completo"
                                    : employee?.workShift === "part_time"
                                      ? "Tiempo Parcial"
                                      : "-"}
                          </p>
                        </>
                      )
                    })()}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium">Información de Asistencia</h3>
                  <div className="mt-2 space-y-1 text-sm">
                    <p>
                      <span className="font-medium">Hora Entrada Esperada:</span> {row.original.expectedCheckIn}
                    </p>
                    <p>
                      <span className="font-medium">Hora Salida Esperada:</span> {row.original.expectedCheckOut}
                    </p>
                    <p>
                      <span className="font-medium">Hora Entrada Real:</span>{" "}
                      {row.original.isAbsent ? "-" : row.original.checkIn}
                    </p>
                    <p>
                      <span className="font-medium">Hora Salida Real:</span>{" "}
                      {row.original.isAbsent ? "-" : row.original.checkOut}
                    </p>
                    <p>
                      <span className="font-medium">Minutos Tarde:</span>{" "}
                      {row.original.isAbsent ? "-" : row.original.lateMinutes}
                    </p>
                    <p>
                      <span className="font-medium">Minutos Salida Anticipada:</span>{" "}
                      {row.original.isAbsent ? "-" : row.original.earlyDepartureMinutes}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-medium">Estado</h3>
                <div className="mt-2 space-y-1 text-sm">
                  <p>
                    <span className="font-medium">Feriado:</span> {row.original.isHoliday ? "Sí" : "No"}
                  </p>
                  <p>
                    <span className="font-medium">Ausente:</span> {row.original.isAbsent ? "Sí" : "No"}
                  </p>
                  <p>
                    <span className="font-medium">Justificado:</span> {row.original.isJustified ? "Sí" : "No"}
                  </p>
                  {row.original.notes && (
                    <p>
                      <span className="font-medium">Notas:</span> {row.original.notes}
                    </p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="ghost" size="sm" onClick={() => handleEditAttendance(row.original)}>
            <Edit className="mr-1 h-4 w-4" />
            Editar
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Control de Asistencias</h2>
            <p className="text-muted-foreground">Gestiona las asistencias de los empleados</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Registrar Asistencia
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Registrar Asistencia</DialogTitle>
                <DialogDescription>Ingresa los datos de asistencia del empleado</DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee">Empleado</Label>
                    <Select value={newAttendance.employeeId} onValueChange={handleEmployeeChange}>
                      <SelectTrigger id="employee">
                        <SelectValue placeholder="Seleccionar empleado" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees
                          .filter((e) => e.status === "active")
                          .map((employee) => (
                            <SelectItem key={employee.id} value={employee.id}>
                              {employee.firstName} {employee.lastName}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date">Fecha</Label>
                    <SimpleDatePicker
                      date={new Date(newAttendance.date)}
                      setDate={(date) => {
                        console.log("Fecha recibida del selector:", date.toISOString())

                        // Usar directamente la fecha del selector sin ajustes adicionales
                        // La fecha ya viene con la hora fijada a mediodía UTC desde el componente
                        setNewAttendance((prev) => ({
                          ...prev,
                          date: date.toISOString().split("T")[0],
                        }))
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isAbsent"
                      checked={newAttendance.isAbsent}
                      onCheckedChange={(checked) => {
                        const isAbsent = checked === true
                        setNewAttendance((prev) => ({
                          ...prev,
                          isAbsent,
                          checkIn: isAbsent ? "" : prev.checkIn,
                          checkOut: isAbsent ? "" : prev.checkOut,
                          lateMinutes: isAbsent ? 0 : prev.lateMinutes,
                          earlyDepartureMinutes: isAbsent ? 0 : prev.earlyDepartureMinutes,
                        }))
                      }}
                    />
                    <Label htmlFor="isAbsent">Ausente</Label>
                  </div>
                </div>

                {newAttendance.isAbsent && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="isJustified"
                        checked={newAttendance.isJustified}
                        onCheckedChange={(checked) => {
                          setNewAttendance((prev) => ({
                            ...prev,
                            isJustified: checked === true,
                          }))
                        }}
                      />
                      <Label htmlFor="isJustified">Justificado</Label>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isHoliday"
                      checked={newAttendance.isHoliday}
                      onCheckedChange={(checked) => {
                        setNewAttendance((prev) => ({
                          ...prev,
                          isHoliday: checked === true,
                        }))
                      }}
                    />
                    <Label htmlFor="isHoliday">Feriado</Label>
                  </div>
                </div>

                {!newAttendance.isAbsent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expectedCheckIn">Hora Entrada Esperada</Label>
                        <Input
                          id="expectedCheckIn"
                          type="time"
                          value={newAttendance.expectedCheckIn}
                          onChange={(e) => setNewAttendance((prev) => ({ ...prev, expectedCheckIn: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="expectedCheckOut">Hora Salida Esperada</Label>
                        <Input
                          id="expectedCheckOut"
                          type="time"
                          value={newAttendance.expectedCheckOut}
                          onChange={(e) => setNewAttendance((prev) => ({ ...prev, expectedCheckOut: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="checkIn">Hora Entrada Real</Label>
                        <Input
                          id="checkIn"
                          type="time"
                          value={newAttendance.checkIn}
                          onChange={(e) => {
                            setNewAttendance((prev) => ({ ...prev, checkIn: e.target.value }))
                            setTimeout(calculateMinutes, 100)
                          }}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="checkOut">Hora Salida Real</Label>
                        <Input
                          id="checkOut"
                          type="time"
                          value={newAttendance.checkOut}
                          onChange={(e) => {
                            setNewAttendance((prev) => ({ ...prev, checkOut: e.target.value }))
                            setTimeout(calculateEarlyDeparture, 100)
                          }}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="lateMinutes">Minutos Tarde</Label>
                        <Input
                          id="lateMinutes"
                          type="number"
                          value={newAttendance.lateMinutes}
                          onChange={(e) =>
                            setNewAttendance((prev) => ({ ...prev, lateMinutes: Number.parseInt(e.target.value) || 0 }))
                          }
                          readOnly
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="earlyDepartureMinutes">Minutos Salida Anticipada</Label>
                        <Input
                          id="earlyDepartureMinutes"
                          type="number"
                          value={newAttendance.earlyDepartureMinutes}
                          onChange={(e) =>
                            setNewAttendance((prev) => ({
                              ...prev,
                              earlyDepartureMinutes: Number.parseInt(e.target.value) || 0,
                            }))
                          }
                          readOnly
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas</Label>
                  <Input
                    id="notes"
                    value={newAttendance.notes}
                    onChange={(e) => setNewAttendance((prev) => ({ ...prev, notes: e.target.value }))}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button type="submit" onClick={handleSubmit}>
                  Guardar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Diálogo de edición de asistencia */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Asistencia</DialogTitle>
              <DialogDescription>{editAttendance && formatDate(editAttendance.date)}</DialogDescription>
            </DialogHeader>

            {editAttendance && (
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <div className="font-medium">
                    {(() => {
                      const employee = employees.find((e) => e.id === editAttendance.employeeId)
                      return employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"
                    })()}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsAbsent"
                      checked={editAttendance.isAbsent}
                      onCheckedChange={(checked) => {
                        const isAbsent = checked === true
                        setEditAttendance((prev) => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            isAbsent,
                            checkIn: isAbsent ? "" : prev.checkIn,
                            checkOut: isAbsent ? "" : prev.checkOut,
                            lateMinutes: isAbsent ? 0 : prev.lateMinutes,
                            earlyDepartureMinutes: isAbsent ? 0 : prev.earlyDepartureMinutes,
                          }
                        })
                      }}
                    />
                    <Label htmlFor="editIsAbsent">Ausente</Label>
                  </div>
                </div>

                {editAttendance.isAbsent && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="editIsJustified"
                        checked={editAttendance.isJustified}
                        onCheckedChange={(checked) => {
                          setEditAttendance((prev) => {
                            if (!prev) return prev
                            return {
                              ...prev,
                              isJustified: checked === true,
                            }
                          })
                        }}
                      />
                      <Label htmlFor="editIsJustified">Justificado</Label>
                    </div>
                    {editAttendance.isJustified && (
                      <div className="mt-2 p-3 bg-yellow-50 rounded-md text-sm">
                        <p className="font-medium text-yellow-800">Información importante:</p>
                        <p className="text-yellow-700 mt-1">
                          Al justificar una falta, se devolverán los 480 minutos que fueron descontados automáticamente.
                          Asegúrese de adjuntar el certificado médico correspondiente.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="editIsHoliday"
                      checked={editAttendance.isHoliday}
                      onCheckedChange={(checked) => {
                        setEditAttendance((prev) => {
                          if (!prev) return prev
                          return {
                            ...prev,
                            isHoliday: checked === true,
                          }
                        })
                      }}
                    />
                    <Label htmlFor="editIsHoliday">Feriado</Label>
                  </div>
                </div>

                {!editAttendance.isAbsent && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editExpectedCheckIn">Hora Entrada Esperada</Label>
                        <Input
                          id="editExpectedCheckIn"
                          type="time"
                          value={editAttendance.expectedCheckIn}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, expectedCheckIn: e.target.value }
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editExpectedCheckOut">Hora Salida Esperada</Label>
                        <Input
                          id="editExpectedCheckOut"
                          type="time"
                          value={editAttendance.expectedCheckOut}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, expectedCheckOut: e.target.value }
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editCheckIn">Hora Entrada Real</Label>
                        <Input
                          id="editCheckIn"
                          type="time"
                          value={editAttendance.checkIn}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, checkIn: e.target.value }
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editCheckOut">Hora Salida Real</Label>
                        <Input
                          id="editCheckOut"
                          type="time"
                          value={editAttendance.checkOut}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, checkOut: e.target.value }
                            })
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="editLateMinutes">Minutos Tarde</Label>
                        <Input
                          id="editLateMinutes"
                          type="number"
                          value={editAttendance.lateMinutes}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, lateMinutes: Number.parseInt(e.target.value) || 0 }
                            })
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="editEarlyDepartureMinutes">Minutos Salida Anticipada</Label>
                        <Input
                          id="editEarlyDepartureMinutes"
                          type="number"
                          value={editAttendance.earlyDepartureMinutes}
                          onChange={(e) =>
                            setEditAttendance((prev) => {
                              if (!prev) return prev
                              return { ...prev, earlyDepartureMinutes: Number.parseInt(e.target.value) || 0 }
                            })
                          }
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="editNotes">Notas</Label>
                  <Input
                    id="editNotes"
                    value={editAttendance.notes}
                    onChange={(e) =>
                      setEditAttendance((prev) => {
                        if (!prev) return prev
                        return { ...prev, notes: e.target.value }
                      })
                    }
                  />
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" onClick={handleSaveEdit}>
                Guardar Cambios
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Registro de Asistencias</CardTitle>
            <CardDescription>Selecciona una fecha para ver las asistencias correspondientes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center mb-4 space-x-4">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <SimpleDatePicker date={selectedDate} setDate={handleDateChange} />
              </div>

              <div className="flex-1 max-w-sm">
                <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los empleados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los empleados</SelectItem>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="ml-auto flex items-center gap-2">
                <Button variant="outline" onClick={handleExportCSV}>
                  <Download className="mr-2 h-4 w-4" />
                  Exportar CSV
                </Button>
              </div>
            </div>

            <DataTable
              columns={columns}
              data={attendances}
              searchColumn="employeeId"
              searchPlaceholder="Buscar empleado..."
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}




























