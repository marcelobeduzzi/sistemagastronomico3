"use client"

import { Calendar } from "@/components/ui/calendar"

import { useEffect, useState, useCallback, useMemo } from "react"
import Link from "next/link"
import type { DateRange } from "react-day-picker"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Users, ShoppingCart, DollarSign, Star, TrendingUp, TrendingDown, AlertCircle, CreditCard } from "lucide-react"
import { formatCurrency } from "@/lib/export-utils"
import { BarChart, LineChart, PieChart } from "@/components/charts"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// Tipos para los datos del dashboard
interface DashboardStats {
  activeEmployees: number
  activeEmployeesChange: number
  totalDeliveryOrders: number
  deliveryOrdersChange: number
  totalRevenue: number
  revenueChange: number
  averageRating: number
  ratingChange: number
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

  // Función para obtener los datos del dashboard
  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/dashboard")

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Error al cargar los datos del dashboard")
      }

      const data = await response.json()
      setDashboardData(data)
    } catch (err) {
      console.error("Error al obtener datos del dashboard:", err)
      setError(err instanceof Error ? err.message : "Error desconocido al cargar los datos")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Efecto para cargar los datos al montar el componente
  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  // Función para exportar datos
  const handleExport = useCallback(() => {
    alert("Exportando datos del dashboard...")
  }, [])

  // Memoizar los stats para evitar re-renderizados innecesarios
  const stats = useMemo(
    () =>
      dashboardData?.stats || {
        activeEmployees: 0,
        activeEmployeesChange: 0,
        totalDeliveryOrders: 0,
        deliveryOrdersChange: 0,
        totalRevenue: 0,
        revenueChange: 0,
        averageRating: 0,
        ratingChange: 0,
      },
    [dashboardData],
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

        {/* Tarjetas de resumen */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pedidos Delivery</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDeliveryOrders}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendIndicator value={stats.deliveryOrdersChange} /> respecto a la semana anterior
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ingresos Delivery</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendIndicator value={stats.revenueChange} /> respecto a la semana anterior
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valoración Promedio</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                <TrendIndicator value={stats.ratingChange} /> respecto a la semana anterior
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





