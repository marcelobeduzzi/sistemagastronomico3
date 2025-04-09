import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StockSheetList } from "./stock-sheet-list"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/app/dashboard-layout" // Cambiado de @/components/dashboard-layout

export const metadata = {
  title: "Planillas de Stock",
}

export default function StockCheckPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Planillas de Stock</h1>
          <Button asChild>
            <Link href="/stock-check/new">Nueva Planilla</Link>
          </Button>
        </div>

        <Suspense fallback={<StockSheetListSkeleton />}>
          <StockSheetList />
        </Suspense>
      </div>
    </DashboardLayout>
  )
}

function StockSheetListSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-full" />
    </div>
  )
}

