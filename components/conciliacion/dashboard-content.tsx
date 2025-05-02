"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { toast } from "@/components/ui/use-toast"
import { RefreshCcw, Download } from "lucide-react"
import { LocalSummaryCard } from "./local-summary-card"
import { DiscrepancyTrend } from "./discrepancy-trend"
import { TopDiscrepanciesTable } from "./top-discrepancies-table"
import { GenerateDiscrepanciesButton } from "./generate-discrepancies-button"

// Lista fija de locales con IDs numéricos
const locales = [
  { id: 1, name: "BR Cabildo" },
  { id: 2, name: "BR Carranza" },
  { id: 3, name: "BR Pacífico" },
  { id: 4, name: "BR Lavalle" },
  { id: 5, name: "BR Rivadavia" },
  { id: 6, name: "BR Aguero" },
  { id: 7, name: "BR Dorrego" },
  { id: 8, name: "Dean & Dennys" },
]

export function DashboardContent() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dateRange, setDateRange] = useState<"day" | "week" | "month">("week")
  const [summaryData, setSummaryData] = useState<any>({
    totalStockDiscrepancies: 0,
    totalCashDiscrepancies: 0,
    totalStockValue: 0,
    totalCashValue: 0,
    locales: [],
  })

  // Cargar datos del dashboard
  useEffect(() => {
    loadDashboardData()
  }, [selectedDate, dateRange])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)

      // Aquí iría la lógica para cargar los datos del dashboard
      // Esto es un ejemplo, deberías adaptarlo a tu estructura de datos

      // Simulación de datos para el ejemplo
      const startDate = new Date(selectedDate)
      const endDate = new Date(selectedDate)

      if (dateRange === "week") {
        endDate.setDate(endDate.getDate() + 7)
      } else if (dateRange === "month") {
        endDate.setMonth(endDate.getMonth() + 1)
      }

      // Datos simulados para cada local
      const localesData = locales.map((local) => {
        const stockDiscrepancies = Math.floor(Math.random() * 20)
        const cashDiscrepancies = Math.floor(Math.random() * 10)
        const stockValue = Math.floor(Math.random() * 50000)
        const cashValue = Math.floor(Math.random() * 30000)

        return {
          id: local.id,
          name: local.name,
          stockDiscrepancies,
          cashDiscrepancies,
          stockValue,
          cashValue,
          totalDiscrepancies: stockDiscrepancies + cashDiscrepancies,
          totalValue: stockValue + cashValue,
          trend: Math.random() > 0.5 ? "up" : "down",
          percentChange: Math.floor(Math.random() * 30),
        }
      })

      // Ordenar locales por valor total de discrepancias (de mayor a menor)
      localesData.sort((a, b) => b.totalValue - a.totalValue)

      // Calcular totales
      const totalStockDiscrepancies = localesData.reduce((sum, local) => sum + local.stockDiscrepancies, 0)
      const totalCashDiscrepancies = localesData.reduce((sum, local) => sum + local.cashDiscrepancies, 0)
      const totalStockValue = localesData.reduce((sum, local) => sum + local.stockValue, 0)
      const totalCashValue = localesData.reduce((sum, local) => sum + local.cashValue, 0)

      setSummaryData({
        totalStockDiscrepancies,
        totalCashDiscrepancies,
        totalStockValue,
        totalCashValue,
        locales: localesData,
      })
    } catch (error) {
      console.error("Error al cargar datos del dashboard:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del dashboard",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleLocalClick = (localId: number) => {
    router.push(`/conciliacion/local/${localId}`)
  }

  const handleGenerateDiscrepancies = () => {
    router.push("/conciliacion/generar")
  }

  const handleExportData = () => {
    toast({
      title: "Exportando datos",
      description: "Los datos se están exportando a Excel",
    })
    // Aquí iría la lógica para exportar datos
  }

  return (
    <div className="space-y-6">
      {/* Encabezado y controles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Conciliación</h1>
          <p className="text-muted-foreground">Resumen de discrepancias de stock y caja por local</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DatePicker date={selectedDate} onDateChange={setSelectedDate} />

          <div className="border rounded-md">
            <Button variant={dateRange === "day" ? "default" : "ghost"} size="sm" onClick={() => setDateRange("day")}>
              Día
            </Button>
            <Button variant={dateRange === "week" ? "default" : "ghost"} size="sm" onClick={() => setDateRange("week")}>
              Semana
            </Button>
            <Button
              variant={dateRange === "month" ? "default" : "ghost"}
              size="sm"
              onClick={() => setDateRange("month")}
            >
              Mes
            </Button>
          </div>

          <Button variant="outline" size="icon" onClick={loadDashboardData} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleExportData}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          <GenerateDiscrepanciesButton />
        </div>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Discrepancias Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalStockDiscrepancies}</div>
            <p className="text-xs text-muted-foreground">Valor: ${summaryData.totalStockValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Discrepancias Caja</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summaryData.totalCashDiscrepancies}</div>
            <p className="text-xs text-muted-foreground">Valor: ${summaryData.totalCashValue.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Local con Más Discrepancias</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryData.locales.length > 0 && (
              <>
                <div className="text-2xl font-bold">{summaryData.locales[0].name}</div>
                <p className="text-xs text-muted-foreground">
                  {summaryData.locales[0].totalDiscrepancies} discrepancias
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Mayor Valor en Discrepancias</CardTitle>
          </CardHeader>
          <CardContent>
            {summaryData.locales.length > 0 && (
              <>
                <div className="text-2xl font-bold">${summaryData.locales[0].totalValue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{summaryData.locales[0].name}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <Tabs defaultValue="locales">
        <TabsList>
          <TabsTrigger value="locales">Locales</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          <TabsTrigger value="productos">Top Productos</TabsTrigger>
        </TabsList>

        {/* Pestaña de Locales */}
        <TabsContent value="locales" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaryData.locales.map((local) => (
              <LocalSummaryCard key={local.id} local={local} onClick={() => handleLocalClick(local.id)} />
            ))}
          </div>
        </TabsContent>

        {/* Pestaña de Tendencias */}
        <TabsContent value="tendencias">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Discrepancias de Stock</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <DiscrepancyTrend type="stock" dateRange={dateRange} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Discrepancias de Caja</CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <DiscrepancyTrend type="cash" dateRange={dateRange} />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pestaña de Top Productos */}
        <TabsContent value="productos">
          <Card>
            <CardHeader>
              <CardTitle>Productos con Más Discrepancias</CardTitle>
              <CardDescription>Los productos con mayor cantidad y valor en discrepancias</CardDescription>
            </CardHeader>
            <CardContent>
              <TopDiscrepanciesTable dateRange={dateRange} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
