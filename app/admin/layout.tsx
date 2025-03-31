import type { Metadata } from "next"
import { redirect } from "next/navigation"
import AdminSidebar from "@/components/admin/sidebar"
import AdminHeader from "@/components/admin/header"
import { AdminAuthWrapper } from "@/lib/admin-auth"

export const metadata: Metadata = {
  title: "Panel de Administración - Quadrifoglio",
  description: "Panel de administración del sistema de gestión Quadrifoglio",
}

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AdminAuthWrapper>
      <div className="flex h-screen overflow-hidden">
        <AdminSidebar />
        <div className="flex flex-col flex-1 overflow-hidden">
          <AdminHeader />
          <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </AdminAuthWrapper>
  )
}