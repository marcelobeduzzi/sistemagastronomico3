import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus } from 'lucide-react'
import { salesService } from "@/lib/sales-service"

export const metadata = {
  title: "Productos - Sistema de Ventas",
}

// Desactivamos la caché para esta página
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProductsPage() {
  let products = []

  try {
    console.log("Obteniendo productos con variantes...");
    products = await salesService.getProductsWithVariants();
    console.log("Productos cargados:", products.length);
    
    // Verificar si hay productos
    if (products.length === 0) {
      console.log("No se encontraron productos");
      
      // Intentar obtener productos sin variantes como fallback
      console.log("Intentando obtener productos sin variantes...");
      products = await salesService.getProducts();
      console.log("Productos básicos cargados:", products.length);
    }
  } catch (error) {
    console.error("Error al cargar productos:", error);
    // Intentar obtener productos básicos como último recurso
    try {
      console.log("Error en getProductsWithVariants, intentando getProducts como último recurso");
      products = await salesService.getProducts();
      console.log("Productos básicos cargados como último recurso:", products.length);
    } catch (fallbackError) {
      console.error("Error también en getProducts:", fallbackError);
    }
  }

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
  try {
    const prices = await salesService.getProductPrices(productId)
    const localPrice = prices.find((price) => price.channel === "local")

    return <span>{localPrice ? `$${localPrice.price.toFixed(2)}` : "-"}</span>
  } catch (error) {
    console.error(`Error al obtener precio para producto ${productId}:`, error);
    return <span>-</span>
  }
}