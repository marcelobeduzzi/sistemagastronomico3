"use client"

import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

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
    // Simulación de carga de datos
    setIsLoading(true)

    // Generar datos de ejemplo
    setTimeout(() => {
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
      setIsLoading(false)
    }, 1000)
  }, [dateRange])

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
