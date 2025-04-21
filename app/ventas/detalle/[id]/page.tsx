import Link from "next/link"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ArrowLeft, Download, Printer, User, Phone, MapPin, Calendar, CreditCard, Tag, ShoppingBag } from 'lucide-react'
import { salesService } from "@/lib/sales-service"
import { Button } from "@/components/ui/button"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
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
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

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

export async function generateMetadata({ params }) {
  return {
    title: `Venta #${params.id} - Sistema de Ventas`,
  }
}

export default async function DetalleVentaPage({ params }) {
  const { id } = params
  
  let sale
  try {
    sale = await salesService.getSaleById(id)
    
    if (!sale) {
      notFound()
    }
  } catch (error) {
    console.error("Error al cargar venta:", error)
    // Para desarrollo, usamos datos de ejemplo
    sale = {
      id: id,
      createdAt: '2023-05-15T14:30:00Z',
      customerName: 'Juan Pérez',
      customerPhone: '1123456789',
      customerAddress: 'Av. Corrientes 1234, CABA',
      totalAmount: 1250.50,
      paymentMethod: 'cash',
      paymentStatus: 'completed',
      channel: 'local',
      notes: 'Cliente frecuente. Pidió factura A.',
      createdBy: 'Vendedor: María',
      items: [
        {
          id: '1',
          productId: '101',
          productName: 'Hamburguesa Completa',
          quantity: 2,
          price: 450.00,
          subtotal: 900.00
        },
        {
          id: '2',
          productId: '202',
          productName: 'Papas Fritas Grande',
          quantity: 1,
          price: 250.50,
          subtotal: 250.50
        },
        {
          id: '3',
          productId: '303',
          productName: 'Gaseosa 500ml',
          quantity: 2,
          price: 50.00,
          subtotal: 100.00
        }
      ]
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-2">
          <Link href="/ventas/historial">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Venta #{sale.id}</h1>
            <p className="text-muted-foreground">
              {format(new Date(sale.createdAt), 'dd MMMM yyyy, HH:mm', { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Información del Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {sale.customerName && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Nombre</div>
                <div>{sale.customerName}</div>
              </div>
            )}
            
            {sale.customerPhone && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Teléfono</div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {sale.customerPhone}
                </div>
              </div>
            )}
            
            {sale.customerAddress && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Dirección</div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {sale.customerAddress}
                </div>
              </div>
            )}
            
            {!sale.customerName && !sale.customerPhone && !sale.customerAddress && (
              <div className="text-muted-foreground italic">
                No se registraron datos del cliente
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalles de la Venta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5" />
              Detalles de la Venta
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-muted-foreground">Fecha y Hora</div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {format(new Date(sale.createdAt), 'dd MMMM yyyy, HH:mm', { locale: es })}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground">Canal</div>
              <div>
                <Badge variant="outline">{getChannelText(sale.channel)}</Badge>
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground">Método de Pago</div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                {getPaymentMethodText(sale.paymentMethod)}
              </div>
            </div>
            
            <div>
              <div className="text-sm font-medium text-muted-foreground">Estado</div>
              <div>
                <Badge 
                  variant={sale.paymentStatus === 'completed' ? 'default' : 
                          sale.paymentStatus === 'pending' ? 'outline' : 'destructive'}
                >
                  {getPaymentStatusText(sale.paymentStatus)}
                </Badge>
              </div>
            </div>
            
            {sale.createdBy && (
              <div>
                <div className="text-sm font-medium text-muted-foreground">Registrado por</div>
                <div>{sale.createdBy}</div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumen de la Venta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5" />
              Resumen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <div className="text-sm font-medium text-muted-foreground">Subtotal</div>
              <div>${sale.totalAmount.toFixed(2)}</div>
            </div>
            
            <div className="flex justify-between">
              <div className="text-sm font-medium text-muted-foreground">Impuestos</div>
              <div>Incluidos</div>
            </div>
            
            <div className="flex justify-between">
              <div className="text-sm font-medium text-muted-foreground">Descuentos</div>
              <div>$0.00</div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-bold">
              <div>Total</div>
              <div className="text-xl">${sale.totalAmount.toFixed(2)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos</CardTitle>
          <CardDescription>
            Detalle de los productos incluidos en la venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-center">Cantidad</TableHead>
                <TableHead className="text-right">Precio Unitario</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sale.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">${item.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right">${item.subtotal.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        <CardFooter className="flex justify-between border-t p-4">
          <div className="text-sm text-muted-foreground">
            Total de productos: {sale.items.reduce((sum, item) => sum + item.quantity, 0)}
          </div>
          <div className="font-bold">
            Total: ${sale.totalAmount.toFixed(2)}
          </div>
        </CardFooter>
      </Card>

      {/* Notas */}
      {sale.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{sale.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}