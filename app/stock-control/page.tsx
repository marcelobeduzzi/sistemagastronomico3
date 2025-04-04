

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

import { InitialSetupForm } from "@/components/stock/initial-setup-form"
import { EntryList } from "@/components/stock/entry-list"

export default function StockControlPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("stock-inicial")
  const [showInitialSetup, setShowInitialSetup] = useState(false)
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

  // Función para manejar múltiples registros de ingresos
  const handleStockEntrySubmit = (data) => {
    setStockData({ ...stockData, ingresos: [...stockData.ingresos, data] })
    toast({
      title: "Ingreso registrado",
      description: "El ingreso de mercadería ha sido registrado correctamente.",
    })
    // No avanzamos automáticamente para permitir múltiples registros
  }

  // Función para manejar múltiples registros de decomisos
  const handleDecomisoSubmit = (data) => {
    setStockData({ ...stockData, decomisos: [...stockData.decomisos, data] })
    toast({
      title: "Decomiso registrado",
      description: "El decomiso ha sido registrado correctamente.",
    })
    // No avanzamos automáticamente para permitir múltiples registros
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Control de Stock y Anti-Robo</h1>
        <Button onClick={syncWithDatalive}>Sincronizar con Datalive</Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="configuracion-inicial">Config. Inicial</TabsTrigger>
          <TabsTrigger value="stock-inicial">Stock Inicial</TabsTrigger>
          <TabsTrigger value="ingresos">Ingresos</TabsTrigger>
          <TabsTrigger value="decomisos">Decomisos</TabsTrigger>
          <TabsTrigger value="ventas">Ventas</TabsTrigger>
          <TabsTrigger value="stock-cierre">Stock Cierre</TabsTrigger>
          <TabsTrigger value="reconciliacion">Reconciliación</TabsTrigger>
        </TabsList>

        <TabsContent value="configuracion-inicial">
          <Card>
            <CardHeader>
              <CardTitle>Configuración Inicial de Stock</CardTitle>
              <CardDescription>
                Configuración inicial de stock supervisada. Esta operación debe ser realizada por un encargado y
                validada por un supervisor.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InitialSetupForm
                onSubmit={(data) => {
                  setStockData({ ...stockData, inicial: data })
                  toast({
                    title: "Configuración inicial completada",
                    description: "La configuración inicial de stock ha sido registrada correctamente.",
                  })
                  setActiveTab("stock-inicial")
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

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
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Ingresos de Mercadería</CardTitle>
              <CardDescription>Registra los ingresos de mercadería durante el turno.</CardDescription>
            </CardHeader>
            <CardContent>
              <StockEntryForm onSubmit={handleStockEntrySubmit} />
            </CardContent>
          </Card>

          {stockData.ingresos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Ingresos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <EntryList entries={stockData.ingresos} type="ingresos" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="decomisos">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Decomisos</CardTitle>
              <CardDescription>
                Registra los productos decomisados durante el turno. Recuerda que el máximo aceptable es 1% de las
                unidades vendidas.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DecomisoForm salesData={stockData.ventas} onSubmit={handleDecomisoSubmit} />
            </CardContent>
          </Card>

          {stockData.decomisos.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Decomisos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <EntryList entries={stockData.decomisos} type="decomisos" />
              </CardContent>
            </Card>
          )}
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

