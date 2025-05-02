"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"

interface CashDiscrepancyTableProps {
  discrepancies: any[]
  isLoading: boolean
}

export function CashDiscrepancyTable({ discrepancies, isLoading }: CashDiscrepancyTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (discrepancies.length === 0) {
    return <p className="text-center py-4 text-muted-foreground">No hay discrepancias de caja para mostrar</p>
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Método de Pago</TableHead>
            <TableHead className="text-right">Monto Esperado</TableHead>
            <TableHead className="text-right">Monto Real</TableHead>
            <TableHead className="text-right">Diferencia</TableHead>
            <TableHead className="text-right">Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {discrepancies.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">
                {item.paymentMethod === "cash"
                  ? "Efectivo"
                  : item.paymentMethod === "card"
                    ? "Tarjeta"
                    : item.paymentMethod === "transfer"
                      ? "Transferencia"
                      : item.paymentMethod}
              </TableCell>
              <TableCell className="text-right">${item.expectedAmount.toLocaleString()}</TableCell>
              <TableCell className="text-right">${item.actualAmount.toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">
                <span
                  className={
                    item.difference === 0 ? "text-green-600" : item.difference > 0 ? "text-amber-600" : "text-red-600"
                  }
                >
                  ${Math.abs(item.difference).toLocaleString()}
                  {item.difference > 0 ? " (sobrante)" : item.difference < 0 ? " (faltante)" : ""}
                </span>
              </TableCell>
              <TableCell className="text-right">
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
                      ? "No Conciliado"
                      : "Pendiente"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
