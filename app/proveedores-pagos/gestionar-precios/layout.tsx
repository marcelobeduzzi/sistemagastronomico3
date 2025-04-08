import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/dashboard-layout"

export default function GestionarPreciosLayout({
  children,
}: {
  children: ReactNode
}) {
  return <DashboardLayout>{children}</DashboardLayout>
}
