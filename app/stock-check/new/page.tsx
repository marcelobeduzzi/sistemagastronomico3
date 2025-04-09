import Link from "next/link"
import { Button } from "@/components/ui/button"
import { CreateStockSheetForm } from "../create-stock-sheet-form"
import { DashboardLayout } from "@/app/dashboard-layout"

export const metadata = {
  title: "Nueva Planilla de Stock",
}

export default function NewStockSheetPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Nueva Planilla de Stock</h1>
          <Button variant="outline" asChild>
            <Link href="/stock-check">Cancelar</Link>
          </Button>
        </div>

        <div className="rounded-lg border p-6">
          <CreateStockSheetForm />
        </div>
      </div>
    </DashboardLayout>
  )
}
