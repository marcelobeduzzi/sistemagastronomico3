import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from "lucide-react"
import { salesService } from "@/lib/sales-service"

export const metadata = {
  title: "Productos - Sistema de Ventas",
}

export default async function ProductsPage() {
  const products = await salesService.getProductsWithVariants()

  // Aquí está el problema - esta función no existe en salesService
  // Comentamos o eliminamos esta línea
  // const stockAlerts = await salesService.getActiveStockAlerts()

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Productos</h1>
        <Link href="/ventas/productos/nuevo">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      {/* Comentamos o eliminamos esta sección que usa stockAlerts
      {stockAlerts && stockAlerts.length > 0 && (
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-amber-800 flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Alertas de Stock Bajo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-amber-800">
              Hay {stockAlerts.length} producto(s) con stock bajo.{" "}
              <Link href="/ventas/inventario/alertas" className="font-medium underline">
                Ver alertas
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      */}

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Precio Local</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No hay productos registrados. Crea tu primer producto haciendo clic en "Nuevo Producto".
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      <Link href={`/ventas/productos/${product.id}`} className="hover:underline">
                        {product.name}
                      </Link>
                      {product.variants && product.variants.length > 0 && (
                        <Badge variant="outline" className="ml-2">
                          {product.variants.length} variante(s)
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{product.category?.name || "-"}</TableCell>
                    <TableCell>
                      {product.isActive ? (
                        <Badge variant="success">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Inactivo</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <ProductPriceDisplay productId={product.id} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/ventas/productos/${product.id}`}>
                        <Button variant="ghost" size="sm">
                          Ver detalles
                        </Button>
                      </Link>
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

async function ProductPriceDisplay({ productId }: { productId: string }) {
  const prices = await salesService.getProductPrices(productId)
  const localPrice = prices.find((price) => price.channel === "local")

  return <span>{localPrice ? `$${localPrice.price.toFixed(2)}` : "-"}</span>
}
