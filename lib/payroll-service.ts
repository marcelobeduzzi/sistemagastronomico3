// Importar los servicios necesarios
import { dbService } from "@/lib/db-service"

// Clase PayrollService
export class PayrollService {
  // Método para obtener una nómina por su ID
  async getPayrollById(payrollId: string) {
    try {
      return await dbService.getPayrollById(payrollId)
    } catch (error) {
      console.error(`Error al obtener nómina con ID ${payrollId}:`, error)
      throw new Error(`Error al obtener nómina con ID ${payrollId}`)
    }
  }

  async getPayrollsByPeriod(month: number, year: number, isPaid = false) {
    try {
      return await dbService.getPayrollsByPeriod(month, year, isPaid)
    } catch (error) {
      console.error(`Error al obtener nóminas para el período ${month}/${year}:`, error)
      throw new Error(`Error al obtener nóminas para el período ${month}/${year}`)
    }
  }

  async getPayrollsByEmployeeId(employeeId: string) {
    try {
      return await dbService.getPayrollsByEmployeeId(employeeId)
    } catch (error) {
      console.error(`Error al obtener nóminas para el empleado ${employeeId}:`, error)
      throw new Error(`Error al obtener nóminas para el empleado ${employeeId}`)
    }
  }

  /**
   * Calcula deducciones y adiciones basadas en asistencias.
   * Esta función es interna y no modifica la base de datos.
   */
  private calculateAdjustmentsFromAttendances(attendances: any[], baseSalary: number) {
    console.log("Calculando ajustes a partir de asistencias")

    // Inspeccionar los datos de asistencia
    console.log("DATOS DE ASISTENCIA RECIBIDOS:", JSON.stringify(attendances.slice(0, 3), null, 2))
    console.log(
      "Campos disponibles en el primer registro:",
      attendances.length > 0 ? Object.keys(attendances[0]) : "No hay registros",
    )

    let deductions = 0
    let additions = 0
    const details = []

    // Valor del minuto (basado en el salario base)
    const dailySalary = baseSalary / 30 // Salario diario
    const hourSalary = dailySalary / 8 // Salario por hora (asumiendo 8 horas por día)
    const minuteSalary = hourSalary / 60 // Salario por minuto

    console.log(`Valores para cálculos - Diario: ${dailySalary}, Hora: ${hourSalary}, Minuto: ${minuteSalary}`)

    // Procesar cada asistencia
    for (const attendance of attendances) {
      console.log(`Procesando asistencia del día ${attendance.date}`)

      // Ausencias injustificadas
      if (attendance.isAbsent && !attendance.isJustified && !attendance.isHoliday) {
        const absenceDeduction = dailySalary
        deductions += absenceDeduction
        details.push({
          concept: "Ausencia Injustificada",
          type: "deduction",
          amount: absenceDeduction,
          notes: `Ausencia el día ${attendance.date}`,
          date: attendance.date,
        })
        console.log(`Ausencia injustificada. Deducción: ${absenceDeduction}`)
      }

      // Llegadas tarde
      if (attendance.lateMinutes > 0) {
        const lateDeduction = minuteSalary * attendance.lateMinutes
        deductions += lateDeduction
        details.push({
          concept: "Llegada Tarde",
          type: "deduction",
          amount: lateDeduction,
          notes: `${attendance.lateMinutes} minutos tarde el día ${attendance.date}`,
          date: attendance.date,
        })
        console.log(`Llegada tarde: ${attendance.lateMinutes} min. Deducción: ${lateDeduction}`)
      }

      // Salidas anticipadas
      if (attendance.earlyDepartureMinutes > 0) {
        const earlyDeduction = minuteSalary * attendance.earlyDepartureMinutes
        deductions += earlyDeduction
        details.push({
          concept: "Salida Anticipada",
          type: "deduction",
          amount: earlyDeduction,
          notes: `${attendance.earlyDepartureMinutes} minutos antes el día ${attendance.date}`,
          date: attendance.date,
        })
        console.log(`Salida anticipada: ${attendance.earlyDepartureMinutes} min. Deducción: ${earlyDeduction}`)
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
          notes: `${attendance.extraMinutes} minutos extra el día ${attendance.date}`,
          date: attendance.date,
        })
        console.log(`Horas extra: ${attendance.extraMinutes} min. Adición: ${extraAddition}`)
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
          notes: `Trabajo en día feriado ${attendance.date}`,
          date: attendance.date,
        })
        console.log(`Feriado trabajado. Adición: ${holidayAddition}`)
      }
    }

    // IMPORTANTE: Asegurarse de que los valores sean números y estén redondeados
    deductions = Number(Math.round(deductions * 100) / 100)
    additions = Number(Math.round(additions * 100) / 100)

    console.log(
      `RESUMEN - Total deducciones: ${deductions}, Total adiciones: ${additions}, Detalles: ${details.length}`,
    )

    return { deductions, additions, details }
  }

  /**
   * Genera nóminas para los empleados especificados en un período determinado.
   * Esta función integrada realiza todos los cálculos necesarios en un solo paso.
   */
  async generatePayrolls(employeeIds: string[], month: number, year: number) {
    try {
      console.log(`Generando nóminas para ${employeeIds.length} empleados en período ${month}/${year}`)
      const results = []

      for (const employeeId of employeeIds) {
        // Obtener información del empleado
        const employee = await dbService.getEmployeeById(employeeId)

        if (!employee) {
          console.error(`Empleado con ID ${employeeId} no encontrado`)
          continue
        }

        console.log(`Procesando empleado: ${employee.firstName} ${employee.lastName} (ID: ${employeeId})`)

        // Verificar si ya existe una nómina para este empleado en el mes/año especificado
        const allPayrolls = await dbService.getPayrollsByPeriod(month, year, false)
        const existingPayrolls = allPayrolls.filter((p) => p.employeeId === employeeId || p.employee_id === employeeId)

        if (existingPayrolls.length > 0) {
          console.log(`La nómina para el empleado ${employeeId} en ${month}/${year} ya existe`)
          results.push(existingPayrolls[0])
          continue
        }

        // Calcular el rango de fechas para el mes
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        const startDateStr = startDate.toISOString().split("T")[0]
        const endDateStr = endDate.toISOString().split("T")[0]

        console.log(`Obteniendo asistencias desde ${startDateStr} hasta ${endDateStr}`)

        // Obtener asistencias del empleado para el período
        const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)
        console.log(`Se encontraron ${attendances.length} registros de asistencia`)

        // Calcular los valores base de la nómina
        const baseSalary = Number(employee.baseSalary || employee.base_salary || 0)
        const bankSalary = Number(employee.bankSalary || employee.bank_salary || 0)
        let handSalary = Number(employee.handSalary || employee.hand_salary || 0)

        // REGLA: Si no hay salario en mano ni en banco, el salario base se convierte en salario en mano
        if (handSalary === 0 && bankSalary === 0 && baseSalary > 0) {
          handSalary = baseSalary
          console.log(`Aplicando regla: Sueldo Base (${baseSalary}) se convierte en Sueldo en Mano`)
        }

        // Calcular bonificación por asistencia si aplica
        const hasAttendanceBonus = Boolean(employee.hasAttendanceBonus || employee.has_attendance_bonus || false)
        const attendanceBonus = hasAttendanceBonus
          ? Number(employee.attendanceBonus || employee.attendance_bonus || 0)
          : 0

        console.log(
          `Valores base: Salario Base=${baseSalary}, Banco=${bankSalary}, Mano=${handSalary}, Bono=${attendanceBonus}`,
        )

        // Calcular deducciones y adiciones basadas en asistencias
        const { deductions, additions, details } = this.calculateAdjustmentsFromAttendances(attendances, baseSalary)

        console.log(
          `Cálculos realizados: Deducciones=${deductions}, Adiciones=${additions}, Detalles=${details.length}`,
        )

        // Calcular salarios finales
        const finalHandSalary = handSalary - deductions + additions
        const totalSalary = bankSalary + finalHandSalary + (hasAttendanceBonus ? attendanceBonus : 0)

        console.log(`Valores finales: Final Mano=${finalHandSalary}, Total=${totalSalary}`)

        // Crear la nueva nómina con TODOS los valores ya calculados
        const payrollData = {
          employee_id: employeeId,
          month,
          year,
          base_salary: baseSalary,
          bank_salary: bankSalary,
          hand_salary: handSalary,
          deductions: Number(deductions), // Asegurar que sea número
          additions: Number(additions), // Asegurar que sea número
          final_hand_salary: finalHandSalary,
          total_salary: totalSalary,
          is_paid_hand: false,
          is_paid_bank: false,
          has_attendance_bonus: hasAttendanceBonus,
          attendance_bonus: attendanceBonus,
        }

        console.log("Creando nómina con datos completos:", payrollData)

        // Crear la nómina en la base de datos
        const createdPayroll = await dbService.createPayroll(payrollData)
        console.log(`Nómina creada con ID: ${createdPayroll.id}`)

        // Guardar los detalles de la nómina
        if (details.length > 0) {
          console.log(`Guardando ${details.length} detalles para la nómina`)

          for (const detail of details) {
            try {
              await dbService.createPayrollDetail({
                payroll_id: createdPayroll.id,
                concept: detail.concept,
                type: detail.type,
                amount: Number(detail.amount), // Asegurar que sea número
                date: detail.date,
                notes: detail.notes,
              })
            } catch (detailError) {
              console.error("Error al guardar detalle:", detailError)
            }
          }

          console.log("Detalles guardados correctamente")
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

  async updatePayroll(payrollId: string, updateData: Record<string, any>) {
    try {
      // IMPORTANTE: Asegurarse de que deductions y additions sean números
      if (updateData.deductions !== undefined) {
        updateData.deductions = Number(updateData.deductions)
      }
      if (updateData.additions !== undefined) {
        updateData.additions = Number(updateData.additions)
      }

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

  /**
   * Regenera nóminas para los empleados especificados en un período determinado.
   * Esta función integrada realiza todos los cálculos necesarios en un solo paso.
   */
  async forceRegeneratePayrolls(employeeIds: string[], month: number, year: number) {
    try {
      // Primero verificar la estructura de la tabla
      const tableStructure = await this.checkPayrollTableStructure()
      console.log("ESTRUCTURA DE LA TABLA PAYROLL:", tableStructure)

      // Continuar con el resto de la función...
      console.log(`Forzando regeneración de nóminas para ${employeeIds.length} empleados en período ${month}/${year}`)
      const results = []

      // Obtener todas las nóminas existentes para este período
      const existingPayrolls = await dbService.getPayrollsByPeriod(month, year, false)
      console.log(`Se encontraron ${existingPayrolls.length} nóminas existentes para el período ${month}/${year}`)

      for (const employeeId of employeeIds) {
        console.log(`Procesando empleado ID: ${employeeId}`)

        // Buscar si ya existe una nómina para este empleado
        const existingPayroll = existingPayrolls.find(
          (p) => p.employeeId === employeeId || p.employee_id === employeeId,
        )

        // Obtener información del empleado
        const employee = await dbService.getEmployeeById(employeeId)

        if (!employee) {
          console.error(`Empleado con ID ${employeeId} no encontrado`)
          continue
        }

        console.log(`Datos del empleado: ${employee.firstName} ${employee.lastName}`)

        // Calcular el rango de fechas para el mes
        const startDate = new Date(year, month - 1, 1)
        const endDate = new Date(year, month, 0)
        const startDateStr = startDate.toISOString().split("T")[0]
        const endDateStr = endDate.toISOString().split("T")[0]

        console.log(`Obteniendo asistencias desde ${startDateStr} hasta ${endDateStr}`)

        // Obtener asistencias del empleado para el período
        const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)
        console.log(`Se encontraron ${attendances.length} registros de asistencia`)

        // Verificar si hay asistencias con datos relevantes para cálculos
        if (attendances.length > 0) {
          const hasLateMinutes = attendances.some((a) => a.lateMinutes > 0)
          const hasEarlyDepartures = attendances.some((a) => a.earlyDepartureMinutes > 0)
          const hasExtraMinutes = attendances.some((a) => a.extraMinutes > 0)
          const hasAbsences = attendances.some((a) => a.isAbsent && !a.isJustified)
          const hasHolidays = attendances.some((a) => a.isHoliday && !a.isAbsent)

          console.log(`ANÁLISIS DE ASISTENCIAS: 
            - Registros con llegadas tarde: ${hasLateMinutes}
            - Registros con salidas anticipadas: ${hasEarlyDepartures}
            - Registros con horas extra: ${hasExtraMinutes}
            - Registros con ausencias injustificadas: ${hasAbsences}
            - Registros con feriados trabajados: ${hasHolidays}
          `)
        }

        // Calcular los valores base de la nómina
        const baseSalary = Number(employee.baseSalary || employee.base_salary || 0)
        const bankSalary = Number(employee.bankSalary || employee.bank_salary || 0)
        let handSalary = Number(employee.handSalary || employee.hand_salary || 0)

        // REGLA: Si no hay salario en mano ni en banco, el salario base se convierte en salario en mano
        if (handSalary === 0 && bankSalary === 0 && baseSalary > 0) {
          handSalary = baseSalary
          console.log(`Aplicando regla: Sueldo Base (${baseSalary}) se convierte en Sueldo en Mano`)
        }

        // Calcular bonificación por asistencia si aplica
        const hasAttendanceBonus = Boolean(employee.hasAttendanceBonus || employee.has_attendance_bonus || false)
        const attendanceBonus = hasAttendanceBonus
          ? Number(employee.attendanceBonus || employee.attendance_bonus || 0)
          : 0

        console.log(
          `Valores base: Salario Base=${baseSalary}, Banco=${bankSalary}, Mano=${handSalary}, Bono=${attendanceBonus}`,
        )

        // Calcular deducciones y adiciones basadas en asistencias
        const { deductions, additions, details } = this.calculateAdjustmentsFromAttendances(attendances, baseSalary)

        console.log(
          `Cálculos realizados: Deducciones=${deductions}, Adiciones=${additions}, Detalles=${details.length}`,
        )

        // Calcular salarios finales
        const finalHandSalary = handSalary - deductions + additions
        const totalSalary = bankSalary + finalHandSalary + (hasAttendanceBonus ? attendanceBonus : 0)

        console.log(`Valores finales: Final Mano=${finalHandSalary}, Total=${totalSalary}`)

        // Preparar los datos de la nómina
        const payrollData = {
          employee_id: employeeId,
          month,
          year,
          base_salary: baseSalary,
          bank_salary: bankSalary,
          hand_salary: handSalary,
          deductions: Number(deductions), // Asegurar que sea número
          additions: Number(additions), // Asegurar que sea número
          final_hand_salary: finalHandSalary,
          total_salary: totalSalary,
          is_paid_hand: existingPayroll ? existingPayroll.is_paid_hand || false : false,
          is_paid_bank: existingPayroll ? existingPayroll.is_paid_bank || false : false,
          has_attendance_bonus: hasAttendanceBonus,
          attendance_bonus: attendanceBonus,
        }

        // Verificar que los valores de deducciones y adiciones estén presentes
        console.log(`VERIFICACIÓN DE DATOS A GUARDAR:
  - Deducciones: ${deductions} (tipo: ${typeof deductions})
  - Adiciones: ${additions} (tipo: ${typeof additions})
  - Datos completos: ${JSON.stringify(payrollData, null, 2)}
`)

        let payrollId: string

        if (existingPayroll) {
          console.log(`Actualizando nómina existente con ID: ${existingPayroll.id}`)
          console.log(`Datos actuales de la nómina:`, JSON.stringify(existingPayroll, null, 2))

          // Actualizar la nómina existente
          await dbService.updatePayroll(existingPayroll.id, payrollData)
          payrollId = existingPayroll.id

          // Eliminar detalles existentes
          await dbService.deletePayrollDetails(existingPayroll.id)
          console.log(`Detalles anteriores eliminados para nómina ${existingPayroll.id}`)
        } else {
          console.log(`Creando nueva nómina para empleado ${employeeId}`)

          // Crear nueva nómina
          const createdPayroll = await dbService.createPayroll(payrollData)
          payrollId = createdPayroll.id

          console.log(`Nueva nómina creada con ID: ${payrollId}`)
        }

        // Verificar que la nómina se haya guardado correctamente
        const payrollAfterSave = await this.getPayrollById(payrollId)
        console.log(`NÓMINA DESPUÉS DE GUARDAR:
  - ID: ${payrollId}
  - Deducciones: ${payrollAfterSave.deductions || payrollAfterSave.deductions === 0 ? payrollAfterSave.deductions : "NO PRESENTE"}
  - Adiciones: ${payrollAfterSave.additions || payrollAfterSave.additions === 0 ? payrollAfterSave.additions : "NO PRESENTE"}
`)

        // Guardar los detalles de la nómina
        if (details.length > 0) {
          console.log(`Guardando ${details.length} detalles para la nómina ${payrollId}`)

          for (const detail of details) {
            try {
              await dbService.createPayrollDetail({
                payroll_id: payrollId,
                concept: detail.concept,
                type: detail.type,
                amount: Number(detail.amount), // Asegurar que sea número
                date: detail.date,
                notes: detail.notes,
              })
            } catch (detailError) {
              console.error("Error al guardar detalle:", detailError)
            }
          }

          console.log("Detalles guardados correctamente")
        }

        // Obtener la nómina actualizada para devolverla
        const updatedPayroll = await this.getPayrollById(payrollId)
        results.push(updatedPayroll)
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

      // Calcular deducciones y adiciones
      const baseSalary = Number(payroll.baseSalary || payroll.base_salary || 0)
      const { deductions, additions, details } = this.calculateAdjustmentsFromAttendances(attendances, baseSalary)

      // Obtener valores actuales
      const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
      const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
      const attendanceBonus = Number(payroll.attendanceBonus || payroll.attendance_bonus || 0)
      const hasAttendanceBonus = Boolean(payroll.hasAttendanceBonus || payroll.has_attendance_bonus || false)

      console.log(
        `Valores actuales - Sueldo en mano: ${handSalary}, Sueldo banco: ${bankSalary}, Bono: ${attendanceBonus}`,
      )

      // Calcular sueldo final en mano (sueldo en mano - deducciones + adiciones)
      const finalHandSalary = handSalary - deductions + additions

      // Calcular total a pagar (sueldo en banco + sueldo final en mano + bono de presentismo)
      const totalSalary = bankSalary + finalHandSalary + (hasAttendanceBonus ? attendanceBonus : 0)

      console.log(`Nuevos valores calculados - Sueldo final en mano: ${finalHandSalary}, Total a pagar: ${totalSalary}`)

      // Actualizar la nómina
      const updateData = {
        deductions: Number(deductions), // Asegurar que sea número
        additions: Number(additions), // Asegurar que sea número
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
                amount: Number(detail.amount), // Asegurar que sea número
                date: detail.date,
                notes: detail.notes,
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

  // FUNCIÓN MEJORADA: calculatePayrollAdjustments con más logging y mejor manejo de errores
  async calculatePayrollAdjustments(payrollId: string, attendances: any[]) {
    try {
      console.log(`Iniciando cálculo de ajustes para nómina ID: ${payrollId} con ${attendances.length} asistencias`)

      // Obtener la nómina actual
      const payroll = await this.getPayrollById(payrollId)
      if (!payroll) {
        console.error(`No se encontró la nómina con ID: ${payrollId}`)
        throw new Error("Nómina no encontrada")
      }

      console.log(`Nómina encontrada:`, JSON.stringify(payroll, null, 2))

      // Obtener información del empleado
      const employeeId = payroll.employeeId || payroll.employee_id
      const employee = await dbService.getEmployeeById(employeeId)
      if (!employee) {
        console.error(`No se encontró el empleado con ID: ${employeeId}`)
        throw new Error("Empleado no encontrado")
      }

      console.log(`Empleado encontrado: ${employee.firstName} ${employee.lastName}`)

      // Calcular deducciones y adiciones
      const baseSalary = Number(payroll.baseSalary || payroll.base_salary || 0)
      const { deductions, additions, details } = this.calculateAdjustmentsFromAttendances(attendances, baseSalary)

      // Obtener valores actuales
      const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
      const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
      const attendanceBonus = Number(payroll.attendanceBonus || payroll.attendance_bonus || 0)
      const hasAttendanceBonus = Boolean(payroll.hasAttendanceBonus || payroll.has_attendance_bonus || false)

      // Calcular sueldo final en mano (sueldo en mano - deducciones + adiciones)
      const finalHandSalary = handSalary - deductions + additions

      // Calcular total a pagar (sueldo en banco + sueldo final en mano + bono de presentismo)
      const totalSalary = bankSalary + finalHandSalary + (hasAttendanceBonus ? attendanceBonus : 0)

      console.log(`Valores calculados - Final Mano: ${finalHandSalary}, Total: ${totalSalary}`)

      // Actualizar la nómina
      const updateData = {
        deductions: Number(deductions), // Asegurar que sea número
        additions: Number(additions), // Asegurar que sea número
        final_hand_salary: finalHandSalary,
        total_salary: totalSalary,
      }

      // Asegurarse de que los valores sean numéricos
      Object.keys(updateData).forEach((key) => {
        if (typeof updateData[key] === "number") {
          // Convertir a string y luego a número para asegurar que se guarde como numérico
          updateData[key] = Number(updateData[key].toString())
          console.log(`Campo ${key} convertido a número: ${updateData[key]}`)
        }
      })

      console.log(`Actualizando nómina con datos:`, JSON.stringify(updateData, null, 2))

      try {
        const updatedPayroll = await dbService.updatePayroll(payrollId, updateData)
        console.log(`Nómina actualizada correctamente:`, JSON.stringify(updatedPayroll, null, 2))

        // Verificar si los valores se guardaron correctamente
        if (updatedPayroll.deductions === 0 && deductions > 0) {
          console.error(
            `ADVERTENCIA: El valor de deductions no se guardó correctamente. Valor calculado: ${deductions}, Valor guardado: ${updatedPayroll.deductions}`,
          )
        }

        if (updatedPayroll.additions === 0 && additions > 0) {
          console.error(
            `ADVERTENCIA: El valor de additions no se guardó correctamente. Valor calculado: ${additions}, Valor guardado: ${updatedPayroll.additions}`,
          )
        }
      } catch (updateError) {
        console.error(`Error al actualizar nómina:`, updateError)
        throw updateError
      }

      // Guardar los detalles en la tabla payroll_details
      if (details.length > 0) {
        try {
          // Eliminar detalles existentes si los hay
          await dbService.deletePayrollDetails(payrollId)
          console.log(`Detalles anteriores eliminados para nómina ${payrollId}`)

          // Insertar nuevos detalles
          console.log(`Guardando ${details.length} detalles para la nómina ${payrollId}`)

          for (const detail of details) {
            console.log(`Guardando detalle:`, JSON.stringify(detail, null, 2))

            try {
              const savedDetail = await dbService.createPayrollDetail({
                payroll_id: payrollId,
                concept: detail.concept,
                type: detail.type,
                amount: Number(detail.amount), // Asegurar que sea número
                date: detail.date,
                notes: detail.notes,
              })

              console.log(`Detalle guardado correctamente:`, JSON.stringify(savedDetail, null, 2))
            } catch (detailError) {
              console.error(`Error al guardar detalle:`, detailError)
            }
          }

          console.log(`Proceso de guardado de detalles completado`)
        } catch (error) {
          console.error(`Error al gestionar detalles de nómina:`, error)
        }
      } else {
        console.log(`No hay detalles para guardar`)
      }

      // Obtener la nómina actualizada para devolverla
      const finalPayroll = await this.getPayrollById(payrollId)
      console.log(`Nómina final después de ajustes:`, JSON.stringify(finalPayroll, null, 2))

      return finalPayroll
    } catch (error) {
      console.error(`Error general en calculatePayrollAdjustments:`, error)
      throw new Error(`Error al calcular ajustes de nómina: ${error.message}`)
    }
  }

  async recalculateAllPayrolls(month: number, year: number) {
    try {
      console.log(`Recalculando todas las nóminas para el período ${month}/${year}`)

      // Obtener todas las nóminas del período
      const payrolls = await this.getPayrollsByMonthYear(month, year)
      console.log(`Se encontraron ${payrolls.length} nóminas para recalcular`)

      // Usar forceRegeneratePayrolls para recalcular todas las nóminas
      const employeeIds = payrolls.map((p) => p.employeeId || p.employee_id)
      return await this.forceRegeneratePayrolls(employeeIds, month, year)
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
        const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
        const deductions = Number(payroll.deductions || 0)
        const additions = Number(payroll.additions || 0)
        const finalHandSalary = handSalary - deductions + additions

        // Actualizar el bono de presentismo
        const updateData = {
          has_attendance_bonus: true,
          attendance_bonus: bonusAmount,
          // Recalcular totales
          final_hand_salary: finalHandSalary,
          total_salary: bankSalary + finalHandSalary + bonusAmount,
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
        const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
        const deductions = Number(payroll.deductions || 0)
        const additions = Number(payroll.additions || 0)
        const finalHandSalary = handSalary - deductions + additions

        // Quitar el bono de presentismo
        const updateData = {
          has_attendance_bonus: false,
          attendance_bonus: 0,
          // Recalcular totales
          final_hand_salary: finalHandSalary,
          total_salary: bankSalary + finalHandSalary,
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

  // Añadir esta función al final de la clase PayrollService, justo antes del cierre
  async checkPayrollTableStructure() {
    try {
      // Obtener una nómina existente para ver su estructura
      const payrolls = await dbService.getPayrollsByPeriod(1, 2023, false)

      if (payrolls && payrolls.length > 0) {
        const payroll = payrolls[0]
        console.log("ESTRUCTURA DE NÓMINA:", Object.keys(payroll))
        console.log("VALORES DE NÓMINA:", JSON.stringify(payroll, null, 2))

        // Verificar si existen los campos deductions y additions
        const hasDeductions = "deductions" in payroll || "deductions" in payroll
        const hasAdditions = "additions" in payroll || "additions" in payroll

        console.log(`Campo deductions existe: ${hasDeductions}`)
        console.log(`Campo additions existe: ${hasAdditions}`)

        // Verificar si hay campos similares que podrían estar siendo usados en su lugar
        const possibleDeductionsFields = Object.keys(payroll).filter(
          (key) =>
            key.toLowerCase().includes("deduct") ||
            key.toLowerCase().includes("discount") ||
            key.toLowerCase().includes("minus"),
        )

        const possibleAdditionsFields = Object.keys(payroll).filter(
          (key) =>
            key.toLowerCase().includes("add") ||
            key.toLowerCase().includes("plus") ||
            key.toLowerCase().includes("bonus"),
        )

        if (possibleDeductionsFields.length > 0) {
          console.log(`Posibles campos para deducciones: ${possibleDeductionsFields.join(", ")}`)
        }

        if (possibleAdditionsFields.length > 0) {
          console.log(`Posibles campos para adiciones: ${possibleAdditionsFields.join(", ")}`)
        }

        return {
          hasDeductions,
          hasAdditions,
          possibleDeductionsFields,
          possibleAdditionsFields,
          structure: Object.keys(payroll),
        }
      } else {
        console.log("No se encontraron nóminas para verificar la estructura")
        return null
      }
    } catch (error) {
      console.error("Error al verificar la estructura de la tabla payroll:", error)
      throw new Error("Error al verificar la estructura de la tabla payroll")
    }
  }

  /**
   * Método para recalcular los ajustes de una nómina específica
   * @param payrollId ID de la nómina a recalcular
   * @returns La nómina actualizada
   */
  async recalculatePayrollAdjustments(payrollId: string) {
    try {
      console.log(`Recalculando ajustes para nómina ID: ${payrollId}`)

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

      // Calcular el rango de fechas para el período de la nómina
      const month = payroll.month
      const year = payroll.year
      const startDate = new Date(year, month - 1, 1)
      const endDate = new Date(year, month, 0)
      const startDateStr = startDate.toISOString().split("T")[0]
      const endDateStr = endDate.toISOString().split("T")[0]

      console.log(`Obteniendo asistencias desde ${startDateStr} hasta ${endDateStr}`)

      // Obtener asistencias del empleado para el período
      const attendances = await dbService.getAttendancesByDateRange(employeeId, startDateStr, endDateStr)
      console.log(`Se encontraron ${attendances.length} registros de asistencia`)

      // Calcular deducciones y adiciones basadas en asistencias
      const baseSalary = Number(payroll.baseSalary || payroll.base_salary || 0)
      const { deductions, additions, details } = this.calculateAdjustmentsFromAttendances(attendances, baseSalary)

      // Obtener valores actuales
      const handSalary = Number(payroll.handSalary || payroll.hand_salary || 0)
      const bankSalary = Number(payroll.bankSalary || payroll.bank_salary || 0)
      const attendanceBonus = Number(payroll.attendanceBonus || payroll.attendance_bonus || 0)
      const hasAttendanceBonus = Boolean(payroll.hasAttendanceBonus || payroll.has_attendance_bonus || false)

      // Calcular sueldo final en mano (sueldo en mano - deducciones + adiciones)
      const finalHandSalary = handSalary - deductions + additions

      // Calcular total a pagar (sueldo en banco + sueldo final en mano + bono de presentismo)
      const totalSalary = bankSalary + finalHandSalary + (hasAttendanceBonus ? attendanceBonus : 0)

      // Actualizar la nómina
      const updateData = {
        deductions: Number(deductions), // Asegurar que sea número
        additions: Number(additions), // Asegurar que sea número
        final_hand_salary: finalHandSalary,
        total_salary: totalSalary,
      }

      console.log(`Actualizando nómina con datos: ${JSON.stringify(updateData)}`)

      // Actualizar la nómina
      await dbService.updatePayroll(payrollId, updateData)

      // Guardar los detalles en la tabla payroll_details
      if (details.length > 0) {
        // Eliminar detalles existentes si los hay
        await dbService.deletePayrollDetails(payrollId)

        // Insertar nuevos detalles
        for (const detail of details) {
          await dbService.createPayrollDetail({
            payroll_id: payrollId,
            concept: detail.concept,
            type: detail.type,
            amount: Number(detail.amount), // Asegurar que sea número
            date: detail.date,
            notes: detail.notes,
          })
        }
      }

      // Obtener la nómina actualizada para devolverla
      return await this.getPayrollById(payrollId)
    } catch (error) {
      console.error("Error al recalcular ajustes de nómina:", error)
      throw new Error(`Error al recalcular ajustes de nómina: ${error.message}`)
    }
  }
}

// Al final del archivo, después de cerrar la clase PayrollService
export const payrollService = new PayrollService()
