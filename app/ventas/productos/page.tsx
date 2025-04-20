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
import { supabase } from "@/lib/db"

export const metadata = {
  title: "Productos - Sistema de Ventas",
}

// Desactivamos la caché para esta página
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Función auxiliar para convertir snake_case a camelCase
function objectToCamelCase(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => objectToCamelCase(item))
  }

  const newObj: any = {}
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
      newObj[camelCaseKey] = objectToCamelCase(obj[key])
    }
  }
  return newObj
}

// Función simplificada para obtener productos directamente en la página
async function getProducts() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    // Obtener productos principales (no variantes)
    const { data: products, error } = await supabase
      .from("sales_products")
      .select("*, category:sales_categories(*)")
      .is("is_variant", false)
      .order("name")

    if (error) {
      console.error("Error al obtener productos:", error)
      return []
    }

    // Convertir a camelCase
    const productsWithVariants = []
    
    for (const product of products || []) {
      const productData = objectToCamelCase(product)
      
      // Obtener variantes para este producto
      const { data: variants, error: variantsError } = await supabase
        .from("sales_products")
        .select("*")
        .eq("parent_id", product.id)
        .eq("is_variant", true)
      
      if (variantsError) {
        console.error(`Error al obtener variantes para producto ${product.id}:`, variantsError)
        productData.variants = []
      } else {
        productData.variants = (variants || []).map(variant => objectToCamelCase(variant))
      }
      
      productsWithVariants.push(productData)
    }

    return productsWithVariants
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return []
  }
}

// Función simplificada para obtener precios directamente en la página
async function getProductPrice(productId: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return null
    }

    const { data, error } = await supabase
      .from("sales_product_prices")
      .select("*")
      .eq("product_id", productId)
      .eq("channel", "local")
      .maybeSingle()

    if (error) {
      console.error(`Error al obtener precio para producto ${productId}:`, error)
      return null
    }

    return data ? objectToCamelCase(data) : null
  } catch (error) {
    console.error(`Error al obtener precio para producto ${productId}:`, error)
    return null
  }
}

export default async function ProductsPage() {
  console.log("Renderizando página de productos...")
  const products = await getProducts()
  console.log(`Se obtuvieron ${products.length} productos`)

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
                      <PriceDisplay productId={product.id} />
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

// Componente para mostrar el precio (sin usar Server Actions)
async function PriceDisplay({ productId }: { productId: string }) {
  const price = await getProductPrice(productId)
  return <span>{price ? `$${price.price.toFixed(2)}` : "-"}</span>
}