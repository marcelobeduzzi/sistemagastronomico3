import Link from "next/link"
import { notFound } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Edit, Plus, ArrowLeft } from 'lucide-react'
import { salesService } from "@/lib/sales-service"

export const metadata = {
  title: "Detalles del Producto - Sistema de Ventas",
}

export default async function ProductDetailPage({ params }: { params: { id: string } }) {
  const product = await salesService.getProductWithPrices(params.id)
  
  if (!product) {
    notFound()
  }

  // Si es una variante, redirigir a la página del producto principal
  if (product.isVariant && product.parentId) {
    return notFound()
  }

  const variants = await salesService.getProductVariants(product.id)
  const category = product.categoryId ? await salesService.getCategoryById(product.categoryId) : null

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/ventas/productos">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Volver</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          {!product.isActive && <Badge variant="secondary">Inactivo</Badge>}
        </div>
        <Link href={`/ventas/productos/${product.id}/editar`}>
          <Button>
            <Edit className="mr-2 h-4 w-4" />
            Editar Producto
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información del Producto</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                <dd className="mt-1 text-lg">{product.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Categoría</dt>
                <dd className="mt-1 text-lg">{category?.name || "-"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                <dd className="mt-1">{product.description || "-"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1">
                  {product.isActive ? (
                    <Badge variant="success">Activo</Badge>
                  ) : (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Fecha de Creación</dt>
                <dd className="mt-1">
                  {new Date(product.createdAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Precios</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="local">
              <TabsList className="grid grid-cols-2 mb-4">
                <TabsTrigger value="local">Local</TabsTrigger>
                <TabsTrigger value="delivery">Delivery</TabsTrigger>
              </TabsList>
              <TabsContent value="local">
                <div className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Precio Local</dt>
                    <dd className="mt-1 text-2xl font-bold">
                      ${product.prices?.find(p => p.channel === "local")?.price.toFixed(2) || "-"}
                    </dd>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="delivery">
                <div className="space-y-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">PedidosYa</dt>
                    <dd className="mt-1 text-lg">
                      ${product.prices?.find(p => p.channel === "pedidosya")?.price.toFixed(2) || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Rappi</dt>
                    <dd className="mt-1 text-lg">
                      ${product.prices?.find(p => p.channel === "rappi")?.price.toFixed(2) || "-"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">MercadoPago</dt>
                    <dd className="mt-1 text-lg">
                      ${product.prices?.find(p => p.channel === "mercadopago")?.price.toFixed(2) || "-"}
                    </dd>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Sección de variantes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Variantes del Producto</CardTitle>
          <Link href={`/ventas/productos/${product.id}/variantes/nueva`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Variante
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Variante</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Precio Local</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {variants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay variantes registradas para este producto.
                  </TableCell>
                </TableRow>
              ) : (
                variants.map((variant) => (
                  <TableRow key={variant.id}>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{variant.variantName}</TableCell>
                    <TableCell>
                      {variant.isActive ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <VariantPriceDisplay variantId={variant.id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link href={`/ventas/productos/${product.id}/variantes/${variant.id}/editar`}>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

async function VariantPriceDisplay({ variantId }: { variantId: string }) {
  try {
    const prices = await salesService.getProductPrices(variantId)
    const localPrice = prices.find((price) => price.channel === "local")

    return <span>{localPrice ? `$${localPrice.price.toFixed(2)}` : "-"}</span>
  } catch (error) {
    return <span>-</span>
  }
}