import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { StockSheetList } from "@/components/stock-check/stock-sheet-list"
import { Plus } from "lucide-react"
import Link from "next/link"

export default function StockCheckPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Planillas de Stock</h1>
          <Button asChild>
            <Link href="/stock-check/create">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Planilla
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planillas de Stock</CardTitle>
            <CardDescription>Gestione las planillas de stock para controlar el inventario</CardDescription>
          </CardHeader>
          <CardContent>
            <StockSheetList />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
