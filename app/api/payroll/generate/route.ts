import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import type { Payroll, PayrollDetail } from "@/types"

export async function POST(request: Request) {
  try {
    const { month, year } = await request.json()

    // Validar datos de entrada
    if (!month || !year) {
      return NextResponse.json({ error: "Se requiere mes y año" }, { status: 400 })
    }

    const supabase = createRouteHandlerClient({ cookies })

    // Verificar autenticación
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // 1. Obtener todos los empleados activos
    const { data: employees, error: employeesError } = await supabase
      .from("employees")
      .select("*")
      .eq("status", "active")

    if (employeesError) {
      console.error("Error al obtener empleados:", employeesError)
      return NextResponse.json({ error: "Error al obtener empleados" }, { status: 500 })
    }

    // 2. Obtener el primer y último día del mes
    const firstDay = new Date(year, month - 1, 1)
    const lastDay = new Date(year, month, 0)

    const firstDayStr = firstDay.toISOString().split("T")[0]
    const lastDayStr = lastDay.toISOString().split("T")[0]

    // 3. Para cada empleado, procesar su nómina
    const payrollPromises = employees.map(async (employee: any) => {
      // 3.1 Obtener todas las asistencias del empleado en el período
      const { data: attendances, error: attendancesError } = await supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .gte("date", firstDayStr)
        .lte("date", lastDayStr)

      if (attendancesError) {
        console.error(`Error al obtener asistencias para empleado ${employee.id}:`, attendancesError)
        return null
      }

      // 3.2 Calcular deducciones y adiciones basadas en asistencias
      let totalDeductions = 0
      let totalAdditions = 0
      const payrollDetails: Partial<PayrollDetail>[] = []

      // Calcular minutos tarde totales
      const totalLateMinutes = attendances.reduce((sum: number, att: any) => sum + (att.late_minutes || 0), 0)
      if (totalLateMinutes > 0) {
        // Convertir minutos tarde a monto (ejemplo: cada minuto vale X pesos)
        const lateDeduction = calculateLateDeduction(totalLateMinutes, employee.hand_salary)
        totalDeductions += lateDeduction

        payrollDetails.push({
          payrollId: "", // Se asignará después
          concept: "Minutos tarde",
          type: "deduction",
          amount: lateDeduction,
          notes: `Total minutos: ${totalLateMinutes}`,
        })
      }

      // Calcular minutos de salida anticipada
      const totalEarlyDepartureMinutes = attendances.reduce(
        (sum: number, att: any) => sum + (att.early_departure_minutes || 0),
        0,
      )
      if (totalEarlyDepartureMinutes > 0) {
        const earlyDepartureDeduction = calculateEarlyDepartureDeduction(
          totalEarlyDepartureMinutes,
          employee.hand_salary,
        )
        totalDeductions += earlyDepartureDeduction

        payrollDetails.push({
          payrollId: "",
          concept: "Salida anticipada",
          type: "deduction",
          amount: earlyDepartureDeduction,
          notes: `Total minutos: ${totalEarlyDepartureMinutes}`,
        })
      }

      // Calcular minutos extra
      const totalExtraMinutes = attendances.reduce((sum: number, att: any) => sum + (att.extra_minutes || 0), 0)
      if (totalExtraMinutes > 0) {
        const extraAddition = calculateExtraAddition(totalExtraMinutes, employee.hand_salary)
        totalAdditions += extraAddition

        payrollDetails.push({
          payrollId: "",
          concept: "Horas extra",
          type: "addition",
          amount: extraAddition,
          notes: `Total minutos: ${totalExtraMinutes}`,
        })
      }

      // Calcular feriados trabajados
      const holidaysWorked = attendances.filter((att: any) => att.is_holiday && !att.is_absent).length
      if (holidaysWorked > 0) {
        const holidayAddition = calculateHolidayAddition(holidaysWorked, employee.hand_salary)
        totalAdditions += holidayAddition

        payrollDetails.push({
          payrollId: "",
          concept: "Feriados trabajados",
          type: "addition",
          amount: holidayAddition,
          notes: `Total días: ${holidaysWorked}`,
        })
      }

      // Calcular ausencias
      const absences = attendances.filter((att: any) => att.is_absent && !att.is_justified).length
      if (absences > 0) {
        const absenceDeduction = calculateAbsenceDeduction(absences, employee.hand_salary)
        totalDeductions += absenceDeduction

        payrollDetails.push({
          payrollId: "",
          concept: "Ausencias injustificadas",
          type: "deduction",
          amount: absenceDeduction,
          notes: `Total días: ${absences}`,
        })
      }

      // 3.3 Calcular sueldo final en mano
      const finalHandSalary = Math.max(0, employee.hand_salary - totalDeductions + totalAdditions)

      // 3.4 Calcular total a pagar
      const totalSalary = employee.bank_salary + finalHandSalary

      // 3.5 Crear objeto de nómina
      const payroll: Partial<Payroll> = {
        employeeId: employee.id,
        month,
        year,
        baseSalary: employee.hand_salary + employee.bank_salary,
        bankSalary: employee.bank_salary,
        handSalary: employee.hand_salary,
        deductions: totalDeductions,
        additions: totalAdditions,
        finalHandSalary,
        totalSalary,
        isPaid: false,
        handSalaryPaid: false,
        bankSalaryPaid: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // 3.6 Verificar si ya existe una nómina para este empleado en este período
      const { data: existingPayroll, error: existingPayrollError } = await supabase
        .from("payroll")
        .select("id")
        .eq("employee_id", employee.id)
        .eq("month", month)
        .eq("year", year)
        .single()

      let payrollId

      if (existingPayroll) {
        // Actualizar nómina existente
        const { data: updatedPayroll, error: updateError } = await supabase
          .from("payroll")
          .update({
            base_salary: payroll.baseSalary,
            bank_salary: payroll.bankSalary,
            hand_salary: payroll.handSalary,
            deductions: payroll.deductions,
            additions: payroll.additions,
            final_hand_salary: payroll.finalHandSalary,
            total_salary: payroll.totalSalary,
            updated_at: payroll.updatedAt,
          })
          .eq("id", existingPayroll.id)
          .select()
          .single()

        if (updateError) {
          console.error(`Error al actualizar nómina para empleado ${employee.id}:`, updateError)
          return null
        }

        payrollId = existingPayroll.id

        // Eliminar detalles existentes
        await supabase.from("payroll_details").delete().eq("payroll_id", payrollId)
      } else {
        // Crear nueva nómina
        const { data: newPayroll, error: insertError } = await supabase
          .from("payroll")
          .insert({
            employee_id: payroll.employeeId,
            month: payroll.month,
            year: payroll.year,
            base_salary: payroll.baseSalary,
            bank_salary: payroll.bankSalary,
            hand_salary: payroll.handSalary,
            deductions: payroll.deductions,
            additions: payroll.additions,
            final_hand_salary: payroll.finalHandSalary,
            total_salary: payroll.totalSalary,
            is_paid: false,
            hand_salary_paid: false,
            bank_salary_paid: false,
            created_at: payroll.createdAt,
            updated_at: payroll.updatedAt,
          })
          .select()
          .single()

        if (insertError) {
          console.error(`Error al crear nómina para empleado ${employee.id}:`, insertError)
          return null
        }

        payrollId = newPayroll.id
      }

      // 3.7 Insertar detalles de nómina
      if (payrollDetails.length > 0) {
        const detailsToInsert = payrollDetails.map((detail) => ({
          payroll_id: payrollId,
          concept: detail.concept,
          type: detail.type,
          amount: detail.amount,
          notes: detail.notes,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }))

        const { error: detailsError } = await supabase.from("payroll_details").insert(detailsToInsert)

        if (detailsError) {
          console.error(`Error al insertar detalles de nómina para empleado ${employee.id}:`, detailsError)
        }
      }

      return { employeeId: employee.id, payrollId }
    })

    // Esperar a que todas las nóminas se procesen
    const results = await Promise.all(payrollPromises)
    const successfulPayrolls = results.filter((result) => result !== null)

    return NextResponse.json({
      success: true,
      message: `Se generaron/actualizaron ${successfulPayrolls.length} nóminas`,
      payrolls: successfulPayrolls,
    })
  } catch (error: any) {
    console.error("Error en la generación de nóminas:", error)
    return NextResponse.json({ error: error.message || "Error interno del servidor" }, { status: 500 })
  }
}

// Funciones auxiliares para cálculos

function calculateLateDeduction(minutes: number, handSalary: number): number {
  // Ejemplo: cada minuto tarde equivale a 0.1% del salario en mano
  const workdayMinutes = 8 * 60 // 8 horas laborales
  const minuteValue = handSalary / workdayMinutes
  return Math.round(minutes * minuteValue * 100) / 100
}

function calculateEarlyDepartureDeduction(minutes: number, handSalary: number): number {
  // Similar a minutos tarde
  const workdayMinutes = 8 * 60
  const minuteValue = handSalary / workdayMinutes
  return Math.round(minutes * minuteValue * 100) / 100
}

function calculateExtraAddition(minutes: number, handSalary: number): number {
  // Ejemplo: cada minuto extra equivale a 0.15% del salario en mano (50% más que el valor normal)
  const workdayMinutes = 8 * 60
  const minuteValue = (handSalary / workdayMinutes) * 1.5
  return Math.round(minutes * minuteValue * 100) / 100
}

function calculateHolidayAddition(days: number, handSalary: number): number {
  // Ejemplo: cada feriado trabajado equivale a un día de salario adicional (100% más)
  const dailySalary = handSalary / 30 // Asumiendo 30 días por mes
  return Math.round(days * dailySalary * 2 * 100) / 100
}

function calculateAbsenceDeduction(days: number, handSalary: number): number {
  // Cada día de ausencia injustificada equivale a un día de salario
  const dailySalary = handSalary / 30
  return Math.round(days * dailySalary * 100) / 100
}

