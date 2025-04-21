"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Tag, Boxes, ShoppingBag, AlertTriangle, Store, ChevronRight, Home, BarChart, PlusCircle } from 'lucide-react'
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DashboardLayout } from "@/app/dashboard-layout"

interface SidebarItem {
  title: string
  href: string
  icon: any
}

export default function VentasLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  const sidebarItems: SidebarItem[] = [
    {
      title: "Dashboard",
      href: "/ventas",
      icon: Home,
    },
    {
      title: "Nueva Venta",
      href: "/ventas/nueva",
      icon: PlusCircle,
    },
    {
      title: "Historial de Ventas",
      href: "/ventas/historial",
      icon: ShoppingBag,
    },
    {
      title: "Productos",
      href: "/ventas/productos",
      icon: Tag,
    },
    {
      title: "Inventario",
      href: "/ventas/inventario",
      icon: Boxes,
    },
    {
      title: "Alertas de Stock",
      href: "/ventas/alertas",
      icon: AlertTriangle,
    },
    {
      title: "Reportes",
      href: "/ventas/reportes",
      icon: BarChart,
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex min-h-screen">
        {/* Sidebar interno para la sección de ventas */}
        <aside className="hidden w-56 border-r bg-card p-4 md:block">
          <div className="mb-4 flex items-center">
            <Store className="mr-2 h-5 w-5" />
            <h2 className="text-lg font-semibold">Sistema de Ventas</h2>
          </div>
          <nav className="space-y-1">
            {sidebarItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                  pathname === item.href || pathname.startsWith(`${item.href}/`) 
                    ? "bg-accent text-accent-foreground" 
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                <span>{item.title}</span>
                {pathname === item.href && <ChevronRight className="ml-auto h-4 w-4" />}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Versión móvil: Navegación horizontal */}
        <div className="md:hidden w-full border-b bg-card p-2 flex overflow-x-auto space-x-2">
          {sidebarItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={pathname === item.href || pathname.startsWith(`${item.href}/`) ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
              </Button>
            </Link>
          ))}
        </div>

        {/* Contenido principal */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    </DashboardLayout>
  )
}