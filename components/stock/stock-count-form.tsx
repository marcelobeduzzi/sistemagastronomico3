"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { mockProducts, mockUsers } from "@/lib/mock-data"

interface StockCountFormProps {
  type: "inicial" | "cierre"
  requireSecondaryUser?: boolean
  onSubmit: (data: any) => void
}

export function StockCountForm({ type, requireSecondaryUser = false, onSubmit }: StockCountFormProps) {
  const { toast } = useToast()
  const [userId, setUserId] = useState("")
  const [supervisorId, setSupervisorId] = useState("")
  const [secondaryUserId, setSecondaryUserId] = useState("")
  const [confirmationPin, setConfirmationPin] = useState("")
  const [stockItems, setStockItems] = useState(
    mockProducts.map((product) => ({
      productId: product.id,
      productName: product.name,
      quantity: 0,
      expectedQuantity: type === "inicial" ? product.expectedInitialStock : product.expectedFinalStock,
      difference: 0,
      differencePercentage: 0,
    })),
  )

  const handleQuantityChange = (index: number, value: number) => {
    const newStockItems = [...stockItems]
    newStockItems[index].quantity = value

    // Calcular diferencia y porcentaje
    const expected = newStockItems[index].expectedQuantity || 0
    newStockItems[index].difference = value - expected
    newStockItems[index].differencePercentage = expected > 0 ? Math.round(((value - expected) / expected) * 100) : 0

    setStockItems(newStockItems)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Validaciones
    if (!userId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un encargado",
        variant: "destructive",
      })
      return
    }

    if (type === "inicial" && !supervisorId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un supervisor para la configuración inicial",
        variant: "destructive",
      })
      return
    }

    if (requireSecondaryUser && !secondaryUserId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un segundo encargado para el cambio de turno",
        variant: "destructive",
      })
      return
    }

    if (!confirmationPin) {
      toast({
        title: "Error",
        description: "Debes ingresar el PIN de confirmación",
        variant: "destructive",
      })
      return
    }

    // Verificar si hay diferencias significativas (más del 2%)
    const significantDifferences = stockItems.filter(
      (item) => Math.abs(item.differencePercentage) > 2 && item.expectedQuantity > 0,
    )

    if (significantDifferences.length > 0) {
      // Mostrar alerta pero permitir continuar
      toast({
        title: "Atención",
        description: `Se detectaron ${significantDifferences.length} productos con diferencias mayores al 2%`,
        variant: "destructive",
      })
    }

    // Enviar datos
    onSubmit({
      type,
      userId,
      supervisorId: type === "inicial" ? supervisorId : undefined,
      secondaryUserId: requireSecondaryUser ? secondaryUserId : undefined,
      confirmationPin,
      items: stockItems,
      date: new Date().toISOString(),
      shift: getCurrentShift(),
      localId: "local-1", // En un caso real, esto vendría de un contexto o selección
      confirmed: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }

  // Determinar el turno actual basado en la hora
  const getCurrentShift = () => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 14) return "mañana"
    if (hour >= 14 && hour < 22) return "tarde"
    return "noche"
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <Label htmlFor="userId">Encargado</Label>
          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger id="userId">
              <SelectValue placeholder="Seleccionar encargado" />
            </SelectTrigger>
            <SelectContent>
              {mockUsers
                .filter((user) => user.role === "encargado")
                .map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        {type === "inicial" && (
          <div>
            <Label htmlFor="supervisorId">Supervisor (Requerido para configuración inicial)</Label>
            <Select value={supervisorId} onValueChange={setSupervisorId}>
              <SelectTrigger id="supervisorId">
                <SelectValue placeholder="Seleccionar supervisor" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers
                  .filter((user) => user.role === "admin" || user.role === "supervisor")
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {requireSecondaryUser && (
          <div>
            <Label htmlFor="secondaryUserId">Segundo Encargado (Cambio de Turno)</Label>
            <Select value={secondaryUserId} onValueChange={setSecondaryUserId}>
              <SelectTrigger id="secondaryUserId">
                <SelectValue placeholder="Seleccionar segundo encargado" />
              </SelectTrigger>
              <SelectContent>
                {mockUsers
                  .filter((user) => user.role === "encargado" && user.id !== userId)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="mb-6">
        <Label htmlFor="pin">PIN de Confirmación</Label>
        <Input
          id="pin"
          type="password"
          maxLength={4}
          value={confirmationPin}
          onChange={(e) => setConfirmationPin(e.target.value)}
          className="w-32"
        />
        <p className="text-sm text-muted-foreground mt-1">Ingresa tu PIN de 4 dígitos para confirmar este conteo</p>
      </div>

      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Productos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stockItems.map((item, index) => (
            <Card
              key={item.productId}
              className={
                item.difference < 0 && Math.abs(item.differencePercentage) > 2
                  ? "border-red-500"
                  : item.difference > 0 && Math.abs(item.differencePercentage) > 2
                    ? "border-green-500"
                    : ""
              }
            >
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor={`quantity-${index}`}>{item.productName}</Label>
                  {item.expectedQuantity > 0 && (
                    <span
                      className={`text-sm font-medium ${
                        item.difference < 0 && Math.abs(item.differencePercentage) > 2
                          ? "text-red-500"
                          : item.difference > 0 && Math.abs(item.differencePercentage) > 2
                            ? "text-green-500"
                            : "text-muted-foreground"
                      }`}
                    >
                      {item.difference > 0 ? "+" : ""}
                      {item.difference} ({item.differencePercentage}%)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    id={`quantity-${index}`}
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, Number.parseInt(e.target.value) || 0)}
                  />
                  {type === "inicial" && item.expectedQuantity > 0 && (
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      Esperado: {item.expectedQuantity}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Button type="submit" className="w-full">
        {type === "inicial" ? "Registrar Stock Inicial" : "Registrar Stock de Cierre"}
      </Button>
    </form>
  )
}



