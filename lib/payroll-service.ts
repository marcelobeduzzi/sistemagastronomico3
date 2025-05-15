import { db } from "@/lib/db"

export class PayrollService {
  async generatePayrolls(employeeIds: string[], month: number, year: number) {
    try {
      const results = []

      for (const employeeId of employeeIds) {
        // Obtener información del empleado
        const employee = await db.query("SELECT * FROM employees WHERE id = $1", [employeeId])

        if (!employee.rows.length) {
          console.error(`Empleado con ID ${employeeId} no encontrado`)
          continue
        }

        const employeeData = employee.rows[0]

        // Verificar si ya existe una nómina para este empleado en el mes/año especificado
        const existingPayroll = await db.query(
          "SELECT * FROM payroll WHERE employee_id = $1 AND month = $2 AND year = $3",
          [employeeId, month, year],
        )

        if (existingPayroll.rows.length > 0) {
          console.log(`La nómina para el empleado ${employeeId} en ${month}/${year} ya existe`)
          results.push(existingPayroll.rows[0])
          continue
        }

        // Calcular los valores de la nómina
        const baseSalary = Number.parseFloat(employeeData.base_salary) || 0
        const handSalary = Number.parseFloat(employeeData.hand_salary) || 0
        const bankSalary = Number.parseFloat(employeeData.bank_salary) || 0

        // Calcular deducciones y adiciones (esto puede variar según tu lógica de negocio)
        const deductions = 0 // Implementar lógica de deducciones si es necesario
        const additions = 0 // Implementar lógica de adiciones si es necesario

        // Calcular bonificación por asistencia si aplica
        const attendanceBonus = employeeData.has_attendance_bonus
          ? Number.parseFloat(employeeData.attendance_bonus) || 0
          : 0

        // Calcular salarios finales
        const finalHandSalary = handSalary - deductions + additions + attendanceBonus
        const totalSalary = baseSalary - deductions + additions + attendanceBonus

        // Crear la nueva nómina
        const newPayroll = await db.query(
          `INSERT INTO payroll (
            id, employee_id, month, year, base_salary, bank_salary, 
            deductions, additions, final_hand_salary, total_salary, 
            is_paid_hand, is_paid_bank, hand_salary, is_paid, 
            has_attendance_bonus, attendance_bonus, created_at, updated_at
          ) VALUES (
            uuid_generate_v4(), $1, $2, $3, $4, $5, 
            $6, $7, $8, $9, 
            false, false, $10, false, 
            $11, $12, NOW(), NOW()
          ) RETURNING *`,
          [
            employeeId,
            month,
            year,
            baseSalary,
            bankSalary,
            deductions,
            additions,
            finalHandSalary,
            totalSalary,
            handSalary,
            employeeData.has_attendance_bonus,
            attendanceBonus,
          ],
        )

        results.push(newPayroll.rows[0])
      }

      return results
    } catch (error) {
      console.error("Error al generar nóminas:", error)
      throw new Error("Error al generar nóminas")
    }
  }

  async getPayrollsByMonthYear(month: number, year: number) {
    try {
      const payrolls = await db.query(
        `SELECT p.*, e.name, e.last_name 
         FROM payroll p 
         JOIN employees e ON p.employee_id = e.id 
         WHERE p.month = $1 AND p.year = $2`,
        [month, year],
      )

      return payrolls.rows
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

      let updateQuery = `UPDATE payroll SET ${field} = $1, updated_at = NOW()`

      // Si estamos marcando como pagado, actualizar la fecha de pago correspondiente
      if (field === "is_paid_hand" && value) {
        updateQuery += ", hand_payment_date = NOW()"
      } else if (field === "is_paid_bank" && value) {
        updateQuery += ", bank_payment_date = NOW()"
      }

      updateQuery += " WHERE id = $2 RETURNING *"

      const result = await db.query(updateQuery, [value, payrollId])

      if (result.rows.length === 0) {
        throw new Error("Nómina no encontrada")
      }

      return result.rows[0]
    } catch (error) {
      console.error("Error al actualizar estado de nómina:", error)
      throw new Error("Error al actualizar estado de nómina")
    }
  }

  async updatePaymentDetails(payrollId: string, paymentMethod: string, paymentReference: string) {
    try {
      const result = await db.query(
        `UPDATE payroll 
         SET payment_method = $1, payment_reference = $2, updated_at = NOW() 
         WHERE id = $3 
         RETURNING *`,
        [paymentMethod, paymentReference, payrollId],
      )

      if (result.rows.length === 0) {
        throw new Error("Nómina no encontrada")
      }

      return result.rows[0]
    } catch (error) {
      console.error("Error al actualizar detalles de pago:", error)
      throw new Error("Error al actualizar detalles de pago")
    }
  }
}

// Exportar una instancia del servicio para uso en la aplicación
export const payrollService = new PayrollService()
