import { Suspense } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Calendar, Search, Download, Eye, Filter, ArrowUpDown } from 'lucide-react'
import { salesService } from "@/lib/sales-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

// Componente para mostrar la tabla de ventas
async function SalesTable({ 
  page = 1, 
  perPage = 10, 
  searchQuery = "", 
  dateFrom = "", 
  dateTo = "", 
  paymentMethod = "", 
  channel = "" 
}) {
  let sales = []
  let totalSales = 0
  
  try {
    // En un sistema real, estos parámetros se pasarían a la API
    const result = await salesService.getSales({
      page,
      perPage,
      searchQuery,
      dateFrom,
      dateTo,
      paymentMethod,
      channel
    })
    
    sales = result.data || []
    totalSales = result.total || 0
  } catch (error) {
    console.error("Error al cargar ventas:", error)
    // Para desarrollo, usamos datos de ejemplo
    sales = [
      { 
        id: '1', 
        createdAt: '2023-05-15T14:30:00Z', 
        customerName: 'Juan Pérez', 
        totalAmount: 1250.50, 
        paymentMethod: 'cash', 
        paymentStatus: 'completed',
        channel: 'local'
      },
      { 
        id: '2', 
        createdAt: '2023-05-14T10:15:00Z', 
        customerName: 'María López', 
        totalAmount: 850.75, 
        paymentMethod: 'card', 
        paymentStatus: 'completed',
        channel: 'local'
      },
      { 
        id: '3', 
        createdAt: '2023-05-13T18:45:00Z', 
        customerName: 'Carlos Gómez', 
        totalAmount: 1500.00, 
        paymentMethod: 'transfer', 
        paymentStatus: 'pending',
        channel: 'pedidosya'
      },
      { 
        id: '4', 
        createdAt: '2023-05-12T12:20:00Z', 
        customerName: 'Ana Rodríguez', 
        totalAmount: 750.25, 
        paymentMethod: 'mercadopago', 
        paymentStatus: 'completed',
        channel: 'rappi'
      },
      { 
        id: '5', 
        createdAt: '2023-05-11T09:10:00Z', 
        customerName: 'Pedro Sánchez', 
        totalAmount: 1100.00, 
        paymentMethod: 'cash', 
        paymentStatus: 'completed',
        channel: 'local'
      },
    ]
    totalSales = sales.length
  }

  // Función para mostrar el método de pago en español
  const getPaymentMethodText = (method) => {
    const methods = {
      'cash': 'Efectivo',
      'card': 'Tarjeta',
      'transfer': 'Transferencia',
      'mercadopago': 'MercadoPago'
    }
    return methods[method] || method
  }

  // Función para mostrar el canal en español
  const getChannelText = (channel) => {
    const channels = {
      'local': 'Local',
      'pedidosya': 'PedidosYa',
      'rappi': 'Rappi',
      'mercadopago': 'MercadoPago'
    }
    return channels[channel] || channel
  }

  // Función para mostrar el estado de pago en español
  const getPaymentStatusText = (status) => {
    const statuses = {
      'completed': 'Completado',
      'pending': 'Pendiente',
      'cancelled': 'Cancelado'
    }
    return statuses[status] || status
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">ID</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Método de Pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  No se encontraron ventas con los filtros seleccionados.
                </TableCell>
              </TableRow>
            ) : (
              sales.map((sale) => (
                <TableRow key={sale.id}>
                  <TableCell className="font-medium">{sale.id}</TableCell>
                  <TableCell>
                    {format(new Date(sale.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                  </TableCell>
                  <TableCell>{sale.customerName || 'Cliente no registrado'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getChannelText(sale.channel)}</Badge>
                  </TableCell>
                  <TableCell>{getPaymentMethodText(sale.paymentMethod)}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={sale.paymentStatus === 'completed' ? 'default' : 
                              sale.paymentStatus === 'pending' ? 'outline' : 'destructive'}
                    >
                      {getPaymentStatusText(sale.paymentStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ${sale.totalAmount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/ventas/detalle/${sale.id}`}>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                        <span className="sr-only">Ver detalles</span>
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Mostrando <span className="font-medium">{sales.length}</span> de{" "}
          <span className="font-medium">{totalSales}</span> ventas
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={sales.length < perPage}
          >
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

export const metadata = {
  title: "Historial de Ventas - Sistema de Ventas",
}

export default function HistorialVentasPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Historial de Ventas</h1>
          <p className="text-muted-foreground">
            Consulta y filtra el historial completo de ventas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Link href="/ventas/nueva">
            <Button>
              Nueva Venta
            </Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Filtra las ventas por diferentes criterios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cliente, ID, etc."
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Desde</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Hasta</label>
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Método de Pago</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="transfer">Transferencia</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Canal</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="pedidosya">PedidosYa</SelectItem>
                  <SelectItem value="rappi">Rappi</SelectItem>
                  <SelectItem value="mercadopago">MercadoPago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Ordenar por</label>
              <Select defaultValue="date-desc">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Fecha (más reciente)</SelectItem>
                  <SelectItem value="date-asc">Fecha (más antigua)</SelectItem>
                  <SelectItem value="total-desc">Total (mayor)</SelectItem>
                  <SelectItem value="total-asc">Total (menor)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button className="w-full">
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resultados</CardTitle>
          <CardDescription>
            Listado de ventas según los filtros aplicados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div className="text-center py-8">Cargando ventas...</div>}>
            <SalesTable />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}