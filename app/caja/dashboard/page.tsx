"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, BarChart3, PieChart, Calendar } from "lucide-react"

// Datos de ejemplo para el dashboard
const dashboardDataMock = {
  ventasTotales: {
    valor: 1250000,
    cambio: 8.5,
    periodo: "mes",
  },
  ventasEfectivo: {
    valor: 450000,
    cambio: -2.3,
    periodo: "mes",
  },
  ventasTarjeta: {
    valor: 650000,
    cambio: 12.7,
    periodo: "mes",
  },
  ventasDigitales: {
    valor: 150000,
    cambio: 25.4,
    periodo: "mes",
  },
  diferencias: {
    valor: 12500,
    cambio: -15.2,
    periodo: "mes",
    porcentaje: 1.2,
  },
  alertas: {
    total: 8,
    criticas: 2,
    pendientes: 5,
    cambio: 3,
    periodo: "mes",
  },
  graficoVentasPorLocal: {
    labels: [
      "BR Cabildo",
      "BR Carranza",
      "BR Pacífico",
      "BR Lavalle",
      "BR Rivadavia",
      "BR Aguero",
      "BR Dorrego",
      "Dean & Dennys",
    ],
    datasets: [
      {
        label: "Ventas",
        data: [250000, 180000, 220000, 150000, 190000, 130000, 80000, 50000],
      },
    ],
  },
  graficoVentasPorMetodo: {
    labels: ["Efectivo", "Tarjeta Crédito", "Tarjeta Débito", "MercadoPago", "Transferencia", "Otros"],
    datasets: [
      {
        label: "Porcentaje",
        data: [36, 28, 24, 8, 3, 1],
      },
    ],
  },
  graficoVentasPorTurno: {
    labels: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"],
    datasets: [
      {
        label: "Turno Mañana",
        data: [45000, 48000, 52000, 49000, 68000, 72000, 58000],
      },
      {
        label: "Turno Tarde",
        data: [65000, 62000, 70000, 68000, 82000, 95000, 75000],
      },
    ],
  },
}

// Lista de locales para filtrar
const locales = [
  { id: "all", name: "Todos los locales" },
  { id: "cabildo", name: "BR Cabildo" },
  { id: "carranza", name: "BR Carranza" },
  { id: "pacifico", name: "BR Pacífico" },
  { id: "lavalle", name: "BR Lavalle" },
  { id: "rivadavia", name: "BR Rivadavia" },
  { id: "aguero", name: "BR Aguero" },
  { id: "dorrego", name: "BR Dorrego" },
  { id: "dean_dennys", name: "Dean & Dennys" },
]

export default function DashboardCajaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [periodo, setPeriodo] = useState("mes")
  const [localId, setLocalId] = useState("all")
  const [dashboardData, setDashboardData] = useState<any>(null)

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        // Aquí iría la lógica para cargar datos de la API
        // Por ahora, usamos datos de ejemplo
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setDashboardData(dashboardDataMock)
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [periodo, localId])

  // Formatear moneda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  if (!dashboardData) {
    return (
      <DashboardLayout isLoading={true}>
        <div className="container mx-auto py-6">
          <p>Cargando datos del dashboard...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Dashboard de Caja</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/caja")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Gestión de Caja
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Seleccionar período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dia">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
              <SelectItem value="trimestre">Este trimestre</SelectItem>
              <SelectItem value="anio">Este año</SelectItem>
            </SelectContent>
          </Select>

          <Select value={localId} onValueChange={setLocalId}>
            <SelectTrigger className="w-full md:w-[200px]">
              <SelectValue placeholder="Seleccionar local" />
            </SelectTrigger>
            <SelectContent>
              {locales.map((local) => (
                <SelectItem key={local.id} value={local.id}>
                  {local.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tarjetas de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Ventas Totales */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ventas Totales</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.ventasTotales.valor)}</div>
                <div
                  className={`flex items-center ${dashboardData.ventasTotales.cambio >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {dashboardData.ventasTotales.cambio >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  <span>{Math.abs(dashboardData.ventasTotales.cambio)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Comparado con el {dashboardData.ventasTotales.periodo} anterior
              </p>
            </CardContent>
          </Card>

          {/* Ventas en Efectivo */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ventas en Efectivo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.ventasEfectivo.valor)}</div>
                <div
                  className={`flex items-center ${dashboardData.ventasEfectivo.cambio >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {dashboardData.ventasEfectivo.cambio >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  <span>{Math.abs(dashboardData.ventasEfectivo.cambio)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {Math.round((dashboardData.ventasEfectivo.valor / dashboardData.ventasTotales.valor) * 100)}% del total
                de ventas
              </p>
            </CardContent>
          </Card>

          {/* Diferencias de Caja */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Diferencias de Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{formatCurrency(dashboardData.diferencias.valor)}</div>
                <div
                  className={`flex items-center ${dashboardData.diferencias.cambio >= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {dashboardData.diferencias.cambio >= 0 ? (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  )}
                  <span>{Math.abs(dashboardData.diferencias.cambio)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {dashboardData.diferencias.porcentaje}% de las ventas en efectivo
              </p>
            </CardContent>
          </Card>

          {/* Alertas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold">{dashboardData.alertas.total}</div>
                <div
                  className={`flex items-center ${dashboardData.alertas.cambio <= 0 ? "text-green-600" : "text-red-600"}`}
                >
                  {dashboardData.alertas.cambio <= 0 ? (
                    <TrendingDown className="mr-1 h-4 w-4" />
                  ) : (
                    <TrendingUp className="mr-1 h-4 w-4" />
                  )}
                  <span>{Math.abs(dashboardData.alertas.cambio)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">{dashboardData.alertas.pendientes} pendientes</span>
                {dashboardData.alertas.criticas > 0 && (
                  <span className="flex items-center text-xs text-red-600">
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {dashboardData.alertas.criticas} críticas
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gráficos */}
        <div className="space-y-6">
          <Tabs defaultValue="ventas" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ventas">
                <BarChart3 className="mr-2 h-4 w-4" />
                Ventas por Local
              </TabsTrigger>
              <TabsTrigger value="metodos">
                <PieChart className="mr-2 h-4 w-4" />
                Métodos de Pago
              </TabsTrigger>
              <TabsTrigger value="turnos">
                <Calendar className="mr-2 h-4 w-4" />
                Ventas por Turno
              </TabsTrigger>
            </TabsList>
            <TabsContent value="ventas">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Local</CardTitle>
                  <CardDescription>Distribución de ventas por local durante el período seleccionado</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {/* Aquí iría el componente de gráfico de barras */}
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">Gráfico de barras: Ventas por Local</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="metodos">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Método de Pago</CardTitle>
                  <CardDescription>Porcentaje de ventas por cada método de pago</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {/* Aquí iría el componente de gráfico circular */}
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">Gráfico circular: Métodos de Pago</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="turnos">
              <Card>
                <CardHeader>
                  <CardTitle>Ventas por Turno</CardTitle>
                  <CardDescription>Comparativa de ventas entre turnos de mañana y tarde</CardDescription>
                </CardHeader>
                <CardContent className="h-80">
                  {/* Aquí iría el componente de gráfico de líneas */}
                  <div className="h-full flex items-center justify-center bg-muted/20 rounded-md">
                    <p className="text-muted-foreground">Gráfico de líneas: Ventas por Turno</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}

