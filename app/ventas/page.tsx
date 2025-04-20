import Link from "next/link"
import { Suspense } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Package, AlertTriangle, BarChart, Clock, DollarSign, ShoppingCart, ArrowUpDown, Search } from 'lucide-react'
import { salesService } from "@/lib/sales-service"

// Componente para mostrar las ventas recientes
async function RecentSales() {
  let sales = []
  try {
    // Aquí deberíamos obtener las ventas recientes
    // Por ahora usamos datos de ejemplo
    sales = [
      { id: '1', date: '2023-05-15', customer: 'Juan Pérez', total: 1250.50, status: 'completed' },
      { id: '2', date: '2023-05-14', customer: 'María López', total: 850.75, status: 'completed' },
      { id: '3', date: '2023-05-13', customer: 'Carlos Gómez', total: 1500.00, status: 'pending' },
    ]
  } catch (error) {
    console.error("Error al cargar ventas recientes:", error)
  }

  return (
    <div className="space-y-4">
      {sales.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay ventas recientes para mostrar.
        </div>
      ) : (
        <div className="divide-y">
          {sales.map((sale) => (
            <div key={sale.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{sale.customer}</div>
                <div className="text-sm text-muted-foreground">{new Date(sale.date).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="font-medium">${sale.total.toFixed(2)}</div>
                <Badge variant={sale.status === 'completed' ? 'default' : 'outline'}>
                  {sale.status === 'completed' ? 'Completada' : 'Pendiente'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Componente para mostrar alertas de stock
async function StockAlerts() {
  let alerts = []
  try {
    alerts = await salesService.getActiveStockAlerts()
  } catch (error) {
    console.error("Error al cargar alertas de stock:", error)
  }

  return (
    <div className="space-y-4">
      {alerts.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          No hay alertas de stock pendientes.
        </div>
      ) : (
        <div className="divide-y">
          {alerts.slice(0, 5).map((alert) => (
            <div key={alert.id} className="flex items-center justify-between py-3">
              <div>
                <div className="font-medium">{alert.product?.name || 'Producto desconocido'}</div>
                <div className="text-sm text-muted-foreground">
                  Stock actual: <span className="text-red-500 font-medium">{alert.currentQuantity}</span> / Mínimo: {alert.minQuantity}
                </div>
              </div>
              <Link href={`/ventas/inventario/ajuste?productId=${alert.productId}`}>
                <Button variant="outline" size="sm">
                  Ajustar
                </Button>
              </Link>
            </div>
          ))}
          {alerts.length > 5 && (
            <div className="pt-3 text-center">
              <Link href="/ventas/alertas">
                <Button variant="link" size="sm">
                  Ver todas las alertas ({alerts.length})
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const metadata = {
  title: "Sistema de Ventas",
}

export default function VentasPage() {
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Sistema de Ventas</h1>
          <p className="text-muted-foreground">
            Gestiona ventas, inventario y reportes desde un solo lugar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/ventas/nueva">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Venta
            </Button>
          </Link>
          <Link href="/ventas/inventario/ajuste">
            <Button variant="outline">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              Ajustar Inventario
            </Button>
          </Link>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Día</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              +0% desde ayer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ventas del Mes</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground">
              +0% desde el mes pasado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos Vendidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0 desde ayer
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas de Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              0 nuevas alertas hoy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Accesos rápidos */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>
              Gestiona las ventas y transacciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ventas/nueva">
              <Button className="w-full">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nueva Venta
              </Button>
            </Link>
            <Link href="/ventas/historial">
              <Button variant="outline" className="w-full">
                <Clock className="mr-2 h-4 w-4" />
                Historial de Ventas
              </Button>
            </Link>
            <Link href="/ventas/buscar">
              <Button variant="outline" className="w-full">
                <Search className="mr-2 h-4 w-4" />
                Buscar Ventas
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventario</CardTitle>
            <CardDescription>
              Gestiona el stock de productos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ventas/inventario">
              <Button variant="outline" className="w-full">
                <Package className="mr-2 h-4 w-4" />
                Ver Inventario
              </Button>
            </Link>
            <Link href="/ventas/inventario/ajuste">
              <Button variant="outline" className="w-full">
                <ArrowUpDown className="mr-2 h-4 w-4" />
                Ajustar Stock
              </Button>
            </Link>
            <Link href="/ventas/alertas">
              <Button variant="outline" className="w-full">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Alertas de Stock
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reportes</CardTitle>
            <CardDescription>
              Visualiza estadísticas y reportes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/ventas/reportes/diario">
              <Button variant="outline" className="w-full">
                <BarChart className="mr-2 h-4 w-4" />
                Reporte Diario
              </Button>
            </Link>
            <Link href="/ventas/reportes/mensual">
              <Button variant="outline" className="w-full">
                <BarChart className="mr-2 h-4 w-4" />
                Reporte Mensual
              </Button>
            </Link>
            <Link href="/ventas/reportes/productos">
              <Button variant="outline" className="w-full">
                <BarChart className="mr-2 h-4 w-4" />
                Productos Más Vendidos
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Tabs para ventas recientes y alertas */}
      <Tabs defaultValue="recent-sales" className="w-full">
        <TabsList>
          <TabsTrigger value="recent-sales">Ventas Recientes</TabsTrigger>
          <TabsTrigger value="stock-alerts">Alertas de Stock</TabsTrigger>
        </TabsList>
        <TabsContent value="recent-sales" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Ventas Recientes</CardTitle>
              <CardDescription>
                Las últimas transacciones registradas en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-4">Cargando ventas recientes...</div>}>
                <RecentSales />
              </Suspense>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link href="/ventas/historial">
                <Button variant="outline">Ver todas las ventas</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
        <TabsContent value="stock-alerts" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Stock Bajo</CardTitle>
              <CardDescription>
                Productos que requieren reposición de stock
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-center py-4">Cargando alertas de stock...</div>}>
                <StockAlerts />
              </Suspense>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Link href="/ventas/alertas">
                <Button variant="outline">Ver todas las alertas</Button>
              </Link>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}