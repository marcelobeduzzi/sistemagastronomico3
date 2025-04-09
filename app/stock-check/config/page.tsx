"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { ProductsConfig } from "@/components/stock-check/products-config"
import { LocationsConfig } from "@/components/stock-check/locations-config"
import { ManagersConfig } from "@/components/stock-check/managers-config"
import { DashboardLayout } from "@/app/dashboard-layout"

export default function StockCheckConfigPage() {
  const [activeTab, setActiveTab] = useState("products")

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center">
          <Button asChild variant="outline" className="mr-4">
            <Link href="/stock-check">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Configuración de Planilla de Stock</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Configuración</CardTitle>
            <CardDescription>
              Configure los productos, ubicaciones y responsables para las planillas de stock
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="products">Productos</TabsTrigger>
                <TabsTrigger value="locations">Ubicaciones</TabsTrigger>
                <TabsTrigger value="managers">Responsables</TabsTrigger>
              </TabsList>
              <TabsContent value="products" className="mt-6">
                <ProductsConfig />
              </TabsContent>
              <TabsContent value="locations" className="mt-6">
                <LocationsConfig />
              </TabsContent>
              <TabsContent value="managers" className="mt-6">
                <ManagersConfig />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}


