import { dbService } from "@/lib/db-service"

export class PayrollService {
  async generatePayrolls(employeeIds: string[], month: number, year: number) {
    try {
      const results = []

      for (const employeeId of employeeIds) {
        // Obtener información del empleado
        const employee = await dbService.getEmployeeById(employeeId)

        if (!employee) {
          console.error(`Empleado con ID ${employeeId} no encontrado`)
          continue
        }

        // Verificar si ya existe una nómina para este empleado en el mes/año especificado
        // Usamos getPayrollsByPeriod y filtramos por employeeId en lugar de usar un método específico
        const allPayrolls = await dbService.getPayrollsByPeriod(month, year, false)
        const existingPayrolls = allPayrolls.filter((p) => p.employeeId === employeeId)

        if (existingPayrolls.length > 0) {
          console.log(`La nómina para el empleado ${employeeId} en ${month}/${year} ya existe`)
          results.push(existingPayrolls[0])
          continue
        }

        // Calcular los valores de la nómina
        const baseSalary = Number.parseFloat(employee.baseSalary) || 0
        const handSalary = Number.parseFloat(employee.handSalary) || 0
        const bankSalary = Number.parseFloat(employee.bankSalary) || 0

        // Calcular deducciones y adiciones (esto puede variar según tu lógica de negocio)
        const deductions = 0 // Implementar lógica de deducciones si es necesario
        const additions = 0 // Implementar lógica de adiciones si es necesario

        // Calcular bonificación por asistencia si aplica
        const attendanceBonus = employee.hasAttendanceBonus ? Number.parseFloat(employee.attendanceBonus) || 0 : 0

        // Calcular salarios finales
        const finalHandSalary = handSalary - deductions + additions + attendanceBonus
        const totalSalary = baseSalary - deductions + additions + attendanceBonus

        // Crear la nueva nómina usando dbService
        const newPayroll = {
          employeeId,
          month,
          year,
          baseSalary,
          bankSalary,
          deductions,
          additions,
          finalHandSalary,
          totalSalary,
          handSalaryPaid: false,
          bankSalaryPaid: false,
          handSalary,
          isPaid: false,
          hasAttendanceBonus: employee.hasAttendanceBonus,
          attendanceBonus,
        }

        const createdPayroll = await dbService.createPayroll(newPayroll)
        results.push(createdPayroll)
      }

      return results
    } catch (error) {
      console.error("Error al generar nóminas:", error)
      throw new Error("Error al generar nóminas")
    }
  }

  async getPayrollsByMonthYear(month: number, year: number) {
    try {
      return await dbService.getPayrollsByPeriod(month, year, false)
    } catch (error) {
      console.error("Error al obtener nóminas:", error)
      throw new Error("Error al obtener nóminas")
    }
  }

  async updatePayrollStatus(payrollId: string, field: string, value: boolean) {
    try {
      const validFields = ["is_paid_hand", "is_paid_bank", "is_paid"]
      if (!validFields.includes(field)) {
        throw new Error("Campo inválido para actualizar")
      }

      // Convertir snake_case a camelCase para el dbService
      const camelField =
        field === "is_paid_hand" ? "handSalaryPaid" : field === "is_paid_bank" ? "bankSalaryPaid" : "isPaid"

      // Preparar objeto de actualización
      const updateData: Record<string, any> = {
        [camelField]: value,
      }

      // Si estamos marcando como pagado, actualizar la fecha de pago correspondiente
      if (field === "is_paid_hand" && value) {
        updateData.handPaymentDate = new Date().toISOString()
      } else if (field === "is_paid_bank" && value) {
        updateData.bankPaymentDate = new Date().toISOString()
      }

      // Usar dbService para actualizar la nómina
      const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
      return updatedPayroll
    } catch (error) {
      console.error("Error al actualizar estado de nómina:", error)
      throw new Error("Error al actualizar estado de nómina")
    }
  }

  async updatePaymentDetails(payrollId: string, paymentMethod: string, paymentReference: string) {
    try {
      // Usar dbService para actualizar los detalles de pago
      const updateData = {
        paymentMethod,
        paymentReference,
      }

      const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
      return updatedPayroll
    } catch (error) {
      console.error("Error al actualizar detalles de pago:", error)
      throw new Error("Error al actualizar detalles de pago")
    }
  }

  async getPayrollById(payrollId: string) {
    try {
      return await dbService.getPayrollById(payrollId)
    } catch (error) {
      console.error("Error al obtener nómina:", error)
      throw new Error("Error al obtener nómina")
    }
  }

