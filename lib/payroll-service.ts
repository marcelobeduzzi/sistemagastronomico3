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
        const allPayrolls = await dbService.getPayrollsByPeriod(month, year, false)
        const existingPayrolls = allPayrolls.filter((p) => p.employeeId === employeeId || p.employee_id === employeeId)

        if (existingPayrolls.length > 0) {
          console.log(`La nómina para el empleado ${employeeId} en ${month}/${year} ya existe`)
          results.push(existingPayrolls[0])
          continue
        }

        // Calcular los valores de la nómina
        // Asegurarse de manejar tanto camelCase como snake_case
        const baseSalary = Number.parseFloat(employee.baseSalary || employee.base_salary || "0")
        const handSalary = Number.parseFloat(employee.handSalary || employee.hand_salary || "0")
        const bankSalary = Number.parseFloat(employee.bankSalary || employee.bank_salary || "0")

        // Calcular deducciones y adiciones (inicialmente en 0)
        const deductions = 0
        const additions = 0

        // Calcular bonificación por asistencia si aplica
        const hasAttendanceBonus = employee.hasAttendanceBonus || employee.has_attendance_bonus || false
        const attendanceBonus = hasAttendanceBonus
          ? Number.parseFloat(employee.attendanceBonus || employee.attendance_bonus || "0")
          : 0

        // Calcular salarios finales
        const finalHandSalary = handSalary - deductions + additions
        const totalSalary = baseSalary + bankSalary + attendanceBonus

        // Crear la nueva nómina usando dbService
        // Usamos los nombres de columnas correctos según la base de datos
        // NO incluimos is_paid ya que es una columna generada
        const newPayroll = {
          employee_id: employeeId,
          month,
          year,
          base_salary: baseSalary,
          bank_salary: bankSalary,
          hand_salary: handSalary,
          deductions,
          additions,
          final_hand_salary: finalHandSalary,
          total_salary: totalSalary,
          is_paid_hand: false,
          is_paid_bank: false,
          has_attendance_bonus: hasAttendanceBonus,
          attendance_bonus: attendanceBonus,
        }

        console.log("Creando nómina con datos:", newPayroll)
        const createdPayroll = await dbService.createPayroll(newPayroll)

        // Después de crear la nómina, calcular ajustes basados en asistencias
        if (createdPayroll) {
          try {
            // Calcular el rango de fechas para el mes
            const startDate = new Date(year, month - 1, 1)
            const endDate = new Date(year, month, 0)
            const startDateStr = startDate.toISOString().split("T")[0]
            const endDateStr = endDate.toISOString().split("T")[0]

            // Obtener asistencias
            const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)

            // Calcular ajustes basados en asistencias
            if (attendances && attendances.length > 0) {
              await this.calculatePayrollAdjustments(createdPayroll.id, attendances)
            }
          } catch (error) {
            console.error("Error al calcular ajustes de asistencia:", error)
          }
        }

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

      // No actualizamos is_paid directamente ya que es una columna generada
      if (field === "is_paid") {
        // Si queremos marcar como pagado, actualizamos tanto is_paid_hand como is_paid_bank
        const updateData = {
          is_paid_hand: value,
          is_paid_bank: value,
        }

        if (value) {
          updateData.hand_payment_date = new Date().toISOString()
          updateData.bank_payment_date = new Date().toISOString()
          updateData.payment_date = new Date().toISOString()
        }

        const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
        return updatedPayroll
      } else {
        // Usamos directamente el nombre del campo en snake_case
        const updateData: Record<string, any> = {
          [field]: value,
        }

        // Si estamos marcando como pagado, actualizar la fecha de pago correspondiente
        if (field === "is_paid_hand" && value) {
          updateData.hand_payment_date = new Date().toISOString()
        } else if (field === "is_paid_bank" && value) {
          updateData.bank_payment_date = new Date().toISOString()
        }

        // Usar dbService para actualizar la nómina
        const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
        return updatedPayroll
      }
    } catch (error) {
      console.error("Error al actualizar estado de nómina:", error)
      throw new Error("Error al actualizar estado de nómina")
    }
  }

  async updatePaymentDetails(payrollId: string, paymentMethod: string, paymentReference: string) {
    try {
      // Usar dbService para actualizar los detalles de pago
      // Usamos los nombres de columnas correctos según la base de datos
      const updateData = {
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_date: new Date().toISOString(),
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
      const employeeId = payroll.employeeId || payroll.employee_id
      const employee = await dbService.getEmployeeById(employeeId)
      if (!employee) {
        throw new Error("Empleado no encontrado")
      }

      // Calcular deducciones por ausencias y llegadas tarde
      let deductions = 0
      let additions = 0
      const details = []

      // Valor del minuto (basado en el salario base)
      const baseSalary = payroll.baseSalary || payroll.base_salary || 0
      const dailySalary = baseSalary / 30 // Salario diario
      const hourSalary = dailySalary / 8 // Salario por hora (asumiendo 8 horas por día)
      const minuteSalary = hourSalary / 60 // Salario por minuto

      console.log(`Calculando ajustes para nómina ${payrollId}. Valor del minuto: ${minuteSalary}`)

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
          console.log(`Ausencia injustificada el día ${attendance.date}. Deducción: ${absenceDeduction}`)
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
          console.log(
            `Llegada tarde el día ${attendance.date}: ${attendance.lateMinutes} minutos. Deducción: ${lateDeduction}`,
          )
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
          console.log(
            `Salida anticipada el día ${attendance.date}: ${attendance.earlyDepartureMinutes} minutos. Deducción: ${earlyDeduction}`,
          )
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
          console.log(
            `Horas extra el día ${attendance.date}: ${attendance.extraMinutes} minutos. Adición: ${extraAddition}`,
          )
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
          console.log(`Feriado trabajado el día ${attendance.date}. Adición: ${holidayAddition}`)
        }
      }

      // Redondear valores para evitar problemas de precisión
      deductions = Math.round(deductions * 100) / 100
      additions = Math.round(additions * 100) / 100

      console.log(`Total deducciones: ${deductions}, Total adiciones: ${additions}`)

      // Obtener valores actuales
      const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
      const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
      const attendanceBonus = Number(payroll.attendanceBonus || payroll.attendance_bonus || 0)

      console.log(
        `Valores actuales - Sueldo en mano: ${handSalary}, Sueldo banco: ${bankSalary}, Bono: ${attendanceBonus}`,
      )

      // Calcular sueldo final en mano (sueldo en mano - deducciones + adiciones)
      const finalHandSalary = handSalary - deductions + additions

      // Calcular total a pagar (sueldo base + sueldo banco + bono de presentismo)
      const totalSalary = baseSalary + bankSalary + attendanceBonus

      console.log(`Nuevos valores - Sueldo final en mano: ${finalHandSalary}, Total a pagar: ${totalSalary}`)

      // Actualizar la nómina
      const updateData = {
        deductions,
        additions,
        final_hand_salary: finalHandSalary,
        total_salary: totalSalary,
      }

      console.log("Actualizando nómina con ajustes:", updateData)

      // Actualizar la nómina
      const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)

      // Guardar los detalles en la tabla payroll_details
      if (details.length > 0) {
        try {
          // Eliminar detalles existentes si los hay
          await dbService.deletePayrollDetails(payrollId)

          // Insertar nuevos detalles
          for (const detail of details) {
            await dbService.createPayrollDetail({
              payroll_id: payrollId,
              concept: detail.concept,
              type: detail.type,
              amount: detail.amount,
              description: detail.description,
            })
          }
          console.log(`Guardados ${details.length} detalles para la nómina ${payrollId}`)
        } catch (error) {
          console.error("Error al guardar detalles de nómina:", error)
        }
      }

      return updatedPayroll
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

        const employeeId = payroll.employeeId || payroll.employee_id
        const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)

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
      const totalHandSalary = payrolls.reduce(
        (sum, p) => sum + Number(p.finalHandSalary || p.final_hand_salary || 0),
        0,
      )
      const totalBankSalary = payrolls.reduce((sum, p) => sum + Number(p.bankSalary || p.bank_salary || 0), 0)
      const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.totalSalary || p.total_salary || 0), 0)
      const totalDeductions = payrolls.reduce((sum, p) => sum + Number(p.deductions || 0), 0)
      const totalAdditions = payrolls.reduce((sum, p) => sum + Number(p.additions || 0), 0)
      const totalAttendanceBonus = payrolls.reduce(
        (sum, p) => sum + Number(p.attendanceBonus || p.attendance_bonus || 0),
        0,
      )

      // Agrupar por local
      const byLocation = {}
      for (const payroll of payrolls) {
        const employeeId = payroll.employeeId || payroll.employee_id
        const employee = await dbService.getEmployeeById(employeeId)
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
          byLocation[location].totalSalary += Number(payroll.totalSalary || payroll.total_salary || 0)
          byLocation[location].employees.push({
            id: employee.id,
            name: `${employee.firstName} ${employee.lastName}`,
            salary: Number(payroll.totalSalary || payroll.total_salary || 0),
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
          employeeId: p.employeeId || p.employee_id,
          totalSalary: Number(p.totalSalary || p.total_salary || 0),
          isPaid: p.isPaid || p.is_paid || false,
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
        const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
        const baseSalary = Number(payroll.baseSalary || payroll.base_salary || 0)
        const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
        const deductions = Number(payroll.deductions || 0)
        const additions = Number(payroll.additions || 0)

        // Actualizar el bono de presentismo
        const updateData = {
          has_attendance_bonus: true,
          attendance_bonus: bonusAmount,
          // Recalcular totales
          final_hand_salary: handSalary - deductions + additions,
          total_salary: baseSalary + bankSalary + bonusAmount,
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
        const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
        const baseSalary = Number(payroll.baseSalary || payroll.base_salary || 0)
        const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
        const deductions = Number(payroll.deductions || 0)
        const additions = Number(payroll.additions || 0)

        // Quitar el bono de presentismo
        const updateData = {
          has_attendance_bonus: false,
          attendance_bonus: 0,
          // Recalcular totales
          final_hand_salary: handSalary - deductions + additions,
          total_salary: baseSalary + bankSalary,
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
        const totalAmount = payrolls.reduce((sum, p) => sum + Number(p.totalSalary || p.total_salary || 0), 0)

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
          const totalSalary = yearPayrolls.reduce((sum, p) => sum + Number(p.totalSalary || p.total_salary || 0), 0)
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
        const employeeId = payroll.employeeId || payroll.employee_id
        const employee = await dbService.getEmployeeById(employeeId)
        const employeeName = employee ? `${employee.firstName} ${employee.lastName}` : "Desconocido"

        const isPaid = payroll.isPaid || payroll.is_paid || false
        const handSalaryPaid = payroll.handSalaryPaid || payroll.is_paid_hand || false
        const bankSalaryPaid = payroll.bankSalaryPaid || payroll.is_paid_bank || false

        const status = isPaid
          ? "Pagado"
          : handSalaryPaid && bankSalaryPaid
            ? "Pagado"
            : handSalaryPaid
              ? "Mano Pagado"
              : bankSalaryPaid
                ? "Banco Pagado"
                : "Pendiente"

        csvContent += `${payroll.id},${employeeName},${payroll.month},${payroll.year},${payroll.baseSalary || payroll.base_salary || 0},${payroll.bankSalary || payroll.bank_salary || 0},${payroll.handSalary || payroll.hand_salary || 0},${payroll.deductions || 0},${payroll.additions || 0},${payroll.attendanceBonus || payroll.attendance_bonus || 0},${payroll.finalHandSalary || payroll.final_hand_salary || 0},${payroll.totalSalary || payroll.total_salary || 0},${status}\n`
      }

      return csvContent
    } catch (error) {
      console.error("Error al exportar nóminas a CSV:", error)
      throw new Error("Error al exportar nóminas a CSV")
    }
  }

  async forceRegeneratePayrolls(employeeIds: string[], month: number, year: number) {
    try {
      console.log(`Forzando regeneración de nóminas para ${month}/${year}`)
      const results = []

      // Obtener todas las nóminas existentes para este período
      const existingPayrolls = await dbService.getPayrollsByPeriod(month, year, false)
      console.log(`Se encontraron ${existingPayrolls.length} nóminas existentes para el período ${month}/${year}`)

      // Para cada empleado
      for (const employeeId of employeeIds) {
        console.log(`Procesando empleado ID: ${employeeId}`)

        // Buscar si ya existe una nómina para este empleado
        const existingPayroll = existingPayrolls.find(
          (p) => p.employeeId === employeeId || p.employee_id === employeeId,
        )

        if (existingPayroll) {
          console.log(`Regenerando nómina existente para empleado ${employeeId}`)
          console.log(`Datos actuales de la nómina:`, JSON.stringify(existingPayroll, null, 2))

          // Obtener información del empleado
          const employee = await dbService.getEmployeeById(employeeId)
          console.log(`Datos del empleado:`, JSON.stringify(employee, null, 2))

          if (!employee) {
            console.error(`Empleado con ID ${employeeId} no encontrado`)
            continue
          }

          // Calcular los valores de la nómina
          const baseSalary = Number.parseFloat(employee.baseSalary || employee.base_salary || "0")
          const handSalary = Number.parseFloat(employee.handSalary || employee.hand_salary || "0")
          const bankSalary = Number.parseFloat(employee.bankSalary || employee.bank_salary || "0")

          console.log(`Valores base calculados - Base: ${baseSalary}, Mano: ${handSalary}, Banco: ${bankSalary}`)

          // Calcular bonificación por asistencia si aplica
          const hasAttendanceBonus = employee.hasAttendanceBonus || employee.has_attendance_bonus || false
          const attendanceBonus = hasAttendanceBonus
            ? Number.parseFloat(employee.attendanceBonus || employee.attendance_bonus || "0")
            : 0

          console.log(`Bono de presentismo: ${hasAttendanceBonus ? "Sí" : "No"}, Monto: ${attendanceBonus}`)

          // Calcular salarios finales (inicialmente sin deducciones/adiciones)
          const finalHandSalary = handSalary
          const totalSalary = baseSalary + bankSalary + attendanceBonus

          console.log(`Valores iniciales calculados - Final Mano: ${finalHandSalary}, Total: ${totalSalary}`)

          // Actualizar la nómina existente
          const updateData = {
            base_salary: baseSalary,
            bank_salary: bankSalary,
            hand_salary: handSalary,
            deductions: 0, // Resetear deducciones
            additions: 0, // Resetear adiciones
            final_hand_salary: finalHandSalary,
            total_salary: totalSalary,
            has_attendance_bonus: hasAttendanceBonus,
            attendance_bonus: attendanceBonus,
          }

          console.log("Actualizando nómina con datos:", JSON.stringify(updateData, null, 2))

          try {
            const updatedPayroll = await dbService.updatePayroll(existingPayroll.id, updateData)
            console.log("Nómina actualizada:", JSON.stringify(updatedPayroll, null, 2))
          } catch (error) {
            console.error("Error al actualizar nómina:", error)
          }

          // Eliminar detalles existentes
          try {
            await dbService.deletePayrollDetails(existingPayroll.id)
            console.log(`Detalles de nómina eliminados para ID: ${existingPayroll.id}`)
          } catch (error) {
            console.error("Error al eliminar detalles de nómina:", error)
          }

          // Recalcular ajustes basados en asistencias
          try {
            // Calcular el rango de fechas para el mes
            const startDate = new Date(year, month - 1, 1)
            const endDate = new Date(year, month, 0)
            const startDateStr = startDate.toISOString().split("T")[0]
            const endDateStr = endDate.toISOString().split("T")[0]

            console.log(`Buscando asistencias desde ${startDateStr} hasta ${endDateStr}`)

            // Obtener asistencias
            const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)
            console.log(`Se encontraron ${attendances.length} registros de asistencia`)

            if (attendances.length > 0) {
              console.log("Muestra de asistencias:", JSON.stringify(attendances.slice(0, 2), null, 2))
            }

            // Calcular ajustes basados en asistencias
            if (attendances && attendances.length > 0) {
              console.log(`Calculando ajustes para ${attendances.length} asistencias`)
              await this.calculatePayrollAdjustmentsDebug(existingPayroll.id, attendances)
              const updatedPayroll = await this.getPayrollById(existingPayroll.id)
              console.log("Nómina después de ajustes:", JSON.stringify(updatedPayroll, null, 2))
              results.push(updatedPayroll)
            } else {
              // Si no hay asistencias, agregar la nómina actualizada al resultado
              const updatedPayroll = await this.getPayrollById(existingPayroll.id)
              console.log("No hay asistencias, nómina final:", JSON.stringify(updatedPayroll, null, 2))
              results.push(updatedPayroll)
            }
          } catch (error) {
            console.error("Error al calcular ajustes de asistencia:", error)
            // Agregar la nómina actualizada al resultado incluso si hay error
            const updatedPayroll = await this.getPayrollById(existingPayroll.id)
            results.push(updatedPayroll)
          }
        } else {
          // Si no existe, generar una nueva nómina
          console.log(`No existe nómina para empleado ${employeeId}, generando nueva`)

          // Obtener información del empleado
          const employee = await dbService.getEmployeeById(employeeId)

          if (!employee) {
            console.error(`Empleado con ID ${employeeId} no encontrado`)
            continue
          }

          console.log(`Datos del empleado:`, JSON.stringify(employee, null, 2))

          // Calcular los valores de la nómina
          const baseSalary = Number.parseFloat(employee.baseSalary || employee.base_salary || "0")
          const handSalary = Number.parseFloat(employee.handSalary || employee.hand_salary || "0")
          const bankSalary = Number.parseFloat(employee.bankSalary || employee.bank_salary || "0")

          console.log(`Valores base calculados - Base: ${baseSalary}, Mano: ${handSalary}, Banco: ${bankSalary}`)

          // Calcular bonificación por asistencia si aplica
          const hasAttendanceBonus = employee.hasAttendanceBonus || employee.has_attendance_bonus || false
          const attendanceBonus = hasAttendanceBonus
            ? Number.parseFloat(employee.attendanceBonus || employee.attendance_bonus || "0")
            : 0

          // Calcular salarios finales
          const finalHandSalary = handSalary
          const totalSalary = baseSalary + bankSalary + attendanceBonus

          console.log(`Valores iniciales calculados - Final Mano: ${finalHandSalary}, Total: ${totalSalary}`)

          // Crear la nueva nómina
          const newPayroll = {
            employee_id: employeeId,
            month,
            year,
            base_salary: baseSalary,
            bank_salary: bankSalary,
            hand_salary: handSalary,
            deductions: 0,
            additions: 0,
            final_hand_salary: finalHandSalary,
            total_salary: totalSalary,
            is_paid_hand: false,
            is_paid_bank: false,
            has_attendance_bonus: hasAttendanceBonus,
            attendance_bonus: attendanceBonus,
          }

          console.log("Creando nómina con datos:", JSON.stringify(newPayroll, null, 2))

          let createdPayroll
          try {
            createdPayroll = await dbService.createPayroll(newPayroll)
            console.log("Nómina creada:", JSON.stringify(createdPayroll, null, 2))
          } catch (error) {
            console.error("Error al crear nómina:", error)
            continue
          }

          // Calcular ajustes basados en asistencias
          try {
            // Calcular el rango de fechas para el mes
            const startDate = new Date(year, month - 1, 1)
            const endDate = new Date(year, month, 0)
            const startDateStr = startDate.toISOString().split("T")[0]
            const endDateStr = endDate.toISOString().split("T")[0]

            console.log(`Buscando asistencias desde ${startDateStr} hasta ${endDateStr}`)

            // Obtener asistencias
            const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)
            console.log(`Se encontraron ${attendances.length} registros de asistencia`)

            // Calcular ajustes basados en asistencias
            if (attendances && attendances.length > 0) {
              console.log(`Calculando ajustes para ${attendances.length} asistencias`)
              await this.calculatePayrollAdjustmentsDebug(createdPayroll.id, attendances)
              const updatedPayroll = await this.getPayrollById(createdPayroll.id)
              console.log("Nómina después de ajustes:", JSON.stringify(updatedPayroll, null, 2))
              results.push(updatedPayroll)
            } else {
              console.log("No hay asistencias, nómina final:", JSON.stringify(createdPayroll, null, 2))
              results.push(createdPayroll)
            }
          } catch (error) {
            console.error("Error al calcular ajustes de asistencia:", error)
            results.push(createdPayroll)
          }
        }
      }

      return results
    } catch (error) {
      console.error("Error al regenerar nóminas:", error)
      throw new Error("Error al regenerar nóminas")
    }
  }

  // Añadir un nuevo método de diagnóstico para el cálculo de ajustes
  async calculatePayrollAdjustmentsDebug(payrollId: string, attendances: any[]) {
    try {
      console.log(`INICIO: Calculando ajustes para nómina ID: ${payrollId}`)

      // Obtener la nómina actual
      const payroll = await this.getPayrollById(payrollId)
      if (!payroll) {
        throw new Error("Nómina no encontrada")
      }

      console.log("Datos de la nómina antes de ajustes:", JSON.stringify(payroll, null, 2))

      // Obtener información del empleado
      const employeeId = payroll.employeeId || payroll.employee_id
      const employee = await dbService.getEmployeeById(employeeId)
      if (!employee) {
        throw new Error("Empleado no encontrado")
      }

      console.log("Datos del empleado:", JSON.stringify(employee, null, 2))

      // Calcular deducciones por ausencias y llegadas tarde
      let deductions = 0
      let additions = 0
      const details = []

      // Valor del minuto (basado en el salario base)
      const baseSalary = Number.parseFloat(payroll.baseSalary || payroll.base_salary || "0")
      const dailySalary = baseSalary / 30 // Salario diario
      const hourSalary = dailySalary / 8 // Salario por hora (asumiendo 8 horas por día)
      const minuteSalary = hourSalary / 60 // Salario por minuto

      console.log(
        `Valores para cálculos - Salario base: ${baseSalary}, Diario: ${dailySalary}, Hora: ${hourSalary}, Minuto: ${minuteSalary}`,
      )

      // Procesar cada asistencia
      console.log(`Procesando ${attendances.length} registros de asistencia`)

      for (const attendance of attendances) {
        console.log(`Procesando asistencia del día ${attendance.date}:`, JSON.stringify(attendance, null, 2))

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
          console.log(`Ausencia injustificada el día ${attendance.date}. Deducción: ${absenceDeduction}`)
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
          console.log(
            `Llegada tarde el día ${attendance.date}: ${attendance.lateMinutes} minutos. Deducción: ${lateDeduction}`,
          )
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
          console.log(
            `Salida anticipada el día ${attendance.date}: ${attendance.earlyDepartureMinutes} minutos. Deducción: ${earlyDeduction}`,
          )
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
          console.log(
            `Horas extra el día ${attendance.date}: ${attendance.extraMinutes} minutos. Adición: ${extraAddition}`,
          )
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
          console.log(`Feriado trabajado el día ${attendance.date}. Adición: ${holidayAddition}`)
        }
      }

      // Redondear valores para evitar problemas de precisión
      deductions = Math.round(deductions * 100) / 100
      additions = Math.round(additions * 100) / 100

      console.log(`RESUMEN - Total deducciones: ${deductions}, Total adiciones: ${additions}`)

      // Obtener valores actuales
      const handSalary = Number.parseFloat(payroll.handSalary || payroll.hand_salary || "0")
      const bankSalary = Number.parseFloat(payroll.bankSalary || payroll.bank_salary || "0")
      const attendanceBonus = Number.parseFloat(payroll.attendanceBonus || payroll.attendance_bonus || "0")

      console.log(
        `Valores actuales - Sueldo en mano: ${handSalary}, Sueldo banco: ${bankSalary}, Bono: ${attendanceBonus}`,
      )

      // Calcular sueldo final en mano (sueldo en mano - deducciones + adiciones)
      const finalHandSalary = handSalary - deductions + additions

      // Calcular total a pagar (sueldo base + sueldo banco + bono de presentismo)
      const totalSalary = baseSalary + bankSalary + attendanceBonus

      console.log(`Nuevos valores calculados - Sueldo final en mano: ${finalHandSalary}, Total a pagar: ${totalSalary}`)

      // Actualizar la nómina
      const updateData = {
        deductions,
        additions,
        final_hand_salary: finalHandSalary,
        total_salary: totalSalary,
      }

      console.log("Actualizando nómina con ajustes:", JSON.stringify(updateData, null, 2))

      // Actualizar la nómina
      try {
        const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
        console.log("Nómina actualizada con ajustes:", JSON.stringify(updatedPayroll, null, 2))
      } catch (error) {
        console.error("Error al actualizar nómina con ajustes:", error)
        throw error
      }

      // Guardar los detalles en la tabla payroll_details
      if (details.length > 0) {
        try {
          // Eliminar detalles existentes si los hay
          await dbService.deletePayrollDetails(payrollId)
          console.log(`Detalles de nómina eliminados para ID: ${payrollId}`)

          // Insertar nuevos detalles
          console.log(`Guardando ${details.length} detalles para la nómina ${payrollId}`)

          for (const detail of details) {
            console.log("Guardando detalle:", JSON.stringify(detail, null, 2))

            try {
              await dbService.createPayrollDetail({
                payroll_id: payrollId,
                concept: detail.concept,
                type: detail.type,
                amount: detail.amount,
                description: detail.description,
              })
            } catch (detailError) {
              console.error("Error al guardar detalle:", detailError)
            }
          }

          console.log(`Guardados ${details.length} detalles para la nómina ${payrollId}`)
        } catch (error) {
          console.error("Error al guardar detalles de nómina:", error)
        }
      } else {
        console.log("No hay detalles para guardar")
      }

      console.log(`FIN: Cálculo de ajustes para nómina ID: ${payrollId}`)
      return await this.getPayrollById(payrollId)
    } catch (error) {
      console.error("Error al calcular ajustes de nómina:", error)
      throw new Error("Error al calcular ajustes de nómina")
    }
  }
}
