"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { ArrowLeft, Download, RefreshCcw } from "lucide-react"
import { StockDiscrepancyTable } from "@/components/conciliacion/stock-discrepancy-table"
import { CashDiscrepancyTable } from "@/components/conciliacion/cash-discrepancy-table"
import { GenerateDiscrepanciesButton } from "@/components/conciliacion/generate-discrepancies-button"

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

export default function LocalDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [localInfo, setLocalInfo] = useState<any>(null)
  const [stockDiscrepancies, setStockDiscrepancies] = useState<any[]>([])
  const [cashDiscrepancies, setCashDiscrepancies] = useState<any[]>([])

  useEffect(() => {
    if (params.id) {
      const localId = Number(params.id)
      const local = locales.find((l) => l.id === localId)

      if (local) {
        setLocalInfo(local)
        loadLocalData(localId)
      } else {
        router.push("/conciliacion")
      }
    }
  }, [params.id])

  useEffect(() => {
    if (localInfo) {
      loadLocalData(localInfo.id)
    }
  }, [selectedDate, localInfo])

  const loadLocalData = async (localId: number) => {
    try {
      setIsLoading(true)

      // Aquí iría la lógica para cargar los datos del local
      // Esto es un ejemplo, deberías adaptarlo a tu estructura de datos

      // Simulación de datos para el ejemplo
      setTimeout(() => {
        // Datos simulados de discrepancias de stock
        const mockStockDiscrepancies = Array.from({ length: 10 }, (_, i) => ({
          id: `stock-${i}`,
          date: selectedDate.toISOString().split("T")[0],
          productId: `prod-${i}`,
          productName: `Producto ${i + 1}`,
          category: i % 3 === 0 ? "Bebidas" : i % 3 === 1 ? "Comidas" : "Otros",
          expectedQuantity: Math.floor(Math.random() * 100),
          actualQuantity: Math.floor(Math.random() * 100),
          difference: Math.floor(Math.random() * 20) - 10,
          unitCost: Math.floor(Math.random() * 1000) + 100,
          totalValue: Math.floor(Math.random() * 10000),
          status: i % 3 === 0 ? "pending" : i % 3 === 1 ? "reconciled" : "unreconciled",
        }))

        // Datos simulados de discrepancias de caja
        const mockCashDiscrepancies = Array.from({ length: 5 }, (_, i) => ({
          id: `cash-${i}`,
          date: selectedDate.toISOString().split("T")[0],
          paymentMethod: i % 3 === 0 ? "cash" : i % 3 === 1 ? "card" : "transfer",
          expectedAmount: Math.floor(Math.random() * 50000) + 10000,
          actualAmount: Math.floor(Math.random() * 50000) + 10000,
          difference: Math.floor(Math.random() * 5000) - 2500,
          status: i % 3 === 0 ? "pending" : i % 3 === 1 ? "reconciled" : "unreconciled",
        }))

        setStockDiscrepancies(mockStockDiscrepancies)
        setCashDiscrepancies(mockCashDiscrepancies)
        setIsLoading(false)
      }, 500)
    } catch (error) {
      console.error("Error al cargar datos del local:", error)
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/conciliacion")
  }

  if (!localInfo) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <p>Cargando...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Encabezado y controles */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{localInfo.name}</h1>
              <p className="text-muted-foreground">Detalle de discrepancias</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <DatePicker
              date={selectedDate}
              onDateChange={setSelectedDate}
              placeholder="Seleccionar fecha"
              format="dd/MM/yyyy"
            />

            <Button variant="outline" size="icon" onClick={() => loadLocalData(localInfo.id)} disabled={isLoading}>
              <RefreshCcw className="h-4 w-4" />
            </Button>

            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>

            <GenerateDiscrepanciesButton />
          </div>
        </div>

        {/* Resumen del local */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Discrepancias Stock</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stockDiscrepancies.length}</div>
              <p className="text-xs text-muted-foreground">
                Valor: ${stockDiscrepancies.reduce((sum, item) => sum + item.totalValue, 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Discrepancias Caja</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{cashDiscrepancies.length}</div>
              <p className="text-xs text-muted-foreground">
                Valor: ${cashDiscrepancies.reduce((sum, item) => sum + Math.abs(item.difference), 0).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Producto Más Afectado</CardTitle>
            </CardHeader>
            <CardContent>
              {stockDiscrepancies.length > 0 && (
                <>
                  <div className="text-2xl font-bold">
                    {stockDiscrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))[0].productName}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Diferencia:{" "}
                    {stockDiscrepancies.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))[0].difference}{" "}
                    unidades
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contenido principal */}
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Discrepancias de Stock</TabsTrigger>
            <TabsTrigger value="caja">Discrepancias de Caja</TabsTrigger>
          </TabsList>

          {/* Pestaña de Discrepancias de Stock */}
          <TabsContent value="stock">
            <Card>
              <CardHeader>
                <CardTitle>Discrepancias de Stock</CardTitle>
              </CardHeader>
              <CardContent>
                <StockDiscrepancyTable discrepancies={stockDiscrepancies} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Pestaña de Discrepancias de Caja */}
          <TabsContent value="caja">
            <Card>
              <CardHeader>
                <CardTitle>Discrepancias de Caja</CardTitle>
              </CardHeader>
              <CardContent>
                <CashDiscrepancyTable discrepancies={cashDiscrepancies} isLoading={isLoading} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
