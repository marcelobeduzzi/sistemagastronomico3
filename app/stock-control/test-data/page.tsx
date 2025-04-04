"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { testSalesDataMañana, testSalesDataTarde } from "@/lib/test-sales-data"

export default function TestDataPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("sales")
  const [selectedShift, setSelectedShift] = useState("mañana")
  const [salesData, setSalesData] = useState(() => {
    // Intentar cargar datos guardados del localStorage
    const savedData = localStorage.getItem(`testSalesData_${selectedShift}`)
    return savedData ? JSON.parse(savedData) : selectedShift === "mañana" ? testSalesDataMañana : testSalesDataTarde
  })

  // Actualizar datos cuando cambia el turno
  useEffect(() => {
    const savedData = localStorage.getItem(`testSalesData_${selectedShift}`)
    if (savedData) {
      setSalesData(JSON.parse(savedData))
    } else {
      setSalesData(selectedShift === "mañana" ? testSalesDataMañana : testSalesDataTarde)
    }
  }, [selectedShift])

  // Guardar cambios en localStorage cuando cambian los datos
  useEffect(() => {
    localStorage.setItem(`testSalesData_${selectedShift}`, JSON.stringify(salesData))
  }, [salesData, selectedShift])

  // Función para actualizar la cantidad de un producto
  const updateProductQuantity = (productId: string, quantity: number) => {
    setSalesData((prevData) => {
      const updatedItems = prevData.items.map((item) => {
        if (item.productId === productId) {
          const newTotalPrice = quantity * item.unitPrice
          return { ...item, quantity, totalPrice: newTotalPrice }
        }
        return item
      })

      // Recalcular el monto total
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)

      return {
        ...prevData,
        items: updatedItems,
        totalAmount,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  // Función para actualizar el precio unitario de un producto
  const updateProductPrice = (productId: string, unitPrice: number) => {
    setSalesData((prevData) => {
      const updatedItems = prevData.items.map((item) => {
        if (item.productId === productId) {
          const newTotalPrice = item.quantity * unitPrice
          return { ...item, unitPrice, totalPrice: newTotalPrice }
        }
        return item
      })

      // Recalcular el monto total
      const totalAmount = updatedItems.reduce((sum, item) => sum + item.totalPrice, 0)

      return {
        ...prevData,
        items: updatedItems,
        totalAmount,
        updatedAt: new Date().toISOString(),
      }
    })
  }

  // Función para restablecer los datos a los valores por defecto
  const resetToDefault = () => {
    const defaultData = selectedShift === "mañana" ? testSalesDataMañana : testSalesDataTarde
    setSalesData(defaultData)
    toast({
      title: "Datos restablecidos",
      description: `Los datos de prueba para el turno de ${selectedShift} han sido restablecidos a los valores por defecto.`,
    })
  }

  // Función para guardar los cambios
  const saveChanges = () => {
    localStorage.setItem(`testSalesData_${selectedShift}`, JSON.stringify(salesData))
    toast({
      title: "Cambios guardados",
      description: `Los datos de prueba para el turno de ${selectedShift} han sido guardados correctamente.`,
    })
  }

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Datos de Prueba</h1>
        <div className="space-x-2">
          <Button variant="outline" onClick={resetToDefault}>
            Restablecer Valores
          </Button>
          <Button onClick={saveChanges}>Guardar Cambios</Button>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Simulador de Datos de Datalive</CardTitle>
          <CardDescription>
            Utiliza esta herramienta para simular los datos que vendrían de Datalive mientras no tienes acceso. Los
            cambios se guardarán automáticamente en el navegador.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="sales">Datos de Ventas</TabsTrigger>
              <TabsTrigger value="info">Información</TabsTrigger>
            </TabsList>

            <TabsContent value="sales">
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="localName">Nombre del Local</Label>
                    <Input
                      id="localName"
                      value={salesData.localName}
                      onChange={(e) => setSalesData({ ...salesData, localName: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date">Fecha</Label>
                    <Input
                      id="date"
                      type="datetime-local"
                      value={salesData.date.split(".")[0]}
                      onChange={(e) => setSalesData({ ...salesData, date: new Date(e.target.value).toISOString() })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="shift">Turno</Label>
                    <Select value={selectedShift} onValueChange={setSelectedShift}>
                      <SelectTrigger id="shift">
                        <SelectValue placeholder="Seleccionar turno" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mañana">Mañana</SelectItem>
                        <SelectItem value="tarde">Tarde</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <h3 className="text-lg font-medium mt-4">Productos Vendidos</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producto</TableHead>
                      <TableHead>Cantidad</TableHead>
                      <TableHead>Precio Unitario</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.quantity}
                            onChange={(e) => updateProductQuantity(item.productId, Number(e.target.value))}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice}
                            onChange={(e) => updateProductPrice(item.productId, Number(e.target.value))}
                            className="w-24"
                          />
                        </TableCell>
                        <TableCell>
                          {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                            item.totalPrice,
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="font-medium">
                      <TableCell colSpan={3} className="text-right">
                        Total:
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                          salesData.totalAmount,
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="info">
              <div className="space-y-4">
                <p>
                  Esta herramienta te permite simular los datos que normalmente vendrían de Datalive. Los cambios que
                  realices aquí se guardarán en el navegador y se utilizarán en el sistema de control de stock hasta que
                  tengas acceso a los datos reales.
                </p>
                <p>Puedes modificar:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Información del local y fecha</li>
                  <li>Seleccionar el turno (mañana o tarde)</li>
                  <li>Cantidades vendidas de cada producto</li>
                  <li>Precios unitarios</li>
                </ul>
                <p>
                  Los totales se calcularán automáticamente. Cuando termines de hacer cambios, puedes usar el botón
                  "Guardar Cambios" para asegurarte de que se guarden.
                </p>
                <p className="font-medium">Datos preconfigurados:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>
                    Turno de mañana: Ventas por{" "}
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      testSalesDataMañana.totalAmount,
                    )}
                  </li>
                  <li>
                    Turno de tarde: Ventas por{" "}
                    {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(
                      testSalesDataTarde.totalAmount,
                    )}
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => (window.location.href = "/stock-control")}>Ir al Control de Stock</Button>
      </div>
    </div>
  )
}

