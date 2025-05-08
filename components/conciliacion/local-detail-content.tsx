"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/ui/date-picker"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Download, RefreshCcw, Plus } from "lucide-react"
import { StockDiscrepancyTable } from "@/components/conciliacion/stock-discrepancy-table"
import { CashDiscrepancyTable } from "@/components/conciliacion/cash-discrepancy-table"
import { DiscrepancyHistory } from "@/components/conciliacion/discrepancy-history"
import { ReconciliationService } from "@/lib/reconciliation-service"
import { toast } from "@/components/ui/use-toast"

// Lista fija de locales con IDs numéricos
const locales = [
  { id: 1, name: "BR Cabildo", hasTwoCashRegisters: false },
  { id: 2, name: "BR Carranza", hasTwoCashRegisters: false },
  { id: 3, name: "BR Pacífico", hasTwoCashRegisters: true },
  { id: 4, name: "BR Lavalle", hasTwoCashRegisters: true },
  { id: 5, name: "BR Rivadavia", hasTwoCashRegisters: false },
  { id: 6, name: "BR Aguero", hasTwoCashRegisters: true },
  { id: 7, name: "BR Dorrego", hasTwoCashRegisters: false },
  { id: 8, name: "Dean & Dennys", hasTwoCashRegisters: false },
]

// Opciones de turno
const turnos = [
  { value: "todos", label: "Todos los turnos" },
  { value: "mañana", label: "Mañana" },
  { value: "tarde", label: "Tarde" },
]

interface LocalDetailContentProps {
  localId: number
  initialLocalName: string
}

export function LocalDetailContent({ localId, initialLocalName }: LocalDetailContentProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedShift, setSelectedShift] = useState<string>("todos")
  const [localInfo, setLocalInfo] = useState<any>({ id: localId, name: initialLocalName })
  const [stockDiscrepancies, setStockDiscrepancies] = useState<any[]>([])
  const [cashDiscrepancies, setCashDiscrepancies] = useState<any[]>([])
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)

  // Cargar parámetros de la URL si existen
  useEffect(() => {
    const dateParam = searchParams.get("date")
    const shiftParam = searchParams.get("shift")

    if (dateParam) {
      setSelectedDate(new Date(dateParam))
    }

    if (shiftParam) {
      setSelectedShift(shiftParam)
    }
  }, [searchParams])

  // Cargar información del local
  useEffect(() => {
    const local = locales.find((l) => l.id === localId)
    if (local) {
      setLocalInfo(local)
    }
  }, [localId])

  // Cargar datos iniciales o buscar la última fecha con discrepancias
  useEffect(() => {
    if (!hasLoadedInitialData && localInfo) {
      loadLastDiscrepancyDate()
    }
  }, [localInfo, hasLoadedInitialData])

  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (localInfo && hasLoadedInitialData) {
      loadLocalData()
    }
  }, [selectedDate, selectedShift, localInfo, hasLoadedInitialData])

  // Buscar la última fecha con discrepancias
  const loadLastDiscrepancyDate = async () => {
    try {
      setIsLoading(true)

      // Buscar la última fecha con discrepanciasias para este local
      const { data, error } = await ReconciliationService.getLastDiscrepancyDate(localId)

      if (error) {
        console.error("Error al buscar la última fecha con discrepancias:", error)
        // Si hay error, usar la fecha actual
        setSelectedDate(new Date())
      } else if (data && data.length > 0) {
        // Usar la última fecha con discrepancias
        setSelectedDate(new Date(data[0].date))

        // Si hay un turno específico, usarlo también
        if (data[0].shift) {
          setSelectedShift(data[0].shift)
        }
      } else {
        // Si no hay discrepancias previas, usar el día anterior
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        setSelectedDate(yesterday)
      }

      setHasLoadedInitialData(true)
    } catch (error) {
      console.error("Error al cargar la última fecha con discrepancias:", error)
      setHasLoadedInitialData(true)
    } finally {
      setIsLoading(false)
    }
  }

  const loadLocalData = async () => {
    try {
      setIsLoading(true)

      const formattedDate = selectedDate.toISOString().split("T")[0]

      // Cargar discrepancias de stock
      const stockData = await ReconciliationService.getStockDiscrepancies(
        formattedDate,
        localId,
        selectedShift === "todos" ? undefined : selectedShift,
      )
      setStockDiscrepancies(stockData)

      // Cargar discrepancias de caja
      const cashData = await ReconciliationService.getCashDiscrepancies(
        formattedDate,
        localId,
        selectedShift === "todos" ? undefined : selectedShift,
      )
      setCashDiscrepancies(cashData)

      if (stockData.length === 0 && cashData.length === 0) {
        toast({
          title: "Sin datos",
          description: `No se encontraron discrepancias para ${localInfo.name} en la fecha y turno seleccionados`,
          variant: "warning",
        })
      }
    } catch (error) {
      console.error("Error al cargar datos del local:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos del local",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    router.push("/conciliacion")
  }

  const handleExport = () => {
    toast({
      title: "Exportando",
      description: "Función de exportación en desarrollo",
    })
  }

  const handleGenerateDiscrepancies = () => {
    router.push(`/conciliacion/generar-discrepancias?localId=${localId}`)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Encabezado y controles */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={handleBack} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{localInfo.name}</h1>
            <p className="text-muted-foreground">
              Detalle de discrepancias
              {localInfo.hasTwoCashRegisters && " (Local con 2 cajas)"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <DatePicker
            date={selectedDate}
            onDateChange={setSelectedDate}
            placeholder="Seleccionar fecha"
            format="dd/MM/yyyy"
          />

          <div className="w-[180px]">
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar turno" />
              </SelectTrigger>
              <SelectContent>
                {turnos.map((turno) => (
                  <SelectItem key={turno.value} value={turno.value}>
                    {turno.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" size="icon" onClick={loadLocalData} disabled={isLoading}>
            <RefreshCcw className="h-4 w-4" />
          </Button>

          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>

          {/* Botón destacado para generar discrepancias */}
          <Button onClick={handleGenerateDiscrepancies}>
            <Plus className="mr-2 h-4 w-4" />
            Generar Discrepancias
          </Button>
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
              Valor: ${stockDiscrepancies.reduce((sum, item) => sum + (item.totalValue || 0), 0).toLocaleString()}
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
              Valor: $
              {cashDiscrepancies.reduce((sum, item) => sum + Math.abs(item.difference || 0), 0).toLocaleString()}
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
                  {
                    stockDiscrepancies.sort((a, b) => Math.abs(b.difference || 0) - Math.abs(a.difference || 0))[0]
                      .productName
                  }
                </div>
                <p className="text-xs text-muted-foreground">
                  Diferencia:{" "}
                  {
                    stockDiscrepancies.sort((a, b) => Math.abs(b.difference || 0) - Math.abs(a.difference || 0))[0]
                      .difference
                  }{" "}
                  unidades
                </p>
              </>
            )}
            {stockDiscrepancies.length === 0 && (
              <div className="text-sm text-muted-foreground">No hay datos disponibles</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Contenido principal */}
      <Tabs defaultValue="stock">
        <TabsList>
          <TabsTrigger value="stock">Discrepancias de Stock</TabsTrigger>
          <TabsTrigger value="caja">Discrepancias de Caja</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
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

        {/* Pestaña de Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Discrepancias</CardTitle>
            </CardHeader>
            <CardContent>
              <DiscrepancyHistory localId={localId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
