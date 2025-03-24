import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { objectToCamelCase, objectToSnakeCase } from "./utils"
import type {
  Employee,
  Attendance,
  Payroll,
  PayrollDetail,
  DeliveryStats,
  Audit,
  AuditItem,
  Billing,
  Balance,
} from "@/types"

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
      return (data || []).map(emp => objectToCamelCase(emp))
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
      updated_at: new Date().toISOString()
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
  async getAttendanceByEmployeeId(employeeId: string) {
    const { data, error } = await this.supabase
      .from("attendance")
      .select("*")
      .eq("employee_id", employeeId)
      .order("date", { ascending: false })

    if (error) throw error
    return data.map(item => objectToCamelCase(item))
  }

  async createAttendance(attendance: Omit<Attendance, "id">) {
    // Convertir automáticamente de camelCase a snake_case
    const attendanceData = objectToSnakeCase(attendance)
    
    const { data, error } = await this.supabase.from("attendance").insert([attendanceData]).select().single()

    if (error) throw error
    return objectToCamelCase(data)
  }

  // Payroll methods
  async getPayrollByEmployeeId(employeeId: string) {
    const { data, error } = await this.supabase
      .from("payroll")
      .select("*")
      .eq("employee_id", employeeId)
      .order("period_start", { ascending: false })

    if (error) throw error
    return data.map(item => objectToCamelCase(item))
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
    return data.map(item => objectToCamelCase(item))
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
    return data.map(item => objectToCamelCase(item))
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
    return data.map(item => objectToCamelCase(item))
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
    return data.map(item => objectToCamelCase(item))
  }

  async createBalance(balance: Omit<Balance, "id">) {
    const balanceData = objectToSnakeCase(balance)
    const { data, error } = await this.supabase.from("balance").insert([balanceData]).select().single()

    if (error) throw error
    return objectToCamelCase(data)
  }

  // Update the getDashboardStats method to handle errors better
  async getDashboardStats() {
    try {
      // Add a timeout to prevent hanging requests
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Dashboard stats fetch timeout")), 10000),
      )

      const fetchPromise = async () => {
        // Get active employees count
        const { data: activeEmployees, error: employeesError } = await this.supabase
          .from("employees")
          .select("id")
          .eq("status", "active")

        if (employeesError) throw employeesError

        // Get delivery orders for the current month
        const currentDate = new Date()
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const { data: deliveryOrders, error: ordersError } = await this.supabase
          .from("delivery_stats")
          .select("*")
          .gte("created_at", firstDayOfMonth.toISOString())

        if (ordersError) throw ordersError

        // Calculate statistics
        return {
          activeEmployees: activeEmployees?.length || 0,
          activeEmployeesChange: 5, // Mock data - would need historical data to calculate
          totalDeliveryOrders: deliveryOrders?.length || 0,
          deliveryOrdersChange: 10, // Mock data - would need historical data to calculate
          totalRevenue: deliveryOrders?.reduce((sum, order) => sum + (order.revenue || 0), 0) || 0,
          revenueChange: 15, // Mock data - would need historical data to calculate
          averageRating: 4.5, // Mock data - would need actual ratings
          ratingChange: 0.2, // Mock data - would need historical data to calculate
        }
      }

      // Race the fetch against the timeout
      return await Promise.race([fetchPromise(), timeoutPromise])
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
      const { data, error } = await this.supabase
        .from(tableName)
        .select('*')
        .limit(1)
      
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

export const dbService = new DatabaseService()
