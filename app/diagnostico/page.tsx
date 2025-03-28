"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { dbService } from "@/lib/db-service"
import { formatCurrency, formatDate } from "@/lib/export-utils"
import { useToast } from "@/components/ui/use-toast"
import { Calendar, Search } from 'lucide-react'
import type { Employee, Attendance } from "@/types"

export default function DiagnosticPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [startDate, setStartDate] = useState<string>("")
  const [endDate, setEndDate] = useState<string>("")
  const [attendances, setAttendances] = useState<Attendance[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [payrollData, setPayrollData] = useState<any>(null)
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null)
  const { toast } = useToast()

  // Cargar empleados al iniciar
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const data = await dbService.getEmployees()
        setEmployees(data)
        
        // Establecer fechas predeterminadas (mes actual en 2025)
        const today = new Date()
        today.setFullYear(2025) // Forzar el año a 2025
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
        
        setStartDate(firstDay.toISOString().split('T')[0])
        setEndDate(lastDay.toISOString().split('T')[0])
      } catch (error) {
        console.error("Error al cargar empleados:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los empleados",
          variant: "destructive",
        })
      }
    }
    
    loadEmployees()
  }, [toast])

  // Función para buscar asistencias
  const handleSearch = async () => {
    if (!selectedEmployee || !startDate || !endDate) {
      toast({
        title: "Datos incompletos",
        description: "Por favor seleccione un empleado y un rango de fechas",
        variant: "destructive",
      })
      return
    }
    
    setIsLoading(true)
    setAttendances([])
    setPayrollData(null)
    setDiagnosticResults(null)
    
    try {
      // Obtener asistencias para el rango de fechas
      const attendanceData = await dbService.getAttendancesByDateRange(
        selectedEmployee,
        startDate,
        endDate
      )
      setAttendances(attendanceData)
      
      // Obtener datos de nómina para el empleado
      // Extraer mes y año de la fecha de inicio para buscar la nómina correspondiente
      const startDateObj = new Date(startDate)
      const month = startDateObj.getMonth() + 1
      const year = startDateObj.getFullYear()
      
      // Buscar nóminas para el empleado
      const payrolls = await dbService.getPayrollByEmployeeId(selectedEmployee)
      
      // Filtrar por mes y año
      const matchingPayroll = payrolls.find(
        p => p.month === month && p.year === year
      )
      
      setPayrollData(matchingPayroll || null)
      
      // Realizar diagnóstico
      if (attendanceData.length > 0) {
        const employee = employees.find(e => e.id === selectedEmployee)
        
        if (employee) {
          // Calcular valores basados en asistencias
          const baseSalary = employee.baseSalary || 0
          const bankSalary = employee.bankSalary || 0
          
          // Calcular sueldo en mano (debe ser positivo)
          const totalSalaryBeforeAdjustments = bankSalary > baseSalary ? bankSalary + baseSalary : baseSalary
          const handSalary = bankSalary > baseSalary ? baseSalary : baseSalary - bankSalary
          
          // Calcular deducciones y adiciones
          let deductions = 0
          let additions = 0
          let totalMinutesBalance = 0
          
          // Valor del minuto trabajado
          const minuteValue = totalSalaryBeforeAdjustments / (30 * 8 * 60)
          
          // Procesar asistencias
          attendanceData.forEach(attendance => {
            // Sumar balance de minutos
            totalMinutesBalance += attendance.totalMinutesBalance || 0
            
            // Ausencias injustificadas
            if (attendance.isAbsent && !attendance.isJustified) {
              const dailyRate = totalSalaryBeforeAdjustments / 30
              deductions += dailyRate
            }
            
            // Minutos tarde
            if (attendance.lateMinutes > 0) {
              deductions += attendance.lateMinutes * minuteValue
            }
            
            // Salida anticipada
            if (attendance.earlyDepartureMinutes > 0) {
              deductions += attendance.earlyDepartureMinutes * minuteValue
            }
            
            // Horas extra
            if (attendance.extraMinutes > 0) {
              additions += attendance.extraMinutes * minuteValue * 1.5
            }
          })
          
          // Redondear valores
          deductions = Math.round(deductions * 100) / 100
          additions = Math.round(additions * 100) / 100
          
          // Calcular valores finales
          const finalHandSalary = handSalary - deductions + additions
          const totalSalary = bankSalary + finalHandSalary
          
          // Guardar resultados del diagnóstico
          setDiagnosticResults({
            baseSalary,
            bankSalary,
            handSalary,
            deductions,
            additions,
            finalHandSalary,
            totalSalary,
            totalMinutesBalance,
            minuteValue
          })
        }
      }
    } catch (error) {
      console.error("Error al buscar datos:", error)
      toast({
        title: "Error",
        description: "No se pudieron obtener los datos solicitados",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Diagnóstico de Nómina</h2>
            <p className="text-muted-foreground">
              Herramienta para verificar cálculos de nómina basados en asistencias
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Parámetros de Búsqueda</CardTitle>
            <CardDescription>
              Seleccione un empleado y un rango de fechas para analizar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="employee">Empleado</Label>
                <Select
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                >
                  <SelectTrigger id="employee">
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.firstName} {employee.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha Inicio</Label>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Fecha Fin</Label>
                <div className="flex items-center">
                  <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Search className="mr-2 h-4 w-4" />
                  {isLoading ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedEmployee && employees.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Información del Empleado</CardTitle>
            </CardHeader>
            <CardContent>
              {(() => {
                const employee = employees.find(
                  (e) => e.id === selectedEmployee
                )
                if (!employee) return <p>Empleado no encontrado</p>

                return (
                  <div className="grid gap-4 md:grid-cols-3">
                    <div>
                      <h3 className="font-medium mb-2">Datos Personales</h3>
                      <p>
                        <span className="font-medium">Nombre:</span>{" "}
                        {employee.firstName} {employee.lastName}
                      </p>
                      <p>
                        <span className="font-medium">DNI:</span>{" "}
                        {employee.documentId}
                      </p>
                      <p>
                        <span className="font-medium">Fecha de Ingreso:</span>{" "}
                        {formatDate(employee.hireDate)}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Datos Laborales</h3>
                      <p>
                        <span className="font-medium">Cargo:</span>{" "}
                        {employee.position}
                      </p>
                      <p>
                        <span className="font-medium">Local:</span>{" "}
                        {employee.local}
                      </p>
                      <p>
                        <span className="font-medium">Estado:</span>{" "}
                        {employee.status}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium mb-2">Datos Salariales</h3>
                      <p>
                        <span className="font-medium">Sueldo Base:</span>{" "}
                        {formatCurrency(employee.baseSalary || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo Banco:</span>{" "}
                        {formatCurrency(employee.bankSalary || 0)}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo en Mano (calculado):</span>{" "}
                        {formatCurrency(
                          (employee.bankSalary || 0) > (employee.baseSalary || 0)
                            ? (employee.baseSalary || 0)
                            : (employee.baseSalary || 0) - (employee.bankSalary || 0)
                        )}
                      </p>
                    </div>
                  </div>
                )
              })()}
            </CardContent>
          </Card>
        )}

        {attendances.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Asistencias en el Período</CardTitle>
              <CardDescription>
                Se encontraron {attendances.length} registros de asistencia
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrada
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Salida
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min. Tarde
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min. Salida Ant.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Min. Extra
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Balance Min.
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendances.map((attendance) => (
                      <tr key={attendance.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {formatDate(attendance.date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.checkIn || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.checkOut || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.lateMinutes || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.earlyDepartureMinutes || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.extraMinutes || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {attendance.totalMinutesBalance || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
            </CardContent>
          </Card>
        )}

        {diagnosticResults && (
          <Card>
            <CardHeader>
              <CardTitle>Diagnóstico de Nómina</CardTitle>
              <CardDescription>
                Cálculos basados en las asistencias del período
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="font-medium mb-4">Cálculos Realizados</h3>
                  <div className="space-y-2">
                    <p>
                      <span className="font-medium">Sueldo Base:</span>{" "}
                      {formatCurrency(diagnosticResults.baseSalary)}
                    </p>
                    <p>
                      <span className="font-medium">Sueldo Banco:</span>{" "}
                      {formatCurrency(diagnosticResults.bankSalary)}
                    </p>
                    <p>
                      <span className="font-medium">Sueldo en Mano Original:</span>{" "}
                      {formatCurrency(diagnosticResults.handSalary)}
                    </p>
                    <p>
                      <span className="font-medium">Deducciones:</span>{" "}
                      {formatCurrency(diagnosticResults.deductions)}
                    </p>
                    <p>
                      <span className="font-medium">Adiciones:</span>{" "}
                      {formatCurrency(diagnosticResults.additions)}
                    </p>
                    <p>
                      <span className="font-medium">Sueldo Final en Mano:</span>{" "}
                      {formatCurrency(diagnosticResults.finalHandSalary)}
                    </p>
                    <p>
                      <span className="font-medium">Total a Pagar:</span>{" "}
                      {formatCurrency(diagnosticResults.totalSalary)}
                    </p>
                  </div>
                  
                  <div className="mt-4">
                    <p>
                      <span className="font-medium">Balance Total de Minutos:</span>{" "}
                      {diagnosticResults.totalMinutesBalance} minutos
                    </p>
                    <p>
                      <span className="font-medium">Valor del Minuto:</span>{" "}
                      {formatCurrency(diagnosticResults.minuteValue)}
                    </p>
                  </div>
                </div>

                {payrollData && (
                  <div>
                    <h3 className="font-medium mb-4">Nómina en Base de Datos</h3>
                    <div className="space-y-2">
                      <p>
                        <span className="font-medium">Período:</span>{" "}
                        {payrollData.month}/{payrollData.year}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo Base:</span>{" "}
                        {formatCurrency(payrollData.baseSalary)}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo Banco:</span>{" "}
                        {formatCurrency(payrollData.bankSalary)}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo en Mano Original:</span>{" "}
                        {formatCurrency(payrollData.handSalary)}
                      </p>
                      <p>
                        <span className="font-medium">Deducciones:</span>{" "}
                        {formatCurrency(payrollData.deductions)}
                      </p>
                      <p>
                        <span className="font-medium">Adiciones:</span>{" "}
                        {formatCurrency(payrollData.additions)}
                      </p>
                      <p>
                        <span className="font-medium">Sueldo Final en Mano:</span>{" "}
                        {formatCurrency(payrollData.finalHandSalary)}
                      </p>
                      <p>
                        <span className="font-medium">Total a Pagar:</span>{" "}
                        {formatCurrency(payrollData.totalSalary)}
                      </p>
                      <p>
                        <span className="font-medium">Estado:</span>{" "}
                        {payrollData.isPaid ? "Pagado" : "Pendiente"}
                      </p>
                    </div>
                    
                    <div className="mt-6 p-4 bg-yellow-50 rounded-md border border-yellow-200">
                      <h4 className="font-medium text-yellow-800 mb-2">Comparación</h4>
                      <ul className="space-y-1 text-sm text-yellow-800">
                        {Math.abs(diagnosticResults.handSalary - payrollData.handSalary) > 0.1 && (
                          <li className="text-red-600 font-medium">
                            ⚠️ Diferencia en Sueldo en Mano Original: {formatCurrency(Math.abs(diagnosticResults.handSalary - payrollData.handSalary))}
                          </li>
                        )}
                        {Math.abs(diagnosticResults.deductions - payrollData.deductions) > 0.1 && (
                          <li>
                            Diferencia en Deducciones: {formatCurrency(Math.abs(diagnosticResults.deductions - payrollData.deductions))}
                          </li>
                        )}
                        {Math.abs(diagnosticResults.additions - payrollData.additions) > 0.1 && (
                          <li>
                            Diferencia en Adiciones: {formatCurrency(Math.abs(diagnosticResults.additions - payrollData.additions))}
                          </li>
                        )}
                        {Math.abs(diagnosticResults.finalHandSalary - payrollData.finalHandSalary) > 0.1 && (
                          <li>
                            Diferencia en Sueldo Final en Mano: {formatCurrency(Math.abs(diagnosticResults.finalHandSalary - payrollData.finalHandSalary))}
                          </li>
                        )}
                        {Math.abs(diagnosticResults.totalSalary - payrollData.totalSalary) > 0.1 && (
                          <li>
                            Diferencia en Total a Pagar: {formatCurrency(Math.abs(diagnosticResults.totalSalary - payrollData.totalSalary))}
                          </li>
                        )}
                        {Math.abs(diagnosticResults.handSalary - payrollData.handSalary) <= 0.1 &&
                         Math.abs(diagnosticResults.deductions - payrollData.deductions) <= 0.1 &&
                         Math.abs(diagnosticResults.additions - payrollData.additions) <= 0.1 &&
                         Math.abs(diagnosticResults.finalHandSalary - payrollData.finalHandSalary) <= 0.1 &&
                         Math.abs(diagnosticResults.totalSalary - payrollData.totalSalary) <= 0.1 && (
                          <li className="text-green-600 font-medium">
                            ✅ Los cálculos coinciden correctamente
                          </li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
                
                {!payrollData && diagnosticResults && (
                  <div>
                    <h3 className="font-medium mb-4">Nómina en Base de Datos</h3>
                    <p className="text-yellow-600">
                      No se encontró una nómina para este empleado en el período seleccionado.
                    </p>
                    <p className="mt-2">
                      Puede generar una nueva nómina desde la página de Nómina.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}