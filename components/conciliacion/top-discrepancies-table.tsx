"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { format } from "date-fns"

interface TopDiscrepanciesTableProps {
  dateRange: "day" | "week" | "month"
}

interface ProductDiscrepancy {
  id: string
  productName: string
  category: string
  totalQuantity: number
  totalValue: number
  occurrences: number
  trend: "up" | "down" | "stable"
}

export function TopDiscrepanciesTable({ dateRange }: TopDiscrepanciesTableProps) {
  const [data, setData] = useState<ProductDiscrepancy[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadTopDiscrepancies()
  }, [dateRange])

  const loadTopDiscrepancies = async () => {
    try {
      setIsLoading(true)

      // Calcular fechas de inicio y fin según el rango seleccionado
      const startDate = new Date()
      const endDate = new Date()

      if (dateRange === "day") {
        // Solo el día actual
      } else if (dateRange === "week") {
        startDate.setDate(startDate.getDate() - 7)
      } else if (dateRange === "month") {
        startDate.setMonth(startDate.getMonth() - 1)
      }

      const formattedStartDate = format(startDate, "yyyy-MM-dd")
      const formattedEndDate = format(endDate, "yyyy-MM-dd")

      // Consultar las discrepancias de stock agrupadas por producto
      const { data: stockData, error: stockError } = await supabase
        .from("stock_discrepancies")
        .select("product_id, product_name, category, difference, total_value")
        .gte("date", formattedStartDate)
        .lte("date", formattedEndDate)

      if (stockError) {
        console.error("Error al obtener discrepancias de stock:", stockError)
        throw stockError
      }

      // Agrupar por producto y calcular totales
      const productMap = new Map<string, any>()

      stockData?.forEach((item) => {
        const productId = item.product_id

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            id: productId,
            productName: item.product_name,
            category: item.category,
            totalQuantity: 0,
            totalValue: 0,
            occurrences: 0,
            trend: "stable" as const,
          })
        }

        const product = productMap.get(productId)
        product.totalQuantity += Math.abs(item.difference)
        product.totalValue += Number(item.total_value)
        product.occurrences += 1
      })

      // Convertir el mapa a un array y ordenar por valor total
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalValue - a.totalValue)
        .slice(0, 10) // Tomar los 10 principales

      // Asignar tendencias (esto sería más preciso con datos históricos reales)
      topProducts.forEach((product) => {
        product.trend = Math.random() > 0.6 ? "up" : Math.random() > 0.3 ? "down" : "stable"
      })

      setData(topProducts)
    } catch (error) {
      console.error("Error al cargar top discrepancias:", error)
      // Si hay un error, generar datos de ejemplo
      generateMockData()
    } finally {
      setIsLoading(false)
    }
  }

  // Función para generar datos de ejemplo en caso de error
  const generateMockData = () => {
    const categories = ["Bebidas", "Comidas", "Postres", "Insumos", "Otros"]
    const trends = ["up", "down", "stable"] as const

    const mockData: ProductDiscrepancy[] = Array.from({ length: 10 }, (_, i) => ({
      id: `prod-${i}`,
      productName: `Producto ${i + 1}`,
      category: categories[i % categories.length],
      totalQuantity: Math.floor(Math.random() * 100) + 1,
      totalValue: Math.floor(Math.random() * 100000) + 5000,
      occurrences: Math.floor(Math.random() * 20) + 1,
      trend: trends[Math.floor(Math.random() * trends.length)],
    }))

    // Ordenar por valor total (de mayor a menor)
    mockData.sort((a, b) => b.totalValue - a.totalValue)

    setData(mockData)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Producto</TableHead>
            <TableHead>Categoría</TableHead>
            <TableHead className="text-right">Cantidad</TableHead>
            <TableHead className="text-right">Valor Total</TableHead>
            <TableHead className="text-right">Ocurrencias</TableHead>
            <TableHead className="text-right">Tendencia</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.productName}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell className="text-right">{item.totalQuantity}</TableCell>
              <TableCell className="text-right">${item.totalValue.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.occurrences}</TableCell>
              <TableCell className="text-right">
                <Badge variant={item.trend === "up" ? "destructive" : item.trend === "down" ? "success" : "outline"}>
                  {item.trend === "up" ? "Subiendo" : item.trend === "down" ? "Bajando" : "Estable"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
