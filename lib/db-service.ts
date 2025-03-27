import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { objectToCamelCase, objectToSnakeCase } from "./utils" // Import utility functions
import type { Employee, Attendance, Payroll, PayrollDetail, Audit, Billing, Balance } from "@/types"

interface AttendanceType {
  [key: string]: any // Define the Attendance interface
}

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

  async deleteEmployee(id: string) {
    const { error } = await this.supabase.from("employees").delete().eq("id", id)

    if (error) throw error
  }

  // Attendance methods
  // NUEVO: Obtener todas las asistencias con información del empleado
  async getAttendances() {
    try {
      const { data, error } = await this.supabase
        .from("attendance")
        .select(`
          *,
          employees (id, first_name, last_name)
        `)
        .order("date", { ascending: false })

      if (error) throw error
      return (data || []).map((item) => objectToCamelCase(item))
    } catch (error) {
      console.error("Error al obtener asistencias:", error)
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
  async getAudits(startDate: Date, endDate: Date) {
    const { data, error } = await this.supabase
      .from("audits")
      .select("*")
      .gte("date", startDate.toISOString())
      .lte("date", endDate.toISOString())
      .order("date", { ascending: false })

    if (error) throw error
    return data.map((item) => objectToCamelCase(item))
  }

  async createAudit(audit: Omit<Audit, "id">) {
    const auditData = objectToSnakeCase(audit)
    const { data, error } = await this.supabase.from("audits").insert([auditData]).select().single()

    if (error) throw error
    return objectToCamelCase(data)
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
}

// Función auxiliar para calcular la jornada laboral esperada en minutos
function calculateExpectedWorkday(expectedCheckIn: string, expectedCheckOut: string): number {
  const checkIn = new Date(`2000-01-01T${expectedCheckIn}`)
  const checkOut = new Date(`2000-01-01T${expectedCheckOut}`)
  return Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000)
}

export const dbService = new DatabaseService()







