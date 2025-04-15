"use client"

import { useAuth } from "@/lib/auth-context"
import NavItem from "./nav-item"
import {
  BarChart3,
  Users,
  DollarSign,
  Calendar,
  Settings,
  TrendingUp,
  ClipboardCheck,
  ReceiptText,
  PieChart,
  LayoutDashboard,
  Star,
  MessageSquare,
  ShoppingCart,
  CreditCard,
  Package,
  Shield,
  Truck,
} from "lucide-react"

interface NavItemType {
  title: string
  href: string
  icon: any
  roles: string[]
}

const navItems: NavItemType[] = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Empleados",
    href: "/empleados",
    icon: Users,
    roles: ["admin", "gerente"],
  },
  {
    title: "Nómina",
    href: "/nomina",
    icon: DollarSign,
    roles: ["admin", "gerente"],
  },
  {
    title: "Control de Asistencias",
    href: "/asistencias",
    icon: Calendar,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Control de Caja",
    href: "/caja",
    icon: CreditCard,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Planilla de Stock",
    href: "/stock-check",
    icon: Package,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Control de Stock",
    href: "/stock-control",
    icon: Package,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Planilla Stock Matrix",
    href: "/stock-matrix",
    icon: Package,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Delivery",
    href: "/delivery/pedidosya",
    icon: TrendingUp,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Auditorías",
    href: "/auditorias",
    icon: ClipboardCheck,
    roles: ["admin", "gerente"],
  },
  {
    title: "Pedidos Brozziano",
    href: "/pedidos-brozziano",
    icon: ShoppingCart,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Productividad Empleados",
    href: "/productividad",
    icon: PieChart,
    roles: ["admin", "gerente"],
  },
  {
    title: "Facturación",
    href: "/facturacion",
    icon: ReceiptText,
    roles: ["admin", "gerente"],
  },
  {
    title: "Proveedores y Pagos",
    href: "/proveedores-pagos",
    icon: Truck,
    roles: ["admin", "gerente"],
  },
  {
    title: "Sistema de Puntos",
    href: "/puntos",
    icon: Star,
    roles: ["admin", "gerente"],
  },
  {
    title: "Chat Interno",
    href: "/chat",
    icon: MessageSquare,
    roles: ["admin", "encargado", "supervisor", "gerente"],
  },
  {
    title: "Balances",
    href: "/balances",
    icon: PieChart,
    roles: ["admin", "gerente"],
  },
  {
    title: "Reportes",
    href: "/reportes",
    icon: BarChart3,
    roles: ["admin", "gerente"],
  },
  {
    title: "Panel de Administración",
    href: "/admin",
    icon: Shield,
    roles: ["admin"],
  },
  {
    title: "Configuración",
    href: "/configuracion",
    icon: Settings,
    roles: ["admin"],
  },
]

const Sidebar = () => {
  const { user } = useAuth()
  const userRole = user?.user_metadata?.role

  return (
    <aside className="w-64 flex-col border-r bg-card px-4 py-6 flex">
      <div className="mb-6 px-2">
        <h1 className="text-xl font-bold">Quadrifoglio</h1>
        <p className="text-sm text-muted-foreground">Sistema de Gestión</p>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <NavItem
            key={item.title}
            title={item.title}
            href={item.href}
            icon={item.icon}
            userRole={userRole}
            roles={item.roles}
          />
        ))}
      </nav>
    </aside>
  )
}

export default Sidebar