  async getPayrollsByEmployeeId(employeeId: string) {
    try {
      return await dbService.getPayrollsByEmployeeId(employeeId)
    } catch (error) {
      console.error("Error al obtener nóminas del empleado:", error)
      throw new Error("Error al obtener nóminas del empleado")
    }
  }

  async updatePayroll(payrollId: string, updateData: Record<string, any>) {
    try {
      return await dbService.updatePayroll(payrollId, updateData)
    } catch (error) {
      console.error("Error al actualizar nómina:", error)
      throw new Error("Error al actualizar nómina")
    }
  }

  async deletePayroll(payrollId: string) {
    try {
      return await dbService.deletePayroll(payrollId)
    } catch (error) {
      console.error("Error al eliminar nómina:", error)
      throw new Error("Error al eliminar nómina")
    }
  }

  async calculatePayrollAdjustments(payrollId: string, attendances: any[]) {
    try {
      // Obtener la nómina actual
      const payroll = await this.getPayrollById(payrollId)
      if (!payroll) {
        throw new Error("Nómina no encontrada")
      }

      // Obtener información del empleado
      const employee = await dbService.getEmployeeById(payroll.employeeId)
      if (!employee) {
        throw new Error("Empleado no encontrado")
      }

      // Calcular deducciones por ausencias y llegadas tarde
      let deductions = 0
      let additions = 0
      const details = []

      // Valor del minuto (basado en el salario base)
      const dailySalary = payroll.baseSalary / 30 // Salario diario
      const hourSalary = dailySalary / 8 // Salario por hora (asumiendo 8 horas por día)
      const minuteSalary = hourSalary / 60 // Salario por minuto

      // Procesar cada asistencia
      for (const attendance of attendances) {
        // Ausencias injustificadas
        if (attendance.isAbsent && !attendance.isJustified && !attendance.isHoliday) {
          const absenceDeduction = dailySalary
          deductions += absenceDeduction
          details.push({
            concept: "Ausencia Injustificada",
            type: "deduction",
            amount: absenceDeduction,
            description: `Ausencia el día ${attendance.date}`,
          })
        }

        // Llegadas tarde
        if (attendance.lateMinutes > 0) {
          const lateDeduction = minuteSalary * attendance.lateMinutes
          deductions += lateDeduction
          details.push({
            concept: "Llegada Tarde",
            type: "deduction",
            amount: lateDeduction,
            description: `${attendance.lateMinutes} minutos tarde el día ${attendance.date}`,
          })
        }

        // Salidas anticipadas
        if (attendance.earlyDepartureMinutes > 0) {
          const earlyDeduction = minuteSalary * attendance.earlyDepartureMinutes
          deductions += earlyDeduction
          details.push({
            concept: "Salida Anticipada",
            type: "deduction",
            amount: earlyDeduction,
            description: `${attendance.earlyDepartureMinutes} minutos antes el día ${attendance.date}`,
          })
        }

        // Horas extra
        if (attendance.extraMinutes > 0) {
          // Las horas extra se pagan a 1.5x el valor normal
          const extraAddition = minuteSalary * attendance.extraMinutes * 1.5
          additions += extraAddition
          details.push({
            concept: "Horas Extra",
            type: "addition",
            amount: extraAddition,
            description: `${attendance.extraMinutes} minutos extra el día ${attendance.date}`,
          })
        }

        // Feriados trabajados
        if (attendance.isHoliday && !attendance.isAbsent) {
          // Los feriados se pagan doble
          const holidayAddition = dailySalary
          additions += holidayAddition
          details.push({
            concept: "Feriado Trabajado",
            type: "addition",
            amount: holidayAddition,
            description: `Trabajo en día feriado ${attendance.date}`,
          })
        }
      }

      // Redondear valores para evitar problemas de precisión
      deductions = Math.round(deductions * 100) / 100
      additions = Math.round(additions * 100) / 100

      // Calcular nuevos totales
      const finalHandSalary = payroll.handSalary - deductions + additions + (payroll.attendanceBonus || 0)
      const totalSalary = payroll.baseSalary - deductions + additions + (payroll.attendanceBonus || 0)

      // Actualizar la nómina
      const updateData = {
        deductions,
        additions,
        finalHandSalary,
        totalSalary,
        details,
      }

      return await this.updatePayroll(payrollId, updateData)
    } catch (error) {
      console.error("Error al calcular ajustes de nómina:", error)
      throw new Error("Error al calcular ajustes de nómina")
    }
  }

