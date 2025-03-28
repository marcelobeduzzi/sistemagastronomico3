"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { dbService } from "@/lib/db-service"
import { formatCurrency } from "@/lib/export-utils"
import type { Employee } from "@/types"

export default function DiagnosticoPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedEmployee, setSelectedEmployee] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [calculationResults, setCalculationResults] = useState<any>(null)
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1)
  const [year, setYear] = useState<number>(new Date().getFullYear())

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    try {
      const employeesData = await dbService.getEmployees()
      setEmployees(employeesData.filter(emp => emp.status === 'active'))
      setIsLoading(false)
    } catch (error) {
      console.error("Error al cargar empleados:", error)
      setIsLoading(false)
    }
  }

  const calculatePayroll = async () => {
    if (!selectedEmployee) return

    setIsLoading(true)
    try {
      const employee = employees.find(emp => emp.id === selectedEmployee)
      if (!employee) return

      // Obtener asistencias del mes
      const startDate = new Date(year, month - 1, 1).toISOString().split('T')[0]
      const endDate = new Date(year, month, 0).toISOString().split('T')[0]
      
      // Usar el nuevo método para obtener asistencias
      const attendances = await dbService.getAttendancesByDateRange(employee.id, startDate, endDate)

      // Calcular valores base
      const baseSalary = employee.baseSalary || 0
      const bankSalary = employee.bankSalary || 0
      
      // Cálculo corregido
      const totalSalaryBeforeAdjustments = bankSalary > baseSalary ? bankSalary + baseSalary : baseSalary
      const handSalary = bankSalary > baseSalary ? baseSalary : baseSalary - bankSalary
      
      // Calcular deducciones y adiciones
      let deductions = 0
      let additions = 0
      
      if (attendances && attendances.length > 0) {
        // Calcular el valor del minuto trabajado
        const minuteValue = totalSalaryBeforeAdjustments / (30 * 8 * 60)
        
        // Procesar asistencias
        const attendanceDetails = attendances.map(att => {
          let attDeductions = 0
          let attAdditions = 0
          
          // Ausencias injustificadas
          if (att.isAbsent && !att.isJustified) {
            const dailyRate = totalSalaryBeforeAdjustments / 30
            attDeductions += dailyRate
          }
          
          // Minutos tarde
          if (att.lateMinutes > 0) {
            const lateDeduction = att.lateMinutes * minuteValue
            attDeductions += lateDeduction
          }
          
          // Salida anticipada
          if (att.earlyDepartureMinutes > 0) {
            const earlyDeduction = att.earlyDepartureMinutes * minuteValue
            attDeductions += earlyDeduction
          }
          
          // Horas extra
          if (att.extraMinutes > 0) {
            const extraAddition = att.extraMinutes * minuteValue * 1.5
            attAdditions += extraAddition
          }
          
          deductions += attDeductions
          additions += attAdditions
          
          return {
            date: att.date,
            isAbsent: att.isAbsent,
            isJustified: att.isJustified,
            lateMinutes: att.lateMinutes,
            earlyDepartureMinutes: att.earlyDepartureMinutes,
            extraMinutes: att.extraMinutes,
            deductions: attDeductions,
            additions: attAdditions
          }
        })
        
        // Redondear valores
        deductions = Math.round(deductions * 100) / 100
        additions = Math.round(additions * 100) / 100
        
        // Calcular valores finales
        const finalHandSalary = handSalary - deductions + additions
        const totalSalary = bankSalary + finalHandSalary
        
        setCalculationResults({
          employee: `${employee.firstName} ${employee.lastName}`,
          baseSalary,
          bankSalary,
          handSalary,
          deductions,
          additions,
          finalHandSalary,
          totalSalary,
          minuteValue: totalSalaryBeforeAdjustments / (30 * 8 * 60),
          attendanceDetails
        })
      } else {
        // Sin asistencias, solo mostrar valores base
        setCalculationResults({
          employee: `${employee.firstName} ${employee.lastName}`,
          baseSalary,
          bankSalary,
          handSalary,
          deductions: 0,
          additions: 0,
          finalHandSalary: handSalary,
          totalSalary: bankSalary + handSalary,
          minuteValue: totalSalaryBeforeAdjustments / (30 * 8 * 60),
          attendanceDetails: []
        })
      }
    } catch (error) {
      console.error("Error al calcular nómina:", error)
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
            <p className="text-muted-foreground">Verificar cálculos de nómina sin guardar en la base de datos</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Empleado y Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Empleado</label>
                <Select
                  value={selectedEmployee}
                  onValueChange={setSelectedEmployee}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar empleado" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.firstName} {emp.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mes</label>
                <Select
                  value={month.toString()}
                  onValueChange={(value) => setMonth(parseInt(value))}
                >
                  <SelectTrigger>
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

              <div>
                <label className="block text-sm font-medium mb-1">Año</label>
                <Select
                  value={year.toString()}
                  onValueChange={(value) => setYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar año" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2023">2023</SelectItem>
                    <SelectItem value="2024">2024</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mt-4">
              <Button 
                onClick={calculatePayroll} 
                disabled={isLoading || !selectedEmployee}
              >
                {isLoading ? "Calculando..." : "Calcular Nómina"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {calculationResults && (
          <Card>
            <CardHeader>
              <CardTitle>Resultados del Cálculo para {calculationResults.employee}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Valores Base</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sueldo Base:</span>
                      <span className="font-medium">{formatCurrency(calculationResults.baseSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sueldo en Banco:</span>
                      <span className="font-medium">{formatCurrency(calculationResults.bankSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Sueldo en Mano Original:</span>
                      <span className="font-medium">{formatCurrency(calculationResults.handSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Valor del Minuto:</span>
                      <span className="font-medium">{formatCurrency(calculationResults.minuteValue)}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-4 mb-2">Ajustes</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Total Deducciones:</span>
                      <span className="font-medium text-red-600">-{formatCurrency(calculationResults.deductions)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Adiciones:</span>
                      <span className="font-medium text-green-600">+{formatCurrency(calculationResults.additions)}</span>
                    </div>
                  </div>

                  <h3 className="text-lg font-medium mt-4 mb-2">Resultados Finales</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sueldo Final en Mano:</span>
                      <span className="font-medium">{formatCurrency(calculationResults.finalHandSalary)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total a Pagar:</span>
                      <span className="font-bold text-lg">{formatCurrency(calculationResults.totalSalary)}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-2">Detalle de Asistencias</h3>
                  {calculationResults.attendanceDetails.length > 0 ? (
                    <div className="border rounded-md overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Deducciones</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Adiciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {calculationResults.attendanceDetails.map((att: any, index: number) => (
                            <tr key={index}>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">{att.date}</td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm">
                                {att.isAbsent 
                                  ? (att.isJustified ? "Ausente (Justificado)" : "Ausente (No Justificado)") 
                                  : "Presente"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-red-600">
                                {att.deductions > 0 ? `-${formatCurrency(att.deductions)}` : "-"}
                              </td>
                              <td className="px-3 py-2 whitespace-nowrap text-sm text-green-600">
                                {att.additions > 0 ? `+${formatCurrency(att.additions)}` : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No hay registros de asistencia para este período</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}