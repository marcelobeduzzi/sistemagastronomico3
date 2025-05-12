"use client"

import { format } from "date-fns"
import { es } from "date-fns/locale"
import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "@radix-ui/react-icons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabaseClient"
import { Skeleton } from "@/components/ui/skeleton"
import { AnalisisConciliacion } from "./analisis-conciliacion"

type DashboardData = {
  total_expected: number
  total_actual: number
  total_difference: number
  location_id: string
  location_name: string
}

type LocalSummary = {
  id: string
  name: string
  expected: number
  actual: number
  difference: number
}

export function ConciliacionDashboard() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [localSummaries, setLocalSummaries] = useState<LocalSummary[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const [stockDiscrepancies, setStockDiscrepancies] = useState<any[]>([])
  const [cashDiscrepancies, setCashDiscrepancies] = useState<any[]>([])

  useEffect(() => {
    if (date) {
      setSelectedDate(date)
    }
  }, [date])

  useEffect(() => {
    loadDashboardData()
  }, [selectedDate])

  const loadDashboardData = async () => {
    setIsLoading(true)
    const formattedStartDate = format(selectedDate, "yyyy-MM-dd")
    const formattedEndDate = format(selectedDate, "yyyy-MM-dd")

    try {
      const { data, error } = await supabase
        .from("daily_summary")
        .select("*")
        .gte("date", formattedStartDate)
        .lte("date", formattedEndDate)

      if (error) {
        console.error("Error fetching data:", error)
        toast({
          title: "Error",
          description: "Failed to load dashboard data.",
          variant: "destructive",
        })
        return
      }

      if (!data || data.length === 0) {
        setLocalSummaries([])
        toast({
          title: "No data",
          description: "No data found for the selected date.",
        })
        return
      }

      // Transformar los datos para el resumen por local
      const summaries: LocalSummary[] = data.map((item: any) => ({
        id: item.location_id,
        name: item.location_name,
        expected: item.total_expected,
        actual: item.total_actual,
        difference: item.total_difference,
      }))

      setLocalSummaries(summaries)

      // Recopilar todas las discrepancias para el análisis global
      let allStockDiscrepancies: any[] = []
      let allCashDiscrepancies: any[] = []

      for (const local of localSummaries) {
        try {
          // Obtener discrepancias de stock para este local
          const { data: stockData, error: stockError } = await supabase
            .from("stock_discrepancies")
            .select("*")
            .gte("date", formattedStartDate)
            .lte("date", formattedEndDate)
            .eq("location_id", local.id)

          if (stockError) {
            console.error(`Error al obtener discrepancias detalladas de stock para ${local.name}:`, stockError)
            continue
          }

          // Obtener discrepancias de caja para este local
          const { data: cashData, error: cashError } = await supabase
            .from("cash_discrepancies")
            .select("*")
            .gte("date", formattedStartDate)
            .lte("date", formattedEndDate)
            .eq("location_id", local.id)

          if (cashError) {
            console.error(`Error al obtener discrepancias detalladas de caja para ${local.name}:`, cashError)
            continue
          }

          // Agregar a las colecciones globales
          if (stockData) {
            // Transformar los datos al formato esperado por AnalisisConciliacion
            const formattedStockData = stockData.map((item) => ({
              id: item.id,
              productId: item.product_id,
              productName: item.product_name,
              expectedQuantity: item.expected_quantity,
              actualQuantity: item.actual_quantity,
              quantityDifference: item.quantity_difference,
              unitPrice: item.unit_price,
              totalValue: item.total_value,
            }))
            allStockDiscrepancies = [...allStockDiscrepancies, ...formattedStockData]
          }

          if (cashData) {
            // Transformar los datos al formato esperado por AnalisisConciliacion
            const formattedCashData = cashData.map((item) => ({
              id: item.id,
              category: item.payment_method,
              expectedAmount: item.expected_amount,
              actualAmount: item.actual_amount,
              difference: item.difference,
            }))
            allCashDiscrepancies = [...allCashDiscrepancies, ...formattedCashData]
          }
        } catch (error) {
          console.error(`Error al procesar datos detallados para ${local.name}:`, error)
        }
      }

      // Actualizar estados con todas las discrepancias
      setStockDiscrepancies(allStockDiscrepancies)
      setCashDiscrepancies(allCashDiscrepancies)

      // Ordenar los locales por nombre
      setLocalSummaries(summaries.sort((a, b) => a.name.localeCompare(b.name)))
    } catch (error) {
      console.error("Unexpected error:", error)
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Conciliación</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn("w-[280px] justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP", { locale: es }) : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(date) => date > new Date() || date < new Date("2023-01-01")}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Tabs defaultValue="resumen" className="w-full space-y-4">
        <TabsList>
          <TabsTrigger value="resumen">Resumen</TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
          <TabsTrigger value="analisis">Análisis</TabsTrigger>
        </TabsList>
        <TabsContent value="resumen">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Skeleton className="h-6 w-40" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Skeleton className="h-6 w-40" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Skeleton className="h-6 w-40" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24 mt-2" />
                  </CardContent>
                </Card>
              </>
            ) : (
              localSummaries.map((local) => (
                <Card key={local.id}>
                  <CardHeader>
                    <CardTitle>{local.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Esperado: ${local.expected.toFixed(2)}</p>
                      <p className="text-sm font-medium">Real: ${local.actual.toFixed(2)}</p>
                      <p className="text-sm font-medium">
                        Diferencia:{" "}
                        <Badge variant={local.difference > 0 ? "destructive" : "secondary"}>
                          ${local.difference.toFixed(2)}
                        </Badge>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Conciliación</CardTitle>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aquí puedes ver el historial de conciliaciones por local.
                </p>
              </CardContent>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[100px]" />
                  <Skeleton className="h-4 w-[100px]" />
                </div>
              ) : localSummaries.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Local</TableHead>
                      <TableHead>Esperado</TableHead>
                      <TableHead>Real</TableHead>
                      <TableHead>Diferencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localSummaries.map((local) => (
                      <TableRow key={local.id}>
                        <TableCell className="font-medium">{local.name}</TableCell>
                        <TableCell>${local.expected.toFixed(2)}</TableCell>
                        <TableCell>${local.actual.toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={local.difference > 0 ? "destructive" : "secondary"}>
                            ${local.difference.toFixed(2)}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No hay datos para mostrar en la fecha seleccionada.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Pestaña de Análisis */}
        <TabsContent value="analisis">
          <div className="mt-4">
            {stockDiscrepancies.length > 0 || cashDiscrepancies.length > 0 ? (
              <AnalisisConciliacion
                stockDiscrepancies={stockDiscrepancies}
                cashDiscrepancies={cashDiscrepancies}
                fecha={format(selectedDate, "yyyy-MM-dd")}
              />
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Análisis de Conciliación</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-center py-4 text-muted-foreground">
                    No hay datos de discrepancias para analizar en el período seleccionado. Seleccione otra fecha o
                    rango y cargue los datos.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
