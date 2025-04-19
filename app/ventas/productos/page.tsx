import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PlusCircle } from 'lucide-react'
import ProductList from "./product-list"
import ProductListSkeleton from "./product-list-skeleton"

export const metadata = {
  title: "Gestión de Productos - Sistema de Ventas",
}

export default function ProductsPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Gestión de Productos</h1>
        <Link href="/ventas/productos/nuevo">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nuevo Producto
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Total de Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-3xl font-bold">-</p>}>
              <ProductCount />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Productos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-3xl font-bold">-</p>}>
              <ActiveProductCount />
            </Suspense>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Alertas de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<p className="text-3xl font-bold">-</p>}>
              <StockAlertCount />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Productos</CardTitle>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<ProductListSkeleton />}>
            <ProductList />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

async function ProductCount() {
  const { salesService } = await import("@/lib/sales-service")
  const products = await salesService.getProducts()
  return <p className="text-3xl font-bold">{products.length}</p>
}

async function ActiveProductCount() {
  const { salesService } = await import("@/lib/sales-service")
  const products = await salesService.getProducts()
  const activeProducts = products.filter((product) => product.isActive)
  return <p className="text-3xl font-bold">{activeProducts.length}</p>
}

async function StockAlertCount() {
  const { salesService } = await import("@/lib/sales-service")
  const alerts = await salesService.getActiveStockAlerts()
  return (
    <Link href="/ventas/inventario/alertas">
      <p className="text-3xl font-bold text-red-500">{alerts.length}</p>
    </Link>
  )
}