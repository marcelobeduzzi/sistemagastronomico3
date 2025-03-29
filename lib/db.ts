import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { objectToCamelCase, objectToSnakeCase } from "./utils" // Import utility functions
import type { Employee, Attendance, Payroll, PayrollDetail, Audit, Billing, Balance, Order } from "@/types"
import type { Liquidation } from "@/types"

interface AttendanceType {
[key: string]: any // Define the Attendance interface
}

// Clase principal que contiene toda la funcionalidad original
class DatabaseService {
private supabase = createClientComponentClient()

// User methods
async getUserByEmail(email: string) {
  const { data, error } = await this.supabase.from("users").select("*").eq("email", email).single()

  if (error) throw error
  return objectToCamelCase(data)
}

async getUserById(id: string) {
  const { data, error } = await this.supabase.from("users").select("*").eq("id", id).single()

  if (error) throw error
  return objectToCamelCase(data)
}

// Add a retry mechanism for database operations
async withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delay = 1000): Promise<T> {
  let lastError: any

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      console.warn(`Operation failed (attempt ${attempt}/${maxRetries}):`, error)

      if (attempt < maxRetries) {
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * attempt))
      }
    }
  }

  throw lastError
}

// Update the getEmployees method to use the retry mechanism
async getEmployees() {
  return this.withRetry(async () => {
    const { data, error } = await this.supabase.from("employees").select("*").order("first_name")

    if (error) {
      console.error("Error fetching employees:", error)
      throw error
    }

    // Convertir automáticamente de snake_case a camelCase
    return (data || []).map((emp) => objectToCamelCase(emp))
  })
}

async getEmployeeById(id: string) {
  const { data, error } = await this.supabase.from("employees").select("*").eq("id", id).single()

  if (error) throw error

  // Convertir automáticamente de snake_case a camelCase
  return objectToCamelCase(data)
}

async createEmployee(employee: Omit<Employee, "id" | "createdAt" | "updatedAt">) {
  try {
    // Add timestamps
    const now = new Date().toISOString()

    // Convertir automáticamente de camelCase a snake_case
    const employeeData = objectToSnakeCase({
      ...employee,
      created_at: now,
      updated_at: now,
      // Asegurarse de que las fechas estén en formato ISO
      birth_date: new Date(employee.birthDate).toISOString(),
      hire_date: new Date(employee.hireDate).toISOString(),
    })

    console.log("Attempting to create employee with data:", employeeData)

    const { data, error } = await this.supabase.from("employees").insert([employeeData]).select().single()

    if (error) {
      console.error("Supabase error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw new Error(`Error creating employee: ${error.message}`)
    }

    // Convertir automáticamente de snake_case a camelCase
    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error creating employee:", error)
    throw error
  }
}

async updateEmployee(id: string, employee: Partial<Employee>) {
  // Convertir automáticamente de camelCase a snake_case
  const updateData = objectToSnakeCase({
    ...employee,
    updated_at: new Date().toISOString(),
  })

  const { data, error } = await this.supabase.from("employees").update(updateData).eq("id", id).select().single()

  if (error) throw error

  // Convertir automáticamente de snake_case a camelCase
  return objectToCamelCase(data)
}

/**
 * Elimina un empleado por su ID
 * @param id ID del empleado a eliminar
 * @returns true si se eliminó correctamente, false en caso contrario
 */
async deleteEmployee(id: string): Promise<boolean> {
  try {
    const { error } = await this.supabase.from("employees").delete().eq("id", id)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error en deleteEmployee:", error)
    throw error
  }
}

// Attendance methods
// NUEVO: Obtener todas las asistencias con información del empleado
async getAttendances({ date, employeeId }: { date: string; employeeId?: string }) {
  try {
    console.log("Consultando asistencias para fecha exacta:", date)

    // Construir la consulta base
    let query = this.supabase.from("attendance").select(`
  *,
  employees (id, first_name, last_name)
`)

    // Filtrar por fecha exacta (sin manipulación)
    if (date) {
      query = query.eq("date", date)
    }

    // Filtrar por empleado si se proporciona
    if (employeeId && employeeId !== "all") {
      query = query.eq("employee_id", employeeId)
    }

    // Ordenar por fecha descendente
    query = query.order("date", { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error("Error en consulta de asistencias:", error)
      throw error
    }

    console.log("Datos recibidos de asistencias:", data)

    // Asegurarse de que las fechas se mantengan como strings
    const attendances = (data || []).map((item) => {
      const attendance = objectToCamelCase(item)
      // Asegurarse de que la fecha se mantenga como string
      if (typeof attendance.date === "string") {
        attendance.date = attendance.date.split("T")[0] // Eliminar la parte de tiempo si existe
      }
      return attendance
    })

    return attendances
  } catch (error) {
    console.error("Error al obtener asistencias:", error)
    throw error
  }
}

/**
 * Obtiene las asistencias más recientes
 * @param limit Número máximo de asistencias a obtener
 * @returns Lista de asistencias ordenadas por fecha descendente
 */
async getRecentAttendances(limit = 100): Promise<Attendance[]> {
  try {
    // Aquí iría la lógica para obtener las asistencias de la base de datos
    // Ordenadas por fecha descendente y limitadas a la cantidad especificada
    const { data, error } = await this.supabase
      .from("attendance")
      .select(`
      *,
      employees (id, first_name, last_name)
    `)
      .order("date", { ascending: false })
      .limit(limit)

    if (error) {
      console.error("Error en getRecentAttendances:", error)
      throw error
    }

    // Convertir de snake_case a camelCase
    const attendances = (data || []).map((item) => {
      const attendance = objectToCamelCase(item)
      // Asegurarse de que la fecha se mantenga como string
      if (typeof attendance.date === "string") {
        attendance.date = attendance.date.split("T")[0] // Eliminar la parte de tiempo si existe
      }
      return attendance
    })

    return attendances
  } catch (error) {
    console.error("Error en getRecentAttendances:", error)
    return []
  }
}

// ACTUALIZADO: Método mejorado para obtener asistencias por rango de fechas
async getAttendancesByDateRange(employeeId: string, startDate: string, endDate: string) {
  try {
    console.log(`Consultando asistencias para empleado ${employeeId} desde ${startDate} hasta ${endDate}`)

    // Construir la consulta
    const query = this.supabase
      .from("attendance")
      .select(`
    *,
    employees (id, first_name, last_name)
  `)
      .eq("employee_id", employeeId)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true })

    const { data, error } = await query

    if (error) {
      console.error("Error en consulta de asistencias por rango:", error)
      throw error
    }

    console.log(`Se encontraron ${data?.length || 0} registros de asistencia`)

    // Convertir de snake_case a camelCase
    const attendances = (data || []).map((item) => {
      const attendance = objectToCamelCase(item)
      // Asegurarse de que la fecha se mantenga como string
      if (typeof attendance.date === "string") {
        attendance.date = attendance.date.split("T")[0] // Eliminar la parte de tiempo si existe
      }
      return attendance
    })

    return attendances
  } catch (error) {
    console.error("Error al obtener asistencias por rango de fechas:", error)
    throw error
  }
}

