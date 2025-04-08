import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function SimulacionCostosLayout({
  children,
}: {
  children: ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
