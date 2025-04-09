import type { ReactNode } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"

export default function StockCheckLayout({
  children,
}: {
  children: ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