  async recalculateAllPayrolls(month: number, year: number) {
    try {
      // Obtener todas las nóminas del período
      const payrolls = await this.getPayrollsByMonthYear(month, year)
      const results = []

      for (const payroll of payrolls) {
        // Obtener asistencias del empleado para el período
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        const startDateStr = startDate.toISOString().split("T")[0]
        const endDateStr = endDate.toISOString().split("T")[0]

        const attendances = await dbService.getAttendancesByDateRange(payroll.employeeId, startDateStr, endDateStr)

        // Recalcular ajustes
        const updatedPayroll = await this.calculatePayrollAdjustments(payroll.id, attendances)
        results.push(updatedPayroll)
      }

      return results
    } catch (error) {
      console.error("Error al recalcular nóminas:", error)
      throw new Error("Error al recalcular nóminas")
    }
  }

  async generatePayrollReport(month: number, year: number) {
    try {
      // Obtener todas las nóminas del período
      const payrolls = await this.getPayrollsByMonthYear(month, year)

      // Calcular totales
      const totalHandSalary = payrolls.reduce((sum, p) => sum + p.finalHandSalary, 0)
      const totalBankSalary = payrolls.reduce((sum, p) => sum + p.bankSalary, 0)
      const totalSalary = payrolls.reduce((sum, p) => sum + p.totalSalary, 0)
      const totalDeductions = payrolls.reduce((sum, p) => sum + p.deductions, 0)
      const totalAdditions = payrolls.reduce((sum, p) => sum + p.additions, 0)
      const totalAttendanceBonus = payrolls.reduce((sum, p) => sum + (p.attendanceBonus || 0), 0)

      // Agrupar por local
      const byLocation = {}
      for (const payroll of payrolls) {
        const employee = await dbService.getEmployeeById(payroll.employeeId)
        if (employee) {
          const location = employee.local || "Sin asignar"
          if (!byLocation[location]) {
            byLocation[location] = {
              count: 0,
              totalSalary: 0,
              employees: [],
            }
          }
          byLocation[location].count++
          byLocation[location].totalSalary += payroll.totalSalary
          byLocation[location].employees.push({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            salary: payroll.totalSalary,
          })
        }
      }

      return {
        period: {
          month,
          year,
        },
        summary: {
          totalEmployees: payrolls.length,
          totalHandSalary,
          totalBankSalary,
          totalSalary,
          totalDeductions,
          totalAdditions,
          totalAttendanceBonus,
          averageSalary: payrolls.length > 0 ? totalSalary / payrolls.length : 0,
        },
        byLocation,
        payrolls: payrolls.map((p) => ({
          id: p.id,
          employeeId: p.employeeId,
          totalSalary: p.totalSalary,
          isPaid: p.isPaid,
        })),
      }
    } catch (error) {
      console.error("Error al generar reporte de nóminas:", error)
      throw new Error("Error al generar reporte de nóminas")
    }
  }

  async applyBulkAttendanceBonus(employeeIds: string[], month: number, year: number, bonusAmount: number) {
    try {
      const results = []

      for (const employeeId of employeeIds) {
        // Obtener la nómina del empleado para el período
        const payrolls = await dbService.getPayrollsByEmployeeAndPeriod(employeeId, month, year)

        if (payrolls.length === 0) {
          console.log(`No se encontró nómina para el empleado ${employeeId} en ${month}/${year}`)
          continue
        }

        const payroll = payrolls[0]

        // Actualizar el bono de presentismo
        const updateData = {
          hasAttendanceBonus: true,
          attendanceBonus: bonusAmount,
          // Recalcular totales
          finalHandSalary: payroll.handSalary - payroll.deductions + payroll.additions + bonusAmount,
          totalSalary: payroll.baseSalary - payroll.deductions + payroll.additions + bonusAmount,
        }

        const updatedPayroll = await dbService.updatePayroll(payroll.id, updateData)
        results.push(updatedPayroll)
      }

      return results
    } catch (error) {
      console.error("Error al aplicar bono de presentismo masivo:", error)
      throw new Error("Error al aplicar bono de presentismo masivo")
    }
  }

  async removeBulkAttendanceBonus(employeeIds: string[], month: number, year: number) {
    try {
      const results = []

      for (const employeeId of employeeIds) {
        // Obtener la nómina del empleado para el período
        const payrolls = await dbService.getPayrollsByEmployeeAndPeriod(employeeId, month, year)

        if (payrolls.length === 0) {
          console.log(`No se encontró nómina para el empleado ${employeeId} en ${month}/${year}`)
          continue
        }

        const payroll = payrolls[0]

        // Quitar el bono de presentismo
        const updateData = {
          hasAttendanceBonus: false,
          attendanceBonus: 0,
          // Recalcular totales
          finalHandSalary: payroll.handSalary - payroll.deductions + payroll.additions,
          totalSalary: payroll.baseSalary - payroll.deductions + payroll.additions,
        }

        const updatedPayroll = await dbService.updatePayroll(payroll.id, updateData)
        results.push(updatedPayroll)
      }

      return results
    } catch (error) {
      console.error("Error al quitar bono de presentismo masivo:", error)
      throw new Error("Error al quitar bono de presentismo masivo")
    }
  }

