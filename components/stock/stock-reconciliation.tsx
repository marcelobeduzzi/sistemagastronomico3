"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface StockReconciliationProps {
  stockData: any
  onComplete: () => void
}

export function StockReconciliation({ stockData, onComplete }: StockReconciliationProps) {
  const { toast } = useToast()
  const [reconciliationData, setReconciliationData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simular cálculo de reconciliación
    setTimeout(() => {
      const data = calculateReconciliation(stockData)
      setReconciliationData(data)
      setLoading(false)

      // Generar alertas si es necesario
      if (data.stockAlerts.length > 0 || data.cashAlerts.length > 0) {
        toast({
          title: "Alertas detectadas",
          description: `Se han detectado ${data.stockAlerts.length} alertas de stock y ${data.cashAlerts.length} alertas de caja`,
          variant: "destructive",
        })
      }
    }, 1500)
  }, [stockData, toast])

  // Función para calcular la reconciliación
  const calculateReconciliation = (data) => {
    // Esta función simula el cálculo real que se haría con los datos
    // En un caso real, tendríamos lógica más compleja

    // 1. Calcular diferencias de stock
    const stockDifferences = []
    const stockAlerts = []

    if (data.inicial && data.cierre) {
      data.inicial.items.forEach((initialItem) => {
        const finalItem = data.cierre.items.find((item) => item.productId === initialItem.productId)

        if (finalItem) {
          // Calcular ventas del producto
          const sales = data.ventas.items
            .filter((item) => item.productId === initialItem.productId)
            .reduce((total, item) => total + item.quantity, 0)

          // Calcular decomisos del producto
          const decomisos = data.decomisos
            .flatMap((d) => d.items)
            .filter((item) => item.productId === initialItem.productId)
            .reduce((total, item) => total + item.quantity, 0)

          // Calcular ingresos del producto
          const ingresos = data.ingresos
            .flatMap((i) => i.items)
            .filter((item) => item.productId === initialItem.productId)
            .reduce((total, item) => total + item.quantity, 0)

          // Calcular balance esperado
          const expectedFinal = initialItem.quantity - sales - decomisos + ingresos

          // Calcular diferencia
          const difference = finalItem.quantity - expectedFinal
          const differencePercentage = expectedFinal !== 0 ? (difference / expectedFinal) * 100 : 0

          stockDifferences.push({
            productId: initialItem.productId,
            productName: initialItem.productName,
            initial: initialItem.quantity,
            sales,
            decomisos,
            ingresos,
            expected: expectedFinal,
            final: finalItem.quantity,
            difference,
            differencePercentage,
          })

          // Generar alerta si la diferencia es significativa (más del 2%)
          if (Math.abs(differencePercentage) > 2 && expectedFinal > 0) {
            // Calcular el valor monetario de la diferencia (usando un precio ficticio por ahora)
            const unitPrice = 500 // En una implementación real, esto vendría de los datos del producto
            const monetaryDifference = difference * unitPrice

            stockAlerts.push({
              productId: initialItem.productId,
              productName: initialItem.productName,
              difference,
              differencePercentage,
              monetaryValue: monetaryDifference, // Añadir el valor monetario
              severity: Math.abs(differencePercentage) > 5 ? "alta" : "media",
              // Añadir más contexto para la alerta
              context: `Stock inicial: ${initialItem.quantity}, Ventas: ${sales}, Decomisos: ${decomisos}, Ingresos: ${ingresos}, Stock esperado: ${expectedFinal}, Stock final: ${finalItem.quantity}`,
            })
          }
        }
      })
    }

    // 2. Calcular diferencias de caja
    // Esto es una simulación, en un caso real obtendríamos los datos del cierre de caja
    const cashData = {
      expected: data.ventas.totalAmount,
      actual: data.ventas.totalAmount * 0.98, // Simulamos una diferencia del 2%
      difference: data.ventas.totalAmount * 0.02,
      differencePercentage: 2,
    }

    const cashAlerts = []

    // Generar alerta si la diferencia es significativa (más de $5000)
    if (Math.abs(cashData.difference) > 5000) {
      cashAlerts.push({
        type: "caja",
        difference: cashData.difference,
        differencePercentage: cashData.differencePercentage,
        severity: Math.abs(cashData.difference) > 10000 ? "alta" : "media",
      })
    }

    return {
      stockDifferences,
      stockAlerts,
      cashData,
      cashAlerts,
    }
  }

  // Formatear moneda
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  if (loading) {
    return <div className="text-center py-8">Calculando reconciliación...</div>
  }

  return (
    <div>
      {/* Alertas */}
      {(reconciliationData.stockAlerts.length > 0 || reconciliationData.cashAlerts.length > 0) && (
        <div className="mb-6 space-y-4">
          <h3 className="text-lg font-medium">Alertas Detectadas</h3>

          {reconciliationData.stockAlerts.map((alert, index) => (
            <Alert key={`stock-${index}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Alerta de Stock - {alert.severity.toUpperCase()}</AlertTitle>
              <AlertDescription>
                Diferencia significativa en {alert.productName}: {alert.difference > 0 ? "+" : ""}
                {alert.difference} unidades ({alert.differencePercentage.toFixed(2)}%)
              </AlertDescription>
            </Alert>
          ))}

          {reconciliationData.cashAlerts.map((alert, index) => (
            <Alert key={`cash-${index}`} variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Alerta de Caja - {alert.severity.toUpperCase()}</AlertTitle>
              <AlertDescription>
                Diferencia significativa en caja: {formatCurrency(alert.difference)} (
                {alert.differencePercentage.toFixed(2)}%)
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Reconciliación de Stock */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reconciliación de Stock</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="text-right">Inicial</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Decomisos</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Esperado</TableHead>
                <TableHead className="text-right">Final</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reconciliationData.stockDifferences.map((item) => (
                <TableRow
                  key={item.productId}
                  className={
                    item.difference < 0 && Math.abs(item.differencePercentage) > 2
                      ? "bg-red-50"
                      : item.difference > 0 && Math.abs(item.differencePercentage) > 2
                        ? "bg-green-50"
                        : ""
                  }
                >
                  <TableCell>{item.productName}</TableCell>
                  <TableCell className="text-right">{item.initial}</TableCell>
                  <TableCell className="text-right">{item.sales}</TableCell>
                  <TableCell className="text-right">{item.decomisos}</TableCell>
                  <TableCell className="text-right">{item.ingresos}</TableCell>
                  <TableCell className="text-right font-medium">{item.expected}</TableCell>
                  <TableCell className="text-right">{item.final}</TableCell>
                  <TableCell
                    className={`text-right font-medium ${
                      item.difference < 0 ? "text-red-600" : item.difference > 0 ? "text-green-600" : ""
                    }`}
                  >
                    {item.difference > 0 ? "+" : ""}
                    {item.difference} ({item.differencePercentage.toFixed(2)}%)
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Reconciliación de Caja */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Reconciliación de Caja</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Ventas Esperadas (según sistema)</TableCell>
                <TableCell className="text-right">{formatCurrency(reconciliationData.cashData.expected)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Ventas Reales (según cierre de caja)</TableCell>
                <TableCell className="text-right">{formatCurrency(reconciliationData.cashData.actual)}</TableCell>
              </TableRow>
              <TableRow
                className={
                  reconciliationData.cashData.difference < 0 ? "bg-red-50 font-medium" : "bg-green-50 font-medium"
                }
              >
                <TableCell>Diferencia</TableCell>
                <TableCell
                  className={`text-right ${
                    reconciliationData.cashData.difference < 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {formatCurrency(reconciliationData.cashData.difference)} (
                  {reconciliationData.cashData.differencePercentage.toFixed(2)}%)
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resumen y Conclusión */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Resumen y Conclusión</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            {reconciliationData.stockAlerts.length === 0 && reconciliationData.cashAlerts.length === 0 ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium text-green-600">No se detectaron problemas significativos</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="font-medium text-red-600">
                  Se detectaron {reconciliationData.stockAlerts.length + reconciliationData.cashAlerts.length} alertas
                  que requieren atención
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            Este informe ha sido generado automáticamente basado en los datos ingresados. Las alertas generadas serán
            enviadas al panel de administración para su revisión.
          </p>

          <Button onClick={onComplete} className="w-full">
            Finalizar Control
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}



