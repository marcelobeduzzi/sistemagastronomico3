"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import type { DateRange } from "react-day-picker"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Users, ShoppingCart, DollarSign, Star, TrendingUp, TrendingDown, AlertCircle, CreditCard, BarChartIcon, Calendar, Clock, AlertTriangle, Truck, FileText } from 'lucide-react'
import { formatCurrency } from "@/lib/export-utils"
import { BarChart, LineChart, PieChart } from "@/components/charts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { createClient } from '@supabase/supabase-js'

// Tipos para los datos del dashboard
interface DashboardStats {
  // Métricas que se mantienen
  activeEmployees: number
  activeEmployeesChange: number
  
  // Nuevas métricas
  pendingAlerts: number
  payrollExpenses: number
  externalPayrollExpenses: number
  pendingLiquidations: number
  pendingLiquidationsAmount: number
  pendingClosings: number
  monthlyRevenue: number
  revenueChangePercentage: number
  
  // Métricas que se mantienen por compatibilidad
  totalDeliveryOrders: number
  deliveryOrdersChange: number
  totalRevenue: number
  revenueChange: number
  averageRating: number
  ratingChange: number
  weeklyRevenue: number
  previousWeekRevenue: number
  pendingPayments: number
  pendingPaymentsAmount: number
  pendingPaymentsUrgent: number
}

interface ChartData {
  labels: string[]
  datasets: {
    label?: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
    borderWidth?: number
  }[]
}

interface DashboardData {
  stats: DashboardStats
  charts: {
    salesData: ChartData
    deliveryData: ChartData
    attendanceData: ChartData
  }
}