  async bulkUpdatePayrollStatus(payrollIds: string[], status: "paid" | "hand_paid" | "bank_paid") {
    try {
      const results = []

      for (const payrollId of payrollIds) {
        let field = ""
        if (status === "paid") field = "is_paid"
        else if (status === "hand_paid") field = "is_paid_hand"
        else if (status === "bank_paid") field = "is_paid_bank"
        else throw new Error("Estado de pago inválido")

        const updatedPayroll = await this.updatePayrollStatus(payrollId, field, true)
        results.push(updatedPayroll)
      }

      return results
    } catch (error) {
      console.error("Error al actualizar estado de nóminas masivamente:", error)
      throw new Error("Error al actualizar estado de nóminas masivamente")
    }
  }

  async getPayrollStatistics(year: number) {
    try {
      const statistics = {
        byMonth: [] as any[],
        totalAnnual: 0,
        averageMonthly: 0,
        employeeCount: 0,
        topPaidEmployees: [] as any[],
      }

      // Obtener estadísticas por mes
      for (let month = 1; month <= 12; month++) {
        const payrolls = await this.getPayrollsByMonthYear(month, year)
        const totalAmount = payrolls.reduce((sum, p) => sum + p.totalSalary, 0)

        statistics.byMonth.push({
          month,
          employeeCount: payrolls.length,
          totalAmount,
          averageSalary: payrolls.length > 0 ? totalAmount / payrolls.length : 0,
        })

        statistics.totalAnnual += totalAmount
      }

      // Calcular promedio mensual
      statistics.averageMonthly = statistics.totalAnnual / 12

      // Obtener empleados con mayor salario (promedio anual)
      const employees = await dbService.getEmployees()
      statistics.employeeCount = employees.length

      const employeeSalaries = [] as any[]

      for (const employee of employees) {
        const payrolls = await this.getPayrollsByEmployeeId(employee.id)
        const yearPayrolls = payrolls.filter((p) => p.year === year)

        if (yearPayrolls.length > 0) {
          const totalSalary = yearPayrolls.reduce((sum, p) => sum + p.totalSalary, 0)
          const averageSalary = totalSalary / yearPayrolls.length

          employeeSalaries.push({
            employeeId: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            averageSalary,
            payrollCount: yearPayrolls.length,
          })
        }
      }

      // Ordenar por salario promedio y tomar los 5 primeros
      statistics.topPaidEmployees = employeeSalaries.sort((a, b) => b.averageSalary - a.averageSalary).slice(0, 5)

      return statistics
    } catch (error) {
      console.error("Error al obtener estadísticas de nóminas:", error)
      throw new Error("Error al obtener estadísticas de nóminas")
    }
  }

  async exportPayrollsToCSV(month: number, year: number) {
    try {
      const payrolls = await this.getPayrollsByMonthYear(month, year)
      let csvContent =
        "ID,Empleado,Mes,Año,Salario Base,Salario Banco,Salario Mano,Deducciones,Adiciones,Bono Presentismo,Salario Final Mano,Total,Estado\n"

      for (const payroll of payrolls) {
        const employee = await dbService.getEmployeeById(payroll.employeeId)
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"

        const status = payroll.isPaid
          ? "Pagado"
          : payroll.handSalaryPaid && payroll.bankSalaryPaid
            ? "Pagado"
            : payroll.handSalaryPaid
              ? "Mano Pagado"
              : payroll.bankSalaryPaid
                ? "Banco Pagado"
                : "Pendiente"

        csvContent += `${payroll.id},${employeeName},${payroll.month},${payroll.year},${payroll.baseSalary},${payroll.bankSalary},${payroll.handSalary},${payroll.deductions},${payroll.additions},${payroll.attendanceBonus || 0},${payroll.finalHandSalary},${payroll.totalSalary},${status}\n`
      }

      return csvContent
    } catch (error) {
      console.error("Error al exportar nóminas a CSV:", error)
      throw new Error("Error al exportar nóminas a CSV")
    }
  }
}

// Exportar una instancia del servicio para uso en la aplicación
export const payrollService = new PayrollService()
