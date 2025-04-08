import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { StockSheetList } from "./stock-sheet-list"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardLayout } from "@/dashboard-layout"

export const metadata = {
  title: "Planilla de Stock",
}

export default function StockSheetPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Planilla de Stock</h1>
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
      <div className="rounded-lg border">
        <div className="p-4">
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="p-4">
          {Array(5)
            .fill(null)
            .map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
        </div>
      </div>
    </div>
  )
}