// NUEVO: Obtener una asistencia específica por ID
async getAttendanceById(id: string) {
  try {
    const { data, error } = await this.supabase
      .from("attendance")
      .select(`
  *,
  employees (id, first_name, last_name)
`)
      .eq("id", id)
      .single()

    if (error) throw error
    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error al obtener asistencia por ID:", error)
    throw error
  }
}

async getAttendanceByEmployeeId(employeeId: string) {
  const { data, error } = await this.supabase
    .from("attendance")
    .select("*")
    .eq("employee_id", employeeId)
    .order("date", { ascending: false })

  if (error) throw error
  return data.map((item) => objectToCamelCase(item))
}

async createAttendance(attendance: Omit<Attendance, "id">) {
  try {
    // Calcular minutos tarde y salida anticipada
    let lateMinutes = attendance.lateMinutes || 0
    let earlyDepartureMinutes = attendance.earlyDepartureMinutes || 0
    let totalMinutesWorked = 0
    let totalMinutesBalance = 0
    let extraMinutes = 0

    // Si es ausente, establecer valores predeterminados
    if (attendance.isAbsent) {
      // Ausencia: solo descuento si no está justificada
      if (!attendance.isJustified) {
        // Ausencia injustificada: descuento de una jornada completa (480 minutos)
        totalMinutesBalance = -480
      } else {
        // Ausencia justificada: no hay descuento
        totalMinutesBalance = 0
      }

      totalMinutesWorked = 0
      lateMinutes = 0
      earlyDepartureMinutes = 0
      extraMinutes = 0

      // Asegurarse de que checkIn y checkOut sean null para ausencias
      attendance = {
        ...attendance,
        checkIn: null,
        checkOut: null,
      }
    } else {
      // Solo calcular estos valores si no es ausente
      if (attendance.expectedCheckIn && attendance.checkIn) {
        const expectedCheckIn = new Date(`2000-01-01T${attendance.expectedCheckIn}`)
        const actualCheckIn = new Date(`2000-01-01T${attendance.checkIn}`)

        if (actualCheckIn > expectedCheckIn) {
          lateMinutes = Math.floor((actualCheckIn.getTime() - expectedCheckIn.getTime()) / 60000)
        }
      }

      if (attendance.expectedCheckOut && attendance.checkOut) {
        const expectedCheckOut = new Date(`2000-01-01T${attendance.expectedCheckOut}`)
        const actualCheckOut = new Date(`2000-01-01T${attendance.checkOut}`)

        if (actualCheckOut < expectedCheckOut) {
          earlyDepartureMinutes = Math.floor((expectedCheckOut.getTime() - actualCheckOut.getTime()) / 60000)
        } else if (actualCheckOut > expectedCheckOut) {
          // Si salió más tarde, calcular minutos extra
          extraMinutes = Math.floor((actualCheckOut.getTime() - expectedCheckOut.getTime()) / 60000)
        }
      }

      // Calcular minutos trabajados
      if (attendance.checkIn && attendance.checkOut) {
        const checkIn = new Date(`2000-01-01T${attendance.checkIn}`)
        const checkOut = new Date(`2000-01-01T${attendance.checkOut}`)
        totalMinutesWorked = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
      }

      // Calcular la jornada laboral esperada
      const expectedWorkday =
        attendance.expectedCheckIn && attendance.expectedCheckOut
          ? calculateExpectedWorkday(attendance.expectedCheckIn, attendance.expectedCheckOut)
          : 480 // 8 horas por defecto

      // Aplicar reglas para días feriados o normales
      if (attendance.isHoliday) {
        // Trabajo en día feriado: adición de una jornada completa (480 minutos) más los minutos trabajados
        totalMinutesBalance = expectedWorkday + totalMinutesWorked
      } else {
        // Día normal: balance es minutos trabajados menos minutos tarde y salida anticipada, más minutos extra
        totalMinutesBalance = totalMinutesWorked - lateMinutes - earlyDepartureMinutes + extraMinutes
      }
    }

    // Añadir los cálculos y timestamps a los datos
    const now = new Date().toISOString()
    const attendanceWithCalculations = {
      ...attendance,
      lateMinutes,
      earlyDepartureMinutes,
      totalMinutesWorked,
      totalMinutesBalance,
      extraMinutes, // Nuevo campo para minutos extra
      createdAt: now,
      updatedAt: now,
    }

    // Convertir automáticamente de camelCase a snake_case
    const attendanceData = objectToSnakeCase(attendanceWithCalculations)

    // Registrar los datos exactos que se están enviando
    console.log("Datos enviados a Supabase:", attendanceData)

    const { data, error } = await this.supabase.from("attendance").insert([attendanceData]).select().single()

    if (error) {
      console.error("Error detallado de Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error al crear asistencia:", error)
    throw error
  }
}

// NUEVO: Actualizar una asistencia existente
async updateAttendance(id: string, attendance: Partial<Attendance>) {
  try {
    // Obtener la asistencia actual para tener todos los datos necesarios
    const { data: currentAttendance, error: fetchError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError) throw fetchError

    // Combinar los datos actuales con las actualizaciones
    let updatedAttendance = { ...objectToCamelCase(currentAttendance), ...attendance }

    // Si es ausente, establecer valores predeterminados
    if (updatedAttendance.isAbsent) {
      // Ausencia: solo descuento si no está justificada
      if (!updatedAttendance.isJustified) {
        // Ausencia injustificada: descuento de una jornada completa (480 minutos)
        updatedAttendance.totalMinutesBalance = -480
      } else {
        // Ausencia justificada: no hay descuento
        updatedAttendance.totalMinutesBalance = 0
      }

      updatedAttendance = {
        ...updatedAttendance,
        checkIn: null,
        checkOut: null,
        lateMinutes: 0,
        earlyDepartureMinutes: 0,
        extraMinutes: 0,
        totalMinutesWorked: 0,
      }
    } else {
      // Realizar los cálculos solo si no es ausente
      let lateMinutes = updatedAttendance.lateMinutes || 0
      let earlyDepartureMinutes = updatedAttendance.earlyDepartureMinutes || 0
      let totalMinutesWorked = 0
      let totalMinutesBalance = 0
      let extraMinutes = 0

      if (updatedAttendance.expectedCheckIn && updatedAttendance.checkIn) {
        const expectedCheckIn = new Date(`2000-01-01T${updatedAttendance.expectedCheckIn}`)
        const actualCheckIn = new Date(`2000-01-01T${updatedAttendance.checkIn}`)

        if (actualCheckIn > expectedCheckIn) {
          lateMinutes = Math.floor((actualCheckIn.getTime() - expectedCheckIn.getTime()) / 60000)
        } else {
          lateMinutes = 0
        }
      }

      if (updatedAttendance.expectedCheckOut && updatedAttendance.checkOut) {
        const expectedCheckOut = new Date(`2000-01-01T${updatedAttendance.expectedCheckOut}`)
        const actualCheckOut = new Date(`2000-01-01T${updatedAttendance.checkOut}`)

        if (actualCheckOut < expectedCheckOut) {
          earlyDepartureMinutes = Math.floor((expectedCheckOut.getTime() - actualCheckOut.getTime()) / 60000)
          extraMinutes = 0
        } else if (actualCheckOut > expectedCheckOut) {
          // Si salió más tarde, calcular minutos extra
          earlyDepartureMinutes = 0
          extraMinutes = Math.floor((actualCheckOut.getTime() - expectedCheckOut.getTime()) / 60000)
        } else {
          earlyDepartureMinutes = 0
          extraMinutes = 0
        }
      }

      // Calcular minutos trabajados
      if (updatedAttendance.checkIn && updatedAttendance.checkOut) {
        const checkIn = new Date(`2000-01-01T${updatedAttendance.checkIn}`)
        const checkOut = new Date(`2000-01-01T${updatedAttendance.checkOut}`)
        totalMinutesWorked = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
      }

      // Calcular la jornada laboral esperada
      const expectedWorkday =
        updatedAttendance.expectedCheckIn && updatedAttendance.expectedCheckOut
          ? calculateExpectedWorkday(updatedAttendance.expectedCheckIn, updatedAttendance.expectedCheckOut)
          : 480 // 8 horas por defecto

      // Aplicar reglas para días feriados o normales
      if (updatedAttendance.isHoliday) {
        // Trabajo en día feriado: adición de una jornada completa más los minutos trabajados
        totalMinutesBalance = expectedWorkday + totalMinutesWorked
      } else {
        // Día normal: balance es minutos trabajados menos minutos tarde y salida anticipada, más minutos extra
        totalMinutesBalance = totalMinutesWorked - lateMinutes - earlyDepartureMinutes + extraMinutes
      }

      // Actualizar los cálculos
      updatedAttendance = {
        ...updatedAttendance,
        lateMinutes,
        earlyDepartureMinutes,
        extraMinutes,
        totalMinutesWorked,
        totalMinutesBalance,
      }
    }

    // Añadir timestamp de actualización
    updatedAttendance.updatedAt = new Date().toISOString()

    // IMPORTANTE: Eliminar cualquier propiedad 'employees' que pueda estar causando el problema
    const cleanedAttendance = { ...updatedAttendance }
    if ("employees" in cleanedAttendance) {
      delete cleanedAttendance.employees
    }

    // Convertir automáticamente de camelCase a snake_case
    const snakeCaseData = objectToSnakeCase(cleanedAttendance)

    // Registrar los datos exactos que se están enviando
    console.log("Datos enviados a Supabase para actualización:", snakeCaseData)

    // Crear un objeto con solo los campos que queremos actualizar
    // Esto evita enviar campos que podrían causar problemas
    const updateFields = {
      employee_id: snakeCaseData.employee_id,
      date: snakeCaseData.date,
      check_in: snakeCaseData.check_in,
      check_out: snakeCaseData.check_out,
      expected_check_in: snakeCaseData.expected_check_in,
      expected_check_out: snakeCaseData.expected_check_out,
      late_minutes: snakeCaseData.late_minutes,
      early_departure_minutes: snakeCaseData.early_departure_minutes,
      extra_minutes: snakeCaseData.extra_minutes,
      total_minutes_worked: snakeCaseData.total_minutes_worked,
      total_minutes_balance: snakeCaseData.total_minutes_balance,
      is_holiday: snakeCaseData.is_holiday,
      is_absent: snakeCaseData.is_absent,
      is_justified: snakeCaseData.is_justified,
      notes: snakeCaseData.notes,
      updated_at: snakeCaseData.updated_at,
    }

    // Realizar la actualización con los campos específicos
    const { error } = await this.supabase.from("attendance").update(updateFields).eq("id", id)

    if (error) {
      console.error("Error detallado de Supabase:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    // Hacer una consulta separada para obtener los datos actualizados
    const { data: updatedData, error: fetchUpdatedError } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchUpdatedError) {
      console.error("Error al obtener datos actualizados:", fetchUpdatedError)
      throw fetchUpdatedError
    }

    return objectToCamelCase(updatedData)
  } catch (error) {
    console.error("Error al actualizar asistencia:", error)
    throw error
  }
}

// NUEVO: Eliminar una asistencia
async deleteAttendance(id: string) {
  try {
    const { error } = await this.supabase.from("attendance").delete().eq("id", id)

    if (error) throw error
    return true
  } catch (error) {
    console.error("Error al eliminar asistencia:", error)
    throw error
  }
}

// Payroll methods
async getPayrollByEmployeeId(employeeId: string) {
  const { data, error } = await this.supabase
    .from("payroll")
    .select("*")
    .eq("employee_id", employeeId)
    .order("period_start", { ascending: false })

  if (error) throw error
  return data.map((item) => objectToCamelCase(item))
}

async createPayroll(payroll: Omit<Payroll, "id">) {
  const payrollData = objectToSnakeCase(payroll)
  const { data, error } = await this.supabase.from("payroll").insert([payrollData]).select().single()

  if (error) throw error
  return objectToCamelCase(data)
}

async createPayrollDetail(detail: Omit<PayrollDetail, "id">) {
  const detailData = objectToSnakeCase(detail)
  const { data, error } = await this.supabase.from("payroll_details").insert([detailData]).select().single()

  if (error) throw error
  return objectToCamelCase(data)
}

// Método para obtener nóminas por período (mes/año)
async getPayrollsByPeriod(month: number, year: number, isPaid: boolean) {
  try {
    console.log(`Consultando nóminas con isPaid=${isPaid}`)

    // Construir la consulta base
    let query = this.supabase
      .from("payroll")
      .select("*, details:payroll_details(*)")
      .order("created_at", { ascending: false })

    // Si estamos buscando nóminas pagadas, filtrar por is_paid=true y por mes/año
    if (isPaid) {
      query = query.eq("is_paid", true)

      // Para nóminas pagadas, también filtramos por mes y año
      if (month && year) {
        query = query.eq("month", month).eq("year", year)
      }
    } else {
      // Para nóminas pendientes, solo filtramos por is_paid=false
      // No filtramos por mes/año para mostrar todas las pendientes
      query = query.eq("is_paid", false)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error al obtener nóminas:", error)
      throw error
    }

    console.log(`Total nóminas encontradas: ${data?.length || 0}`)

    // Convertir de snake_case a camelCase
    const payrolls = (data || []).map((item) => {
      const payroll = objectToCamelCase(item)

      // Convertir también los detalles
      if (payroll.details && Array.isArray(payroll.details)) {
        payroll.details = payroll.details.map((detail: any) => objectToCamelCase(detail))
      }

      return payroll
    })

    return payrolls
  } catch (error) {
    console.error("Error al obtener nóminas:", error)
    throw error
  }
}

// Método para obtener liquidaciones
async getLiquidations(isPaid = false) {
  try {
    const { data, error } = await this.supabase
      .from("liquidations")
      .select("*")
      .eq("is_paid", isPaid)
      .order("created_at", { ascending: false })

    if (error) throw error

    // Convertir de snake_case a camelCase
    return (data || []).map((item) => objectToCamelCase(item))
  } catch (error) {
    console.error("Error al obtener liquidaciones:", error)
    throw error
  }
}

// Método para actualizar una nómina
async updatePayroll(id: string, payroll: Partial<Payroll>) {
  try {
    // Convertir de camelCase a snake_case
    const payrollData = objectToSnakeCase({
      ...payroll,
      updated_at: new Date().toISOString(),
    })

    const { data, error } = await this.supabase.from("payroll").update(payrollData).eq("id", id).select().single()

    if (error) throw error

    // Convertir de snake_case a camelCase
    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error al actualizar nómina:", error)
    throw error
  }
}

// Método para actualizar una liquidación
async updateLiquidation(id: string, liquidation: Partial<Liquidation>) {
  try {
    // Convertir de camelCase a snake_case
    const liquidationData = objectToSnakeCase({
      ...liquidation,
      updated_at: new Date().toISOString(),
    })

    const { data, error } = await this.supabase
      .from("liquidations")
      .update(liquidationData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    // Convertir de snake_case a camelCase
    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error al actualizar liquidación:", error)
    throw error
  }
}

// Método para generar nóminas
async generatePayrolls(month: number, year: number) {
  try {
    console.log(`Generando nóminas para ${month}/${year}`)

    // 1. Obtener todos los empleados activos
    const employees = await this.getEmployees()
    const activeEmployees = employees.filter((emp) => emp.status === "active")

    console.log(`Empleados activos encontrados: ${activeEmployees.length}`)

    // Array para almacenar las nóminas generadas
    const generatedPayrolls = []

    // 2. Para cada empleado, generar una nómina
    for (const employee of activeEmployees) {
      // Verificar si ya existe una nómina para este empleado en este período
      const existingPayrolls = await this.supabase
        .from("payroll")
        .select("*")
        .eq("employee_id", employee.id)
        .eq("month", month)
        .eq("year", year)

      if (existingPayrolls.data && existingPayrolls.data.length > 0) {
        console.log(`Ya existe una nómina para ${employee.firstName} ${employee.lastName} en ${month}/${year}`)
        continue // Saltar este empleado
      }

      // Calcular valores base
      const baseSalary = employee.baseSalary || 0
      const bankSalary = employee.bankSalary || 0

      // CORRECCIÓN: El sueldo en mano es una parte del sueldo base, no una resta
      // Si bankSalary > baseSalary, asumimos que el sueldo total es la suma de ambos
      const totalSalaryBeforeAdjustments = bankSalary > baseSalary ? bankSalary + baseSalary : baseSalary
      const handSalary = bankSalary > baseSalary ? baseSalary : baseSalary - bankSalary

      console.log(`Calculando nómina para ${employee.firstName} ${employee.lastName}:`)
      console.log(`- Sueldo base: ${baseSalary}`)
      console.log(`- Sueldo banco: ${bankSalary}`)
      console.log(`- Sueldo en mano original: ${handSalary}`)

      // Calcular deducciones basadas en asistencias
      let deductions = 0
      let additions = 0

      // Obtener asistencias del mes para calcular deducciones/adiciones
      const startDate = new Date(year, month - 1, 1).toISOString().split("T")[0]
      const endDate = new Date(year, month, 0).toISOString().split("T")[0]

      const { data: attendances, error: attendanceError } = await this.supabase
        .from("attendance")
        .select("*")
        .eq("employee_id", employee.id)
        .gte("date", startDate)
        .lte("date", endDate)

      if (attendanceError) {
        console.error(
          `Error al obtener asistencias para ${employee.firstName} ${employee.lastName}:`,
          attendanceError,
        )
      } else if (attendances && attendances.length > 0) {
        console.log(`Encontradas ${attendances.length} asistencias para el período`)

        // Calcular el valor del minuto trabajado (basado en 30 días de 8 horas)
        const minuteValue = totalSalaryBeforeAdjustments / (30 * 8 * 60)
        console.log(`Valor del minuto trabajado: ${minuteValue}`)

        // Procesar asistencias para calcular deducciones/adiciones
        for (const attendance of attendances) {
          // Ausencias injustificadas: deducción
          if (attendance.is_absent && !attendance.is_justified) {
            const dailyRate = totalSalaryBeforeAdjustments / 30 // Valor diario aproximado
            deductions += dailyRate
            console.log(`- Deducción por ausencia injustificada: ${dailyRate}`)
          }

          // Minutos tarde: deducción proporcional
          if (attendance.late_minutes > 0) {
            const lateDeduction = attendance.late_minutes * minuteValue
            deductions += lateDeduction
            console.log(`- Deducción por ${attendance.late_minutes} minutos tarde: ${lateDeduction}`)
          }

          // Salida anticipada: deducción proporcional
          if (attendance.early_departure_minutes > 0) {
            const earlyDeduction = attendance.early_departure_minutes * minuteValue
            deductions += earlyDeduction
            console.log(
              `- Deducción por ${attendance.early_departure_minutes} minutos de salida anticipada: ${earlyDeduction}`,
            )
          }

          // Horas extra: adición
          if (attendance.extra_minutes > 0) {
            const extraAddition = attendance.extra_minutes * minuteValue * 1.5 // 50% más por hora extra
            additions += extraAddition
            console.log(`- Adición por ${attendance.extra_minutes} minutos extra: ${extraAddition}`)
          }
        }
      } else {
        console.log(`No se encontraron asistencias para el período`)
      }

      // Redondear valores a 2 decimales
      deductions = Math.round(deductions * 100) / 100
      additions = Math.round(additions * 100) / 100

      console.log(`Total deducciones: ${deductions}`)
      console.log(`Total adiciones: ${additions}`)

      // Calcular valores finales
      const finalHandSalary = handSalary - deductions + additions
      const totalSalary = bankSalary + finalHandSalary

      console.log(`Sueldo final en mano: ${finalHandSalary}`)
      console.log(`Total a pagar: ${totalSalary}`)

      // Crear la nómina
      const payrollData = {
        employee_id: employee.id,
        month,
        year,
        base_salary: baseSalary,
        bank_salary: bankSalary,
        hand_salary: handSalary,
        deductions,
        additions,
        final_hand_salary: finalHandSalary,
        total_salary: totalSalary,
        is_paid: false,
        hand_salary_paid: false,
        bank_salary_paid: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      // Insertar la nómina
      const { data: payroll, error: payrollError } = await this.supabase
        .from("payroll")
        .insert([payrollData])
        .select()
        .single()

      if (payrollError) {
        console.error(`Error al crear nómina para ${employee.firstName} ${employee.lastName}:`, payrollError)
        continue
      }

      console.log(`Nómina creada para ${employee.firstName} ${employee.lastName}`)

      // Crear detalles de la nómina
      if (deductions > 0) {
        // Deducción por ausencias/tardanzas
        const deductionData = {
          payroll_id: payroll.id,
          type: "deduction",
          concept: "Ausencias y tardanzas",
          amount: deductions,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        await this.supabase.from("payroll_details").insert([deductionData])
      }

      if (additions > 0) {
        // Adición por horas extra
        const additionData = {
          payroll_id: payroll.id,
          type: "addition",
          concept: "Horas extra",
          amount: additions,
          date: new Date().toISOString().split("T")[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }

        await this.supabase.from("payroll_details").insert([additionData])
      }

      generatedPayrolls.push(payroll)
    }

    console.log(`Total de nóminas generadas: ${generatedPayrolls.length}`)
    return generatedPayrolls
  } catch (error) {
    console.error("Error al generar nóminas:", error)
    throw error
  }
}

// Delivery stats methods
async getDeliveryStats(startDate: Date, endDate: Date) {
  const { data, error } = await this.supabase
    .from("delivery_stats")
    .select("*")
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date")

  if (error) throw error
  return data.map((item) => objectToCamelCase(item))
}

// Audit methods
async getAudits(startDate?: Date, endDate?: Date) {
  try {
    let query = this.supabase.from("audits").select("*").order("date", { ascending: false })

    if (startDate) {
      query = query.gte("date", startDate.toISOString())
    }

    if (endDate) {
      query = query.lte("date", endDate.toISOString())
    }

    const { data, error } = await query

    if (error) throw error
    return data.map((item) => objectToCamelCase(item))
  } catch (error) {
    console.error("Error en getAudits:", error)
    return []
  }
}

/**
 * Crea una nueva auditoría
 * @param auditData Datos de la auditoría
 * @returns La auditoría creada
 */
async createAudit(auditData: any): Promise<Audit> {
  try {
    console.log("Datos recibidos en createAudit:", auditData)

    // Asegurarse de que categories sea un array
    if (!auditData.categories || !Array.isArray(auditData.categories)) {
      console.error("Error: categories no es un array o está vacío")
      throw new Error("Las categorías de la auditoría deben ser un array")
    }

    // Asegurarse de que los campos coincidan con la estructura de la tabla
    const dataToSave = {
      local_id: auditData.local_id || auditData.localId,
      local_name: auditData.local_name || auditData.localName,
      auditor_name: auditData.auditor_name || auditData.auditor,
      date: auditData.date ? new Date(auditData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      notes: auditData.notes || auditData.generalObservations || "",
      categories: auditData.categories,
      total_score: auditData.total_score || auditData.totalScore || 0,
      max_score: auditData.max_score || auditData.maxScore || 0,
      percentage: auditData.percentage || 0,
      audited: auditData.audited !== undefined ? auditData.audited : false,
      created_at: auditData.created_at || new Date().toISOString(),
      updated_at: auditData.updated_at || new Date().toISOString(),
    }

    console.log("Datos de auditoría a insertar:", dataToSave)

    const { data, error } = await this.supabase.from("audits").insert([dataToSave]).select().single()

    if (error) {
      console.error("Error en createAudit:", error)
      throw error
    }

    console.log("Auditoría creada con éxito:", data)
    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error en createAudit:", error)
    throw error
  }
}

/**
 * Obtiene una auditoría por su ID
 * @param id ID de la auditoría
 * @returns La auditoría encontrada o null si no existe
 */
async getAuditById(id: string): Promise<Audit | null> {
  try {
    const { data, error } = await this.supabase.from("audits").select("*").eq("id", id).single()

    if (error) {
      console.error("Error en getAuditById:", error)
      throw error
    }

    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error en getAuditById:", error)
    return null
  }
}

// Billing methods
async getBilling(startDate: Date, endDate: Date) {
  const { data, error } = await this.supabase
    .from("billing")
    .select("*")
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date", { ascending: false })

  if (error) throw error
  return data.map((item) => objectToCamelCase(item))
}

async createBilling(billing: Omit<Billing, "id">) {
  const billingData = objectToSnakeCase(billing)
  const { data, error } = await this.supabase.from("billing").insert([billingData]).select().single()

  if (error) throw error
  return objectToCamelCase(data)
}

// Balance methods
async getBalance(startDate: Date, endDate: Date) {
  const { data, error } = await this.supabase
    .from("balance")
    .select("*")
    .gte("date", startDate.toISOString())
    .lte("date", endDate.toISOString())
    .order("date")

  if (error) throw error
  return data.map((item) => objectToCamelCase(item))
}

async createBalance(balance: Omit<Balance, "id">) {
  const balanceData = objectToSnakeCase(balance)
  const { data, error } = await this.supabase.from("balance").insert([balanceData]).select().single()

  if (error) throw error
  return objectToCamelCase(data)
}

/**
 * Obtiene el promedio de ventas para un local
 * @param localId ID del local
 * @returns Objeto con los promedios de ventas por producto
 */
async getAverageSales(localId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await this.supabase.from("sales_average").select("*").eq("local_id", localId).single()

    if (error) {
      console.error("Error en getAverageSales:", error)
      throw error
    }

    return objectToCamelCase(data.averages || {})
  } catch (error) {
    console.error("Error en getAverageSales:", error)
    return {}
  }
}

/**
 * Obtiene el stock actual para un local
 * @param localId ID del local
 * @returns Objeto con el stock actual por producto
 */
async getCurrentStock(localId: string): Promise<Record<string, number>> {
  try {
    const { data, error } = await this.supabase
      .from("stock")
      .select("*")
      .eq("local_id", localId)
      .order("created_at", { ascending: false })
      .limit(1)

    if (error) {
      console.error("Error en getCurrentStock:", error)
      throw error
    }

    return objectToCamelCase(data[0]?.items || {})
  } catch (error) {
    console.error("Error en getCurrentStock:", error)
    return {}
  }
}

/**
 * Guarda un pedido
 * @param orderData Datos del pedido
 * @returns El pedido guardado
 */
async saveOrder(orderData: any): Promise<Order> {
  try {
    // Convertir de camelCase a snake_case
    const snakeCaseData = objectToSnakeCase(orderData)

    const { data, error } = await this.supabase.from("orders").insert([snakeCaseData]).select().single()

    if (error) {
      console.error("Error en saveOrder:", error)
      throw error
    }

    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error en saveOrder:", error)
    throw error
  }
}

/**
 * Obtiene un pedido por su ID
 * @param id ID del pedido
 * @returns El pedido encontrado o null si no existe
 */
async getOrderById(id: string): Promise<Order | null> {
  try {
    const { data, error } = await this.supabase.from("orders").select("*").eq("id", id).single()

    if (error) {
      console.error("Error en getOrderById:", error)
      throw error
    }

    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error en getOrderById:", error)
    return null
  }
}

async getAllOrders() {
  try {
    const { data, error } = await this.supabase.from("orders").select("*")

    if (error) {
      console.error("Error en getAllOrders:", error)
      throw error
    }

    return data.map((item) => objectToCamelCase(item))
  } catch (error) {
    console.error("Error en getAllOrders:", error)
    return []
  }
}
// UPDATED: Simplified getDashboardStats method to fix the error
async getDashboardStats() {
  try {
    // Simplificamos para evitar el error
    const { data: activeEmployees, error: employeesError } = await this.supabase
      .from("employees")
      .select("id")
      .eq("status", "active")

    if (employeesError) {
      console.error("Error fetching employees:", employeesError)
      throw employeesError
    }

    // Devolvemos datos básicos sin intentar obtener delivery_stats por ahora
    return {
      activeEmployees: Array.isArray(activeEmployees) ? activeEmployees.length : 0,
      activeEmployeesChange: 0,
      totalDeliveryOrders: 0,
      deliveryOrdersChange: 0,
      totalRevenue: 0,
      revenueChange: 0,
      averageRating: 0,
      ratingChange: 0,
    }
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    // Return default values instead of throwing to prevent UI crashes
    return {
      activeEmployees: 0,
      activeEmployeesChange: 0,
      totalDeliveryOrders: 0,
      deliveryOrdersChange: 0,
      totalRevenue: 0,
      revenueChange: 0,
      averageRating: 0,
      ratingChange: 0,
    }
  }
}

async generateReports() {
  try {
    // Mock data for reports
    return [
      {
        name: "Facturación por Local",
        data: {
          labels: ["BR Cabildo", "BR Carranza", "BR Pacifico", "BR Lavalle", "BR Rivadavia"],
          datasets: [
            {
              label: "Ventas Mensuales",
              data: [150000, 120000, 180000, 90000, 160000],
              backgroundColor: "rgba(59, 130, 246, 0.5)",
              borderColor: "rgb(59, 130, 246)",
              borderWidth: 1,
            },
          ],
        },
      },
      {
        name: "Evolución de Pedidos por Plataforma",
        data: {
          labels: ["PedidosYa", "Rappi", "MercadoPago"],
          datasets: [
            {
              data: [35, 40, 25],
              backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)", "rgba(255, 206, 86, 0.5)"],
              borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"],
              borderWidth: 1,
            },
          ],
        },
      },
    ]
  } catch (error) {
    console.error("Error generating reports:", error)
    throw error
  }
}

// Método para verificar la estructura de la tabla
async checkTableStructure(tableName: string) {
  try {
    // Consultar una fila para ver la estructura
    const { data, error } = await this.supabase.from(tableName).select("*").limit(1)

    if (error) throw error

    if (data && data.length > 0) {
      console.log(`Estructura de la tabla ${tableName}:`, Object.keys(data[0]))
      return Object.keys(data[0])
    } else {
      console.log(`La tabla ${tableName} está vacía o no existe`)
      return []
    }
  } catch (error) {
    console.error(`Error al verificar la estructura de la tabla ${tableName}:`, error)
    throw error
  }
}

// Añadir el método getAuditConfig mejorado en la clase DatabaseService

/**
 * Obtiene la configuración de auditorías
 * @returns Configuración de categorías e ítems para auditorías
 */
async getAuditConfig() {
  try {
    console.log("Obteniendo configuración de auditorías")
    const { data, error } = await this.supabase.from("audit_config").select("*").single()

    if (error) {
      console.error("Error al obtener configuración de auditorías:", error)

      // Si el error es porque no existe la tabla o no hay registros, devolver configuración por defecto
      if (error.code === "PGRST116" || error.code === "22P02") {
        console.log("No se encontró configuración, devolviendo valores por defecto")
        return {
          categories: [
            {
              id: "limpieza",
              name: "Limpieza y Orden",
              maxScore: 25,
              items: [
                { id: "limpieza_general", name: "Limpieza general del local", maxScore: 5 },
                { id: "orden_cocina", name: "Orden en la cocina", maxScore: 5 },
                { id: "limpieza_banos", name: "Limpieza de baños", maxScore: 5 },
                { id: "manejo_residuos", name: "Manejo de residuos", maxScore: 5 },
                { id: "orden_almacen", name: "Orden en almacén", maxScore: 5 },
              ],
            },
            {
              id: "seguridad_alimentaria",
              name: "Seguridad Alimentaria",
              maxScore: 25,
              items: [
                { id: "control_temperatura", name: "Control de temperatura de alimentos", maxScore: 5 },
                { id: "almacenamiento", name: "Almacenamiento adecuado", maxScore: 5 },
                { id: "fechas_vencimiento", name: "Control de fechas de vencimiento", maxScore: 5 },
                { id: "manipulacion", name: "Manipulación de alimentos", maxScore: 5 },
                { id: "contaminacion_cruzada", name: "Prevención de contaminación cruzada", maxScore: 5 },
              ],
            },
            {
              id: "atencion_cliente",
              name: "Atención al Cliente",
              maxScore: 20,
              items: [
                { id: "presentacion_personal", name: "Presentación del personal", maxScore: 5 },
                { id: "amabilidad", name: "Amabilidad y cortesía", maxScore: 5 },
                { id: "rapidez", name: "Rapidez en el servicio", maxScore: 5 },
                { id: "conocimiento_menu", name: "Conocimiento del menú", maxScore: 5 },
              ],
            },
            {
              id: "calidad_producto",
              name: "Calidad del Producto",
              maxScore: 20,
              items: [
                { id: "presentacion_platos", name: "Presentación de platos", maxScore: 5 },
                { id: "sabor", name: "Sabor y temperatura adecuados", maxScore: 5 },
                { id: "consistencia", name: "Consistencia en la calidad", maxScore: 5 },
                { id: "frescura", name: "Frescura de ingredientes", maxScore: 5 },
              ],
            },
            {
              id: "procesos_operativos",
              name: "Procesos Operativos",
              maxScore: 10,
              items: [
                { id: "seguimiento_recetas", name: "Seguimiento de recetas estándar", maxScore: 5 },
                { id: "eficiencia", name: "Eficiencia en procesos", maxScore: 5 },
              ],
            },
          ],
        }
      }

      throw error
    }

    console.log("Configuración obtenida:", data)
    return data
  } catch (error) {
    console.error("Error en getAuditConfig:", error)
    throw error
  }
}

/**
 * Guarda la configuración de auditorías
 * @param config Configuración de categorías e ítems para auditorías
 * @returns Resultado de la operación
 */
async saveAuditConfig(config: any) {
  try {
    // Verificar si ya existe una configuración
    const { data: existingConfig, error: checkError } = await this.supabase.from("audit_config").select("id").single()

    if (checkError && checkError.code !== "PGRST116") {
      console.error("Error al verificar configuración existente:", checkError)
      throw checkError
    }

    if (existingConfig) {
      // Actualizar configuración existente
      console.log("Actualizando configuración existente:", existingConfig.id)
      const { data, error } = await this.supabase
        .from("audit_config")
        .update(config)
        .eq("id", existingConfig.id)
        .select()
        .single()

      if (error) throw error
      return data
    } else {
      // Crear nueva configuración
      console.log("Creando nueva configuración")
      const { data, error } = await this.supabase.from("audit_config").insert([config]).select().single()

      if (error) throw error
      return data
    }
  } catch (error) {
    console.error("Error en saveAuditConfig:", error)
    throw error
  }
}
}

// Función auxiliar para calcular la jornada laboral esperada en minutos
function calculateExpectedWorkday(expectedCheckIn: string, expectedCheckOut: string): number {
const checkIn = new Date(`2000-01-01T${expectedCheckIn}`)
const checkOut = new Date(`2000-01-01T${expectedCheckOut}`)
return Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
}

// Crear una instancia del servicio
const dbService = new DatabaseService()

// Crear un objeto que imita la estructura de Prisma pero usa dbService internamente
export const db = {
// Adaptador para attendance
attendance: {
  findMany: async ({ take, orderBy }: { take?: number; orderBy?: any } = {}) => {
    // Convertir los parámetros de Prisma a los que espera dbService
    const limit = take || 100
    return await dbService.getRecentAttendances(limit)
  },
  findUnique: async ({ where }: { where: { id: string } }) => {
    return await dbService.getAttendanceById(where.id)
  },
  create: async ({ data }: { data: any }) => {
    return await dbService.createAttendance(data)
  },
  update: async ({ where, data }: { where: { id: string }; data: any }) => {
    return await dbService.updateAttendance(where.id, data)
  },
  delete: async ({ where }: { where: { id: string } }) => {
    return await dbService.deleteAttendance(where.id)
  },
},

// Adaptador para employees
employees: {
  findMany: async () => {
    return await dbService.getEmployees()
  },
  findUnique: async ({ where }: { where: { id: string } }) => {
    return await dbService.getEmployeeById(where.id)
  },
  create: async ({ data }: { data: any }) => {
    return await dbService.createEmployee(data)
  },
  update: async ({ where, data }: { where: { id: string }; data: any }) => {
    return await dbService.updateEmployee(where.id, data)
  },
  delete: async ({ where }: { where: { id: string } }) => {
    return await dbService.deleteEmployee(where.id)
  },
},

// Adaptador para audits
audits: {
  findMany: async () => {
    return await dbService.getAudits()
  },
  findUnique: async ({ where }: { where: { id: string } }) => {
    return await dbService.getAuditById(where.id)
  },
  create: async ({ data }: { data: any }) => {
    return await dbService.createAudit(data)
  },
},

// Adaptador para orders
orders: {
  findMany: async () => {
    return await dbService.getAllOrders()
  },
  create: async ({ data }: { data: any }) => {
    return await dbService.saveOrder(data)
  },
  findUnique: async ({ where }: { where: { id: string } }) => {
    return await dbService.getOrderById(where.id)
  },
},
auditConfig: {
  get: async () => {
    return await dbService.getAuditConfig()
  },
  save: async (data: any) => {
    return await dbService.saveAuditConfig(data)
  },
},
}

// Exportar también el servicio original para mantener compatibilidad
export { dbService }









