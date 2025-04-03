"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { StockCountForm } from "@/components/stock/stock-count-form"
import { DecomisoForm } from "@/components/stock/decomiso-form"
import { StockEntryForm } from "@/components/stock/stock-entry-form"
import { SalesDataDisplay } from "@/components/stock/sales-data-display"
import { StockReconciliation } from "@/components/stock/stock-reconciliation"
import { AlertsDisplay } from "@/components/stock/alerts-display"
import { useToast } from "@/hooks/use-toast"
import { mockSalesData } from "@/lib/mock-data"

export default function StockControlPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("stock-inicial")
  const [stockData, setStockData] = useState({
    inicial: null,
    ingresos: [],
    decomisos: [],
    ventas: mockSalesData, // Datos ficticios simulando Datalive
    cierre: null,
  })

  // Función para simular sincronización con Datalive
  const syncWithDatalive = () => {
    toast({
      title: "Sincronizando con Datalive",
      description: "Obteniendo datos de ventas actualizados...",
    })

    // Simulamos una carga
    setTimeout(() => {
      toast({
        title: "Sincronización completada",
        description: "Datos de ventas actualizados correctamente",
      })
    }, 2000)
  }

  // Función para avanzar al siguiente paso
  const goToNextStep = (currentStep) => {
    const steps = ["stock-inicial", "ingresos", "decomisos", "ventas", "stock-cierre", "reconciliacion"]
    const currentIndex = steps.indexOf(currentStep)
    if (currentIndex < steps.length - 1) {
      setActiveTab(steps[currentIndex + 1])
    }
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Control de Stock y Anti-Robo</h1>
        <Button onClick={syncWithDatalive}>Sincronizar con Datalive</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="stock-inicial">Stock Inicial</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="decomisos">Decomisos</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="stock-cierre">Stock Cierre</TabsTrigger>
          <TabsTrigger value="reconciliacion">Reconciliación</TabsTrigger>
        </TabsList>

        <TabsContent value="stock-inicial">
          <Card>
            <CardHeader>
              <CardTitle>Stock Inicial</CardTitle>
              <CardDescription>
                Registra el stock inicial del turno. Este se comparará con el stock de cierre del turno anterior.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockCountForm
                type="inicial"
                onSubmit={(data) => {
                  setStockData({ ...stockData, inicial: data })
                  goToNextStep("stock-inicial")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ingresos">
          <Card>
            <CardHeader>
              <CardTitle>Ingresos de Mercadería</CardTitle>
              <CardDescription>Registra los ingresos de mercadería durante el turno.</CardDescription>
            </CardHeader>
            <CardContent>
              <StockEntryForm
                onSubmit={(data) => {
                  setStockData({ ...stockData, ingresos: [...stockData.ingresos, data] })
                  goToNextStep("ingresos")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decomisos">
          <Card>
            <CardHeader>
              <CardTitle>Decomisos</CardTitle>
              <CardDescription>
                Registra los productos decomisados durante el turno. Recuerda que el máximo aceptable es 1% de las
                unidades vendidas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DecomisoForm
                salesData={stockData.ventas}
                onSubmit={(data) => {
                  setStockData({ ...stockData, decomisos: [...stockData.decomisos, data] })
                  goToNextStep("decomisos")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ventas">
          <Card>
            <CardHeader>
              <CardTitle>Datos de Ventas</CardTitle>
              <CardDescription>
                Información de ventas obtenida de Datalive. Última sincronización: {new Date().toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SalesDataDisplay salesData={stockData.ventas} onContinue={() => goToNextStep("ventas")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock-cierre">
          <Card>
            <CardHeader>
              <CardTitle>Stock de Cierre</CardTitle>
              <CardDescription>
                Registra el stock final del turno. Este debe ser verificado por ambos encargados en el cambio de turno.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockCountForm
                type="cierre"
                requireSecondaryUser={true}
                onSubmit={(data) => {
                  setStockData({ ...stockData, cierre: data })
                  goToNextStep("stock-cierre")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconciliacion">
          <Card>
            <CardHeader>
              <CardTitle>Reconciliación y Control Final</CardTitle>
              <CardDescription>
                Verificación final de stock y caja para detectar posibles discrepancias.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <StockReconciliation
                stockData={stockData}
                onComplete={() => {
                  toast({
                    title: "Control completado",
                    description: "Los datos han sido guardados y las alertas generadas si corresponde.",
                  })
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-8">
        <AlertsDisplay />
      </div>
    </div>
  )
}

