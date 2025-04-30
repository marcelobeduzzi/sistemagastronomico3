"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingDown, TrendingUp, Search } from "lucide-react"

interface StockDiscrepancy {
  id: string
  date: string
  localId: string
  productId: string
  productName: string
  expectedQuantity: number
  actualQuantity: number
  difference: number
  unitCost: number
  totalValue: number
  status: "pending" | "reconciled" | "unreconciled"
  reconciliationId?: string
}

interface StockDiscrepancyTableProps {
  discrepancies: StockDiscrepancy[]
  isLoading: boolean
}

export function StockDiscrepancyTable({ discrepancies, isLoading }: StockDiscrepancyTableProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredDiscrepancies = discrepancies.filter((item) =>
    item.productName.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Discrepancias de Stock</CardTitle>
        <CardDescription>Diferencias entre stock esperado y real</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por producto..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : discrepancies.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay discrepancias de stock para la fecha y local seleccionados
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead>Esperado</TableHead>
                  <TableHead>Real</TableHead>
                  <TableHead>Diferencia</TableHead>
                  <TableHead>Valor Unitario</TableHead>
                  <TableHead>Valor Total</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDiscrepancies.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.productName}</TableCell>
                    <TableCell>{item.expectedQuantity}</TableCell>
                    <TableCell>{item.actualQuantity}</TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <span className={item.difference < 0 ? "text-red-500" : "text-green-500"}>
                          {item.difference}
                        </span>
                        {item.difference !== 0 &&
                          (item.difference < 0 ? (
                            <TrendingDown className="ml-1 h-4 w-4 text-red-500" />
                          ) : (
                            <TrendingUp className="ml-1 h-4 w-4 text-green-500" />
                          ))}
                      </div>
                    </TableCell>
                    <TableCell>${item.unitCost.toLocaleString()}</TableCell>
                    <TableCell className={item.totalValue < 0 ? "text-red-500" : "text-green-500"}>
                      ${Math.abs(item.totalValue).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.status === "reconciled"
                            ? "success"
                            : item.status === "unreconciled"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {item.status === "reconciled"
                          ? "Conciliado"
                          : item.status === "unreconciled"
                            ? "No conciliado"
                            : "Pendiente"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
