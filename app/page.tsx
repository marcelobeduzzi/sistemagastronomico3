"use client"

import { Calendar } from "@/components/ui/calendar"
import Link from "next/link"
import type { DateRange } from "react-day-picker"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DateRangePicker } from "@/components/date-range-picker"
import { Users, ShoppingCart, DollarSign, Star, TrendingUp, TrendingDown } from "lucide-react"
import { formatCurrency } from "@/lib/export-utils"
import { BarChart, LineChart, PieChart } from "@/components/charts"
import { useSupabaseClient } from "@supabase/auth-helpers-react"

export default function Dashboard() {
  const { user } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(new Date().setDate(new Date().getDate() - 30)),
    to: new Date(),
  })

  const [stats, setStats] = useState({
    activeEmployees: 0,
    activeEmployeesChange: 0,
    totalDeliveryOrders: 0,
    deliveryOrdersChange: 0,
    totalRevenue: 0,
    revenueChange: 0,
    averageRating: 0,
    ratingChange: 0,
  })

  const [isLoading, setIsLoading] = useState(true)
  const [salesData, setSalesData] = useState<any>(null)
  const [deliveryData, setDeliveryData] = useState<any>(null)
  const [attendanceData, setAttendanceData] = useState<any>(null)

  const supabase = useSupabaseClient()

  useEffect(() => {
    let isMounted = true

    const fetchStats = async () => {
      if (!isMounted) return
      setIsLoading(true)

      try {
        // Get active employees count
        const { data: activeEmployees } = await supabase.from("employees").select("id").eq("status", "active")

        // Get delivery orders for the current month
        const currentDate = new Date()
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
        const { data: deliveryOrders } = await supabase
          .from("delivery_stats")
          .select("*")
          .gte("created_at", firstDayOfMonth.toISOString())

        // Calculate statistics
        const stats = {
          activeEmployees: activeEmployees?.length || 0,
          activeEmployeesChange: 5, // Mock data - would need historical data to calculate
          totalDeliveryOrders: deliveryOrders?.length || 0,
          deliveryOrdersChange: 10, // Mock data - would need historical data to calculate
          totalRevenue: deliveryOrders?.reduce((sum, order) => sum + (order.revenue || 0), 0) || 0,
          revenueChange: 15, // Mock data - would need historical data to calculate
          averageRating: 4.5, // Mock data - would need actual ratings
          ratingChange: 0.2, // Mock data - would need historical data to calculate
        }

        if (isMounted) {
          setStats(stats)

          // Prepare data for charts
          const salesData = {
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
          }

          setSalesData(salesData)

          // Delivery data
          const deliveryData = {
            labels: ["PedidosYa", "Rappi", "MercadoPago"],
            datasets: [
              {
                data: [35, 40, 25],
                backgroundColor: ["rgba(255, 99, 132, 0.5)", "rgba(54, 162, 235, 0.5)", "rgba(255, 206, 86, 0.5)"],
                borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"],
                borderWidth: 1,
              },
            ],
          }

          setDeliveryData(deliveryData)

          // Attendance data
          const attendanceLabels = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]
          const attendanceValues = [95, 92, 88, 90, 85, 70, 60]

          setAttendanceData({
            labels: attendanceLabels,
            datasets: [
              {
                label: "Asistencia (%)",
                data: attendanceValues,
                backgroundColor: "rgba(59, 130, 246, 0.5)",
                borderColor: "rgb(59, 130, 246)",
                borderWidth: 1,
              },
            ],
          })
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      isMounted = false
    }
  }, [supabase]) // Add supabase as a dependency

  const handleExport = () => {
    alert("Exportando datos del dashboard...")
  }

  return (
    <DashboardLayout>
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
                {stats.activeEmployeesChange > 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{stats.activeEmployeesChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    <span className="text-red-500">{stats.activeEmployeesChange}%</span>
                  </>
                )}{" "}
                respecto al mes anterior
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
                {stats.deliveryOrdersChange > 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{stats.deliveryOrdersChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    <span className="text-red-500">{stats.deliveryOrdersChange}%</span>
                  </>
                )}{" "}
                respecto a la semana anterior
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
                {stats.revenueChange > 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{stats.revenueChange}%</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    <span className="text-red-500">{stats.revenueChange}%</span>
                  </>
                )}{" "}
                respecto a la semana anterior
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
                {stats.ratingChange > 0 ? (
                  <>
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    <span className="text-green-500">+{stats.ratingChange.toFixed(1)}</span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                    <span className="text-red-500">{stats.ratingChange.toFixed(1)}</span>
                  </>
                )}{" "}
                respecto a la semana anterior
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
              {salesData ? (
                <BarChart data={salesData} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
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
              {deliveryData ? (
                <PieChart
                  data={{
                    labels: ["PedidosYa", "Rappi", "MercadoPago"],
                    datasets: [
                      {
                        data: [35, 40, 25],
                        backgroundColor: [
                          "rgba(255, 99, 132, 0.5)",
                          "rgba(54, 162, 235, 0.5)",
                          "rgba(255, 206, 86, 0.5)",
                        ],
                        borderColor: ["rgba(255, 99, 132, 1)", "rgba(54, 162, 235, 1)", "rgba(255, 206, 86, 1)"],
                        borderWidth: 1,
                      },
                    ],
                  }}
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
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
              {attendanceData ? (
                <LineChart data={attendanceData} />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <p className="text-muted-foreground">Cargando datos...</p>
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

