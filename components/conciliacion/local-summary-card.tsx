"use client"

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingDown, TrendingUp, AlertTriangle, Store } from "lucide-react"

interface LocalSummaryCardProps {
  local: {
    id: number
    name: string
    stockDiscrepancies: number
    cashDiscrepancies: number
    stockValue: number
    cashValue: number
    totalDiscrepancies: number
    totalValue: number
    trend: "up" | "down"
    percentChange: number
  }
  onClick: () => void
}

export function LocalSummaryCard({ local, onClick }: LocalSummaryCardProps) {
  const hasCriticalIssue = local.totalValue > 20000 || local.totalDiscrepancies > 15

  return (
    <Card className={hasCriticalIssue ? "border-red-300" : ""}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-medium flex items-center">
            <Store className="h-4 w-4 mr-2" />
            {local.name}
          </CardTitle>
          {hasCriticalIssue && <AlertTriangle className="h-5 w-5 text-red-500" />}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <p className="text-sm text-muted-foreground">Discrepancias Stock</p>
            <p className="font-medium">{local.stockDiscrepancies}</p>
            <p className="text-xs text-muted-foreground">${local.stockValue.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Discrepancias Caja</p>
            <p className="font-medium">{local.cashDiscrepancies}</p>
            <p className="text-xs text-muted-foreground">${local.cashValue.toLocaleString()}</p>
          </div>
        </div>

        <div className="mt-4 flex items-center">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">Tendencia</p>
            <div className="flex items-center">
              {local.trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
              ) : (
                <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
              )}
              <span className={local.trend === "up" ? "text-red-500" : "text-green-500"}>
                {local.percentChange}% {local.trend === "up" ? "más" : "menos"}
              </span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="font-bold">${local.totalValue.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" onClick={onClick}>
          Ver Detalles
        </Button>
      </CardFooter>
    </Card>
  )
}
