"use client"

import type React from "react"

import { useState, useEffect, useCallback, memo, useMemo } from "react"
import { Shield } from 'lucide-react'
import { BarChart3, Users, DollarSign, Calendar, Settings, ChevronDown, Menu, TrendingUp, LogOut, ClipboardCheck, ReceiptText, PieChart, LayoutDashboard, Star, MessageSquare, ShoppingCart, CreditCard, Package } from 'lucide-react'
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Settings,
  ChevronDown,
  Menu,
  TrendingUp,
  LogOut,
  ClipboardCheck,
  ReceiptText,
  PieChart,
  LayoutDashboard,
  Star,
  MessageSquare,
  ShoppingCart,
  CreditCard,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useAuth } from "@/lib/auth-context"
import { Header } from "@/components/header"

// Import the loading spinner
import { LoadingSpinner } from "@/components/loading-spinner"

interface NavItem {
  title: string
  href: string
  icon: any
  submenu?: NavItem[]
}

// Componente memoizado para NavLink para evitar re-renderizados innecesarios
const NavLink = memo(
  ({
    item,
    pathname,
    toggleSubmenu,
    openSubmenu,
  }: {
    item: NavItem
    pathname: string
    toggleSubmenu: (title: string) => void
    openSubmenu: string | null
  }) => {
    const isActive = pathname === item.href
    const hasSubmenu = item.submenu && item.submenu.length > 0
    const isSubmenuOpen = openSubmenu === item.title
    const isSubmenuActive = item.submenu?.some((subItem) => pathname === subItem.href)

    // Por ahora, mostramos todos los enlaces para evitar problemas
    const hasAccess = true // hasPermission(item.href);

    if (hasSubmenu) {
      return (
        <div>
          <button
            onClick={() => toggleSubmenu(item.title)}
            className={cn(
              "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
              isSubmenuOpen || isSubmenuActive ? "bg-accent text-accent-foreground" : "",
            )}
          >
            <div className="flex items-center">
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.title}</span>
            </div>
            <ChevronDown className={cn("h-4 w-4 transition-transform", isSubmenuOpen ? "rotate-180" : "")} />
          </button>

          {isSubmenuOpen && (
            <div className="ml-4 mt-1 space-y-1">
              {item.submenu?.map((subItem) => (
                <Link
                  key={subItem.href}
                  href={subItem.href}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    pathname === subItem.href ? "bg-accent text-accent-foreground" : "",
                  )}
                >
                  <subItem.icon className="mr-2 h-4 w-4" />
                  <span>{subItem.title}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          isActive ? "bg-accent text-accent-foreground" : "",
        )}
      >
        <item.icon className="mr-2 h-4 w-4" />
        <span>{item.title}</span>
      </Link>
    )
  },
)

NavLink.displayName = "NavLink"

// Update the DashboardLayout component to handle loading states
export function DashboardLayout({ children, isLoading }: { children: React.ReactNode; isLoading?: boolean }) {
  const pathname = usePathname()
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null)
  const { user, logout } = useAuth()
  const router = useRouter()

  // Add error state
  const [error, setError] = useState<string | null>(null)

  // Check if user is authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      router.push("/login")
    }
  }, [user, router, isLoading])

  const navItems = useMemo(
    () => [
      {
        title: "Dashboard",
        href: "/",
        icon: LayoutDashboard,
      },
      {
        title: "Empleados",
        href: "#",
        icon: Users,
        submenu: [
          {
            title: "Lista de Empleados",
            href: "/empleados",
            icon: Users,
          },
          {
            title: "Nuevo Empleado",
            href: "/empleados/nuevo",
            icon: Users,
          },
          {
            title: "Nómina",
            href: "/nomina",
            icon: DollarSign,
          },
        ],
      },
      {
        title: "Control de Asistencias",
        href: "/asistencias",
        icon: Calendar,
      },
      {
        title: "Control de Caja", // Nuevo elemento para Control de Caja
        href: "/caja",
        icon: CreditCard,
      },
	  {
		title: "Control de Stock",
		href: "/stock",
		icon: Package,
	  },
      {
        title: "Delivery",
        href: "#",
        icon: TrendingUp,
        submenu: [
          {
            title: "PedidosYa",
            href: "/delivery/pedidosya",
            icon: TrendingUp,
          },
          {
            title: "Rappi",
            href: "/delivery/rappi",
            icon: TrendingUp,
          },
          {
            title: "MercadoPago",
            href: "/delivery/mercadopago",
            icon: TrendingUp,
          },
          {
            title: "Delivery Propio",
            href: "/delivery/propio",
            icon: TrendingUp,
          },
        ],
      },
      {
        title: "Auditorías",
        href: "/auditorias",
        icon: ClipboardCheck,
      },
      {
        title: "Pedidos Brozziano",
        href: "/pedidos-brozziano",
        icon: ShoppingCart,
      },
      {
        title: "Facturación",
        href: "/facturacion",
        icon: ReceiptText,
      },
      {
        title: "Proveedores y Pagos",
        href: "/proveedores-pagos",
        icon: DollarSign,
      },
      {
        title: "Sistema de Puntos",
        href: "/puntos",
        icon: Star,
      },
      {
        title: "Chat Interno",
        href: "/chat",
        icon: MessageSquare,
      },
      {
        title: "Balances",
        href: "/balances",
        icon: PieChart,
      },
      {
        title: "Reportes",
        href: "/reportes",
        icon: BarChart3,
      },
	  {
		title: "Panel de Administración",
		href: "/admin",
		icon: Shield, // Necesitarás importar Shield de lucide-react
	  },
      {
        title: "Configuración",
        href: "/configuracion",
        icon: Settings,
      },
    ],
    [],
  )

  const toggleSubmenu = useCallback((title: string) => {
    setOpenSubmenu((prev) => (prev === title ? null : title))
  }, [])

  const handleLogout = useCallback(() => {
    try {
      logout()
    } catch (error) {
      console.error("Error during logout:", error)
      // Fallback manual para logout en caso de error
      localStorage.removeItem("user")
      router.push("/login")
    }
  }, [logout, router])

  // Memoizar el contenido de la barra lateral para evitar re-renderizados innecesarios
  const sidebarContent = useMemo(
    () => (
      <>
        <div className="mb-6 px-2">
          <h1 className="text-xl font-bold">Quadrifoglio</h1>
          <p className="text-sm text-muted-foreground">Sistema de Gestión</p>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              item={item}
              pathname={pathname}
              toggleSubmenu={toggleSubmenu}
              openSubmenu={openSubmenu}
            />
          ))}
        </nav>
        <div className="mt-6 border-t pt-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <span className="text-sm font-medium">{user?.name ? user.name.charAt(0) : "U"}</span>
              </div>
              <div className="ml-2">
                <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                <p className="text-xs text-muted-foreground">{user?.email || "usuario@quadrifoglio.com"}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </>
    ),
    [pathname, toggleSubmenu, openSubmenu, user, handleLogout],
  )

  // Update the return statement to handle loading and errors
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar para desktop */}
      <aside className="hidden w-64 flex-col border-r bg-card px-4 py-6 md:flex">{sidebarContent}</aside>

      {/* Sidebar móvil */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="md:hidden absolute top-4 left-4 z-10">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Abrir menú</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex flex-col h-full">
            <div className="p-4 border-b">
              <h1 className="text-xl font-bold">Quadrifoglio</h1>
              <p className="text-sm text-muted-foreground">Sistema de Gestión</p>
            </div>
            <nav className="flex-1 overflow-auto p-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.title}
                  item={item}
                  pathname={pathname}
                  toggleSubmenu={toggleSubmenu}
                  openSubmenu={openSubmenu}
                />
              ))}
            </nav>
            <div className="p-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <span className="text-sm font-medium">{user?.name ? user.name.charAt(0) : "U"}</span>
                  </div>
                  <div className="ml-2">
                    <p className="text-sm font-medium">{user?.name || "Usuario"}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || "usuario@quadrifoglio.com"}</p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <Header />

        {error ? (
          <div className="flex-1 p-8 flex items-center justify-center">
            <div className="bg-destructive/10 p-4 rounded-md text-destructive max-w-md">
              <h3 className="font-semibold mb-2">Error</h3>
              <p>{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => setError(null)}>
                Cerrar
              </Button>
            </div>
          </div>
        ) : isLoading ? (
          <div className="flex-1 p-8 flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  )
}