export default function Dashboard() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  // Estado para los datos del dashboard
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeEmployeesCount, setActiveEmployeesCount] = useState<number | null>(null)

  // Función para obtener los datos del dashboard
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Crear una nueva instancia de Supabase para evitar problemas de caché
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: { persistSession: false }
      })

      // Obtener empleados activos directamente
      console.log("Consultando empleados activos directamente...")
      
      const { data: employees, error: employeesError, count } = await supabase
        .from('employees')
        .select('*', { count: 'exact' })
        .eq('status', 'active')
      
      if (employeesError) {
        console.error("Error al consultar empleados:", employeesError)
        throw employeesError
      }
      
      // Verificar los resultados
      console.log("Resultado de la consulta de empleados:", { 
        data: employees, 
        count, 
        length: employees?.length || 0 
      })
      
      // Actualizar el estado con el número de empleados activos
      const activeEmployees = employees?.length || 0
      setActiveEmployeesCount(activeEmployees)
      
      // Intentar obtener datos de la API para el resto de estadísticas
      try {
        const response = await fetch("/api/dashboard")
        if (response.ok) {
          const data = await response.json()
          // Reemplazar el número de empleados activos con el que acabamos de obtener
          data.stats.activeEmployees = activeEmployees
          setDashboardData(data)
          return
        }
      } catch (apiError) {
        console.error("Error al obtener datos de la API, usando datos de Supabase:", apiError)
      }

      // Si la API falla, obtener datos directamente de Supabase
      const stats = await fetchRealTimeStats(supabase, activeEmployees)
      
      // Datos de ejemplo para los gráficos
      const mockChartData = {
        salesData: {
          labels: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
          datasets: [
            {
              label: "Ventas",
              data: [12000, 19000, 15000, 17000, 22000, 24000, 19000, 21000, 23000, 25000, 26000, 28000],
              backgroundColor: "rgba(59, 130, 246, 0.5)",
              borderColor: "rgb(59, 130, 246)",
              borderWidth: 1
            }
          ]
        },
        deliveryData: {
          labels: ["PedidosYa", "Rappi", "Propio", "MercadoPago"],
          datasets: [
            {
              data: [40, 30, 20, 10],
              backgroundColor: ["#FF5A5F", "#FF9500", "#00C2B8", "#3483FA"],
              borderWidth: 1
            }
          ]
        },
        attendanceData: {
          labels: Array.from({ length: 30 }, (_, i) => (i + 1).toString()),
          datasets: [
            {
              label: "Asistencias",
              data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 20) + 30),
              borderColor: "rgb(75, 192, 192)",
              tension: 0.1,
              fill: false
            }
          ]
        }
      }

      setDashboardData({
        stats,
        charts: mockChartData
      })
    } catch (err) {
      console.error("Error al obtener datos del dashboard:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Función para obtener estadísticas en tiempo real de Supabase
  const fetchRealTimeStats = async (supabase, activeEmployees) => {
    try {
      // 1. Obtener alertas pendientes
      const { data: alertsData, error: alertsError } = await supabase
        .from('alerts')
        .select('id')
        .eq('status', 'pendiente')
      
      if (alertsError) throw alertsError
      const pendingAlerts = alertsData?.length || 0
      
      // 2. Calcular gastos de nómina (total de todos los empleados)
      const { data: employeesData, error: employeesError } = await supabase
        .from('employees')
        .select('total_salary, local')
        .eq('status', 'active')
      
      if (employeesError) throw employeesError
      
      // Calcular gasto total en nómina
      const payrollExpenses = employeesData?.reduce((sum, emp) => sum + (Number(emp.total_salary) || 0), 0) || 0
      
      // Calcular gasto en nómina externa (empleados sin local asignado)
      const externalPayrollExpenses = employeesData
        ?.filter(emp => !emp.local || emp.local === '')
        .reduce((sum, emp) => sum + (Number(emp.total_salary) || 0), 0) || 0
      
      // 3. Obtener liquidaciones pendientes
      const { data: liquidationsData, error: liquidationsError } = await supabase
        .from('pending_liquidations')
        .select('id, employee_id')
        .eq('processed', false)
      
      if (liquidationsError) throw liquidationsError
      const pendingLiquidations = liquidationsData?.length || 0
      
      // 4. Obtener cierres de caja pendientes
      const { data: closingsData, error: closingsError } = await supabase
        .from('cash_register_closings')
        .select('id')
        .eq('status', 'pending')
      
      if (closingsError) throw closingsError
      const pendingClosings = closingsData?.length || 0
      
      // 5. Calcular facturación del mes
      const today = new Date()
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      
      const { data: currentMonthData, error: currentMonthError } = await supabase
        .from('cash_register_closings')
        .select('total_sales')
        .gte('date', firstDayOfMonth.toISOString())
        .lte('date', lastDayOfMonth.toISOString())
      
      if (currentMonthError) throw currentMonthError
      const monthlyRevenue = currentMonthData?.reduce((sum, record) => sum + (Number(record.total_sales) || 0), 0) || 0
      
      // 6. Calcular comparativa con el mes anterior
      const firstDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastDayOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0)
      
      const { data: prevMonthData, error: prevMonthError } = await supabase
        .from('cash_register_closings')
        .select('total_sales')
        .gte('date', firstDayOfPrevMonth.toISOString())
        .lte('date', lastDayOfPrevMonth.toISOString())
      
      if (prevMonthError) throw prevMonthError
      const prevMonthRevenue = prevMonthData?.reduce((sum, record) => sum + (Number(record.total_sales) || 0), 0) || 0
      
      // Calcular porcentaje de cambio
      const revenueChangePercentage = prevMonthRevenue > 0 
        ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
        : 0
      
      // 7. Obtener datos de la semana actual (mantenemos esta parte para compatibilidad)
      const dayOfWeek = today.getDay() || 7 // 0 es domingo, convertimos a 7
      
      // Primer día de la semana actual (lunes)
      const currentWeekStart = new Date(today)
      currentWeekStart.setDate(today.getDate() - dayOfWeek + 1)
      currentWeekStart.setHours(0, 0, 0, 0)
      
      // Primer día de la semana anterior
      const previousWeekStart = new Date(currentWeekStart)
      previousWeekStart.setDate(previousWeekStart.getDate() - 7)
      
      // Último día de la semana anterior
      const previousWeekEnd = new Date(currentWeekStart)
      previousWeekEnd.setDate(previousWeekEnd.getDate() - 1)
      previousWeekEnd.setHours(23, 59, 59, 999)
      
      // Formatear fechas para consultas SQL
      const currentWeekStartStr = currentWeekStart.toISOString()
      const previousWeekStartStr = previousWeekStart.toISOString()
      const previousWeekEndStr = previousWeekEnd.toISOString()
      
      // Consulta para ventas de la semana actual
      const { data: currentWeekData, error: currentWeekError } = await supabase
        .from('cash_registers')
        .select('total_sales')
        .gte('date', currentWeekStartStr)
        .lte('date', today.toISOString())
      
      if (currentWeekError) throw currentWeekError
      
      // Consulta para ventas de la semana anterior
      const { data: previousWeekData, error: previousWeekError } = await supabase
        .from('cash_registers')
        .select('total_sales')
        .gte('date', previousWeekStartStr)
        .lte('date', previousWeekEndStr)
      
      if (previousWeekError) throw previousWeekError
      
      // Calcular totales
      const weeklyRevenue = currentWeekData?.reduce((sum, record) => sum + (Number(record.total_sales) || 0), 0) || 0
      const previousWeekRevenue = previousWeekData?.reduce((sum, record) => sum + (Number(record.total_sales) || 0), 0) || 0
      
      // 8. Obtener pagos pendientes a proveedores (mantenemos esta parte para compatibilidad)
      const { data: pendingPaymentsData, error: pendingPaymentsError } = await supabase
        .from('provider_payments')
        .select('amount, due_date')
        .eq('status', 'pending')
      
      if (pendingPaymentsError) throw pendingPaymentsError
      
      const pendingPayments = pendingPaymentsData?.length || 0
      const pendingPaymentsAmount = pendingPaymentsData?.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0) || 0
      
      // Pagos urgentes (vencen en los próximos 7 días)
      const nextWeek = new Date()
      nextWeek.setDate(nextWeek.getDate() + 7)
      
      const pendingPaymentsUrgent = pendingPaymentsData?.filter(payment => {
        const dueDate = new Date(payment.due_date)
        return dueDate <= nextWeek
      }).length || 0
      
      // 9. Obtener datos de delivery (mantenemos esta parte para compatibilidad)
      const { data: deliveryData, error: deliveryError } = await supabase
        .from('delivery_orders')
        .select('id')
        .gte('created_at', currentWeekStartStr)
      
      if (deliveryError) throw deliveryError
      
      const totalDeliveryOrders = deliveryData?.length || 0
      
      // Retornar todas las métricas
      return {
        // Métricas que se mantienen
        activeEmployees,
        activeEmployeesChange: 5.2, // Ejemplo
        
        // Nuevas métricas
        pendingAlerts,
        payrollExpenses,
        externalPayrollExpenses,
        pendingLiquidations,
        pendingLiquidationsAmount: 0, // No tenemos este dato
        pendingClosings,
        monthlyRevenue,
        revenueChangePercentage,
        
        // Métricas que se mantienen por compatibilidad
        totalDeliveryOrders,
        deliveryOrdersChange: 12.5, // Ejemplo
        totalRevenue: 125000, // Ejemplo
        revenueChange: 8.3, // Ejemplo
        averageRating: 4.7, // Ejemplo
        ratingChange: 0.2, // Ejemplo
        weeklyRevenue,
        previousWeekRevenue,
        pendingPayments,
        pendingPaymentsAmount,
        pendingPaymentsUrgent
      }
    } catch (error) {
      console.error("Error al obtener estadísticas en tiempo real:", error)
      // Devolver datos de ejemplo en caso de error, pero mantener el número real de empleados
      return {
        activeEmployees,
        activeEmployeesChange: 5.2,
        pendingAlerts: 5,
        payrollExpenses: 1500000,
        externalPayrollExpenses: 350000,
        pendingLiquidations: 3,
        pendingLiquidationsAmount: 120000,
        pendingClosings: 2,
        monthlyRevenue: 2500000,
        revenueChangePercentage: 5.2,
        totalDeliveryOrders: 320,
        deliveryOrdersChange: 12.5,
        totalRevenue: 125000,
        revenueChange: 8.3,
        averageRating: 4.7,
        ratingChange: 0.2,
        weeklyRevenue: 85000,
        previousWeekRevenue: 78000,
        pendingPayments: 12,
        pendingPaymentsAmount: 45000,
        pendingPaymentsUrgent: 3
      }
    }
  }

  // Efecto para cargar los datos al montar el componente
  useEffect(() => {
    fetchDashboardData()
    
    // Actualizar datos cada 5 minutos (reducido de 30 minutos)
    const interval = setInterval(fetchDashboardData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchDashboardData])

  // Función para exportar datos
  const handleExport = useCallback(() => {
    alert("Exportando datos del dashboard...")
  }, [])

  // Memoizar los stats para evitar re-renderizados innecesarios
  const stats = useMemo(
    () =>
      dashboardData?.stats || {
        activeEmployees: activeEmployeesCount || 0,
        activeEmployeesChange: 0,
        pendingAlerts: 0,
        payrollExpenses: 0,
        externalPayrollExpenses: 0,
        pendingLiquidations: 0,
        pendingLiquidationsAmount: 0,
        pendingClosings: 0,
        monthlyRevenue: 0,
        revenueChangePercentage: 0,
        totalDeliveryOrders: 0,
        deliveryOrdersChange: 0,
        totalRevenue: 0,
        revenueChange: 0,
        averageRating: 0,
        ratingChange: 0,
        weeklyRevenue: 0,
        previousWeekRevenue: 0,
        pendingPayments: 0,
        pendingPaymentsAmount: 0,
        pendingPaymentsUrgent: 0
      },
    [dashboardData, activeEmployeesCount],
  )

  // Componente para mostrar tendencias
  const TrendIndicator = ({ value }: { value: number }) =>
    value > 0 ? (
      <>
        <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
        <span className="text-green-500">+{value.toFixed(1)}%</span>
      </>
    ) : (
      <>
        <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
        <span className="text-red-500">{value.toFixed(1)}%</span>
      </>
    )

  // Calcular el cambio porcentual para ventas semanales
  const weeklyRevenueChange = stats.previousWeekRevenue > 0 
    ? ((stats.weeklyRevenue - stats.previousWeekRevenue) / stats.previousWeekRevenue) * 100 
    : 0

  // Función para forzar la actualización de los datos
  const handleRefresh = () => {
    fetchDashboardData()
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between space-y-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Bienvenido, {user?.name || "Usuario"}.
              {user?.role === "admin"
                ? " Tienes acceso completo al sistema."
                : user?.role
                  ? ` Estás conectado como ${user.role}.`
                  : " Bienvenido al sistema de gestión."}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" onClick={handleRefresh}>
              Actualizar
            </Button>
            <DateRangePicker dateRange={dateRange} onDateRangeChange={setDateRange} />
            <Button onClick={handleExport}>Exportar</Button>
          </div>
        </div>

        {/* Mostrar error si existe */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error}
              <Button variant="outline" size="sm" className="ml-2" onClick={fetchDashboardData}>
                Reintentar
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Tarjetas de resumen - Primera fila */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Empleados Activos - Se mantiene */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Empleados Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeEmployees}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendIndicator value={stats.activeEmployeesChange} /> respecto al mes anterior
              </div>
            </CardContent>
          </Card>

          {/* Alertas Pendientes - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Alertas Pendientes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAlerts}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Link href="/admin" className="text-blue-500 hover:underline">
                  Ver panel de administración
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Gastos Nómina - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gastos Nómina</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.payrollExpenses)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                Total empleados en todos los locales
              </div>
            </CardContent>
          </Card>

          {/* Nómina Externa - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Nómina Externa</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.externalPayrollExpenses)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                Empleados sin local asignado
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tarjetas de resumen - Segunda fila */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Liquidaciones Pendientes - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Liquidaciones Pendientes</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingLiquidations}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Link href="/nomina" className="text-blue-500 hover:underline">
                  Ver liquidaciones
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Cierres Pendientes - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cierres Pendientes</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingClosings}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <Clock className="mr-1 h-3 w-3 text-amber-500" />
                <span className="text-amber-500">Requieren atención</span>
              </div>
            </CardContent>
          </Card>

          {/* Facturación Mes - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturación Mes</CardTitle>
              <BarChartIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                Total al cierre del día anterior
              </div>
            </CardContent>
          </Card>

          {/* Facturación % - NUEVA */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Facturación %</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <span className={stats.revenueChangePercentage >= 0 ? "text-green-500" : "text-red-500"}>
                  {stats.revenueChangePercentage >= 0 ? "+" : ""}{stats.revenueChangePercentage.toFixed(1)}%
                </span>
              </div>
              <div className="flex items-center text-xs text-muted-foreground">
                vs. mismo período mes anterior
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos principales */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resumen de Ventas</CardTitle>
              <CardDescription>Ventas mensuales del último año</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {dashboardData?.charts?.salesData ? (
                <BarChart data={dashboardData.charts.salesData} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {isLoading ? "Cargando datos..." : "No hay datos disponibles"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Distribución de Ventas</CardTitle>
              <CardDescription>Por plataforma de delivery</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {dashboardData?.charts?.deliveryData ? (
                <PieChart data={dashboardData.charts.deliveryData} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {isLoading ? "Cargando datos..." : "No hay datos disponibles"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Asistencia de Empleados</CardTitle>
              <CardDescription>Últimos 30 días</CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {dashboardData?.charts?.attendanceData ? (
                <LineChart data={dashboardData.charts.attendanceData} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">
                    {isLoading ? "Cargando datos..." : "No hay datos disponibles"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Accesos rápidos */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Accesos Rápidos</CardTitle>
              <CardDescription>Accede rápidamente a las funciones más utilizadas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <Link href="/empleados/nuevo" className="w-full">
                  <Button className="w-full justify-start" variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Nuevo Empleado
                  </Button>
                </Link>
                <Link href="/asistencias" className="w-full">
                  <Button className="w-full justify-start" variant="outline">
                    <Calendar className="mr-2 h-4 w-4" />
                    Registrar Asistencia
                  </Button>
                </Link>
                <Link href="/nomina" className="w-full">
                  <Button className="w-full justify-start" variant="outline">
                    <DollarSign className="mr-2 h-4 w-4" />
                    Ver Nómina
                  </Button>
                </Link>
                <Link href="/caja" className="w-full">
                  <Button className="w-full justify-start" variant="outline">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Control de Caja
                  </Button>
                </Link>
                <Link href="/delivery/pedidosya" className="w-full">
                  <Button className="w-full justify-start" variant="outline">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Estadísticas Delivery
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}