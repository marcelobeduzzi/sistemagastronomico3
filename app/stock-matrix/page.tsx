"u"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Save, Plus, Check, AlertTriangle, Lock, Download } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

// Tipos
type Location = {
  id: number
  name: string
}

type Manager = {
  id: number
  name: string
}

type ProductConfig = {
  id: number
  product_name: string
  unit_value: number
  category: string
  has_internal_consumption: boolean
}

type StockSheetData = {
  id?: number
  date: string
  location_id: number
  manager_id: number
  status: "borrador" | "parcial" | "completado"
  created_by: string
  updated_by: string
}

type ProductStockData = {
  id?: number
  stock_sheet_id?: number
  product_id: number
  product_name: string
  category: string
  unit_value: number

  // Datos que carga el encargado
  opening_quantity: number | null
  opening_locked: boolean
  incoming_quantity: number | null
  incoming_locked: boolean
  closing_quantity: number | null
  closing_locked: boolean

  // Datos que carga el administrador
  units_sold: number | null
  discarded_quantity: number | null
  internal_consumption: number | null

  // Cálculos
  difference: number | null
  has_internal_consumption: boolean
}

// Componente principal
export default function StockMatrixPage() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<"encargado" | "administrador">("encargado") // Cambiado a "encargado" por defecto
  const [isLoading, setIsLoading] = useState(false)
  const [locations, setLocations] = useState<Location[]>([])
  const [managers, setManagers] = useState<Manager[]>([])
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([])
  const [stockData, setStockData] = useState<ProductStockData[]>([])
  const [showIncomingDialog, setShowIncomingDialog] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [incomingAmount, setIncomingAmount] = useState<number>(0)

  // Estado para los datos de la planilla
  const [sheetData, setSheetData] = useState<StockSheetData>({
    date: format(new Date(), "yyyy-MM-dd"),
    location_id: 0,
    manager_id: 0,
    status: "borrador",
    created_by: "Usuario Actual", // Esto vendría del contexto de autenticación
    updated_by: "Usuario Actual",
  })

  // Cargar datos iniciales
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // Fetch locations
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("active", true)
          .order("name")

        if (locationsError) throw locationsError
        setLocations(locationsData || [])

        // Fetch managers
        const { data: managersData, error: managersError } = await supabase
          .from("managers")
          .select("id, name")
          .eq("active", true)
          .order("name")

        if (managersError) throw managersError
        setManagers(managersData || [])

        // Fetch product configs
        const { data: productConfigsData, error: productConfigsError } = await supabase
          .from("product_config")
          .select("id, product_name, unit_value, category, has_internal_consumption")
          .eq("active", true)
          .order("category", { ascending: true })
          .order("id", { ascending: true })

        if (productConfigsError) throw productConfigsError
        setProductConfigs(productConfigsData || [])

        // Inicializar datos de stock para cada producto
        const initialStockData: ProductStockData[] =
          productConfigsData?.map((product) => ({
            product_id: product.id,
            product_name: product.product_name,
            category: product.category,
            unit_value: product.unit_value,
            has_internal_consumption: product.has_internal_consumption,

            opening_quantity: null,
            opening_locked: false,
            incoming_quantity: null,
            incoming_locked: false,
            closing_quantity: null,
            closing_locked: false,

            units_sold: null,
            discarded_quantity: null,
            internal_consumption: null,

            difference: null,
          })) || []

        setStockData(initialStockData)
      } catch (error: any) {
        console.error("Error fetching data:", error.message)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos necesarios",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Manejar cambios en los campos del formulario principal
  const handleSheetDataChange = (name: string, value: any) => {
    setSheetData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar cambios en los datos de stock
  const handleStockDataChange = (productId: number, field: string, value: number | null) => {
    setStockData((prev) => prev.map((item) => (item.product_id === productId ? { ...item, [field]: value } : item)))
  }

  // Bloquear un campo después de guardarlo
  const handleLockField = (productId: number, field: "opening" | "incoming" | "closing") => {
    setStockData((prev) =>
      prev.map((item) => (item.product_id === productId ? { ...item, [`${field}_locked`]: true } : item)),
    )

    toast({
      title: "Campo bloqueado",
      description: `El valor ha sido guardado y bloqueado para edición`,
    })
  }

  // Abrir diálogo para agregar ingreso de mercadería
  const handleAddIncoming = (productId: number) => {
    setSelectedProductId(productId)
    setIncomingAmount(0)
    setShowIncomingDialog(true)
  }

  // Confirmar ingreso de mercadería
  const confirmIncoming = () => {
    if (!selectedProductId || incomingAmount <= 0) {
      toast({
        title: "Error",
        description: "Ingrese una cantidad válida",
        variant: "destructive",
      })
      return
    }

    setStockData((prev) =>
      prev.map((item) => {
        if (item.product_id === selectedProductId) {
          const currentAmount = item.incoming_quantity || 0
          return {
            ...item,
            incoming_quantity: currentAmount + incomingAmount,
          }
        }
        return item
      }),
    )

    setShowIncomingDialog(false)

    toast({
      title: "Ingreso registrado",
      description: `Se agregaron ${incomingAmount} unidades al ingreso de mercadería`,
    })
  }

  // Finalizar ingreso de mercadería
  const finalizeIncoming = (productId: number) => {
    handleLockField(productId, "incoming")
  }

  // Calcular diferencias
  const calculateDifference = (productId: number) => {
    const product = stockData.find((p) => p.product_id === productId)

    if (!product) return null

    const opening = product.opening_quantity || 0
    const incoming = product.incoming_quantity || 0
    const sold = product.units_sold || 0
    const discarded = product.discarded_quantity || 0
    const closing = product.closing_quantity || 0

    // Fórmula: (1 + 2 + 4 - 3 - 6)
    // Apertura + Ingreso + Decomisos - Vendidas - Cierre
    return opening + incoming + discarded - sold - closing
  }

  // Actualizar todas las diferencias
  const updateAllDifferences = () => {
    setStockData((prev) =>
      prev.map((item) => ({
        ...item,
        difference: calculateDifference(item.product_id),
      })),
    )
  }

  // Guardar planilla completa
  const handleSaveSheet = async () => {
    try {
      setIsLoading(true)

      // Aquí iría la lógica para guardar en la base de datos
      // Por ahora solo simulamos

      toast({
        title: "Planilla guardada",
        description: "Los datos han sido guardados correctamente",
      })

      // Actualizar estado a parcial o completado según corresponda
      setSheetData((prev) => ({
        ...prev,
        status: "parcial",
      }))
    } catch (error: any) {
      console.error("Error saving data:", error.message)
      toast({
        title: "Error",
        description: "No se pudieron guardar los datos",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Finalizar planilla
  const handleFinalizeSheet = async () => {
    try {
      setIsLoading(true)

      // Actualizar todas las diferencias antes de finalizar
      updateAllDifferences()

      // Aquí iría la lógica para guardar y finalizar en la base de datos

      toast({
        title: "Planilla finalizada",
        description: "La planilla ha sido finalizada correctamente",
      })

      // Actualizar estado a completado
      setSheetData((prev) => ({
        ...prev,
        status: "completado",
      }))
    } catch (error: any) {
      console.error("Error finalizing data:", error.message)
      toast({
        title: "Error",
        description: "No se pudo finalizar la planilla",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Exportar a Excel
  const handleExportToExcel = () => {
    toast({
      title: "Exportando",
      description: "Exportando datos a Excel...",
    })
    // Aquí iría la lógica para exportar a Excel
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Planilla Stock Matriz</h1>
            <p className="text-muted-foreground">Formato tipo planilla para control de stock</p>
          </div>
          <div className="flex gap-2 items-center">
            {/* Selector de rol para facilitar pruebas */}
            <div className="flex items-center mr-4">
              <Label htmlFor="role-selector" className="mr-2">
                Rol:
              </Label>
              <Select value={userRole} onValueChange={(value) => setUserRole(value as "encargado" | "administrador")}>
                <SelectTrigger id="role-selector" className="w-[180px]">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="administrador">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={() => router.push("/stock-check")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button variant="outline" onClick={handleExportToExcel}>
              <Download className="mr-2 h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>

        {/* Información de la planilla */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={sheetData.date}
                  onChange={(e) => handleSheetDataChange("date", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Local</Label>
                <Select
                  value={sheetData.location_id.toString()}
                  onValueChange={(value) => handleSheetDataChange("location_id", Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="manager">Encargado</Label>
                <Select
                  value={sheetData.manager_id.toString()}
                  onValueChange={(value) => handleSheetDataChange("manager_id", Number.parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar encargado" />
                  </SelectTrigger>
                  <SelectContent>
                    {managers.map((manager) => (
                      <SelectItem key={manager.id} value={manager.id.toString()}>
                        {manager.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <div className="h-10 flex items-center">
                  <Badge
                    variant={
                      sheetData.status === "borrador"
                        ? "outline"
                        : sheetData.status === "parcial"
                          ? "secondary"
                          : "default"
                    }
                  >
                    {sheetData.status === "borrador"
                      ? "Borrador"
                      : sheetData.status === "parcial"
                        ? "Parcial"
                        : "Completado"}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de productos */}
        <Card>
          <CardHeader>
            <CardTitle>Detalle de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead rowSpan={2} className="w-[180px]">
                      Producto
                    </TableHead>
                    <TableHead rowSpan={2} className="w-[100px]">
                      Categoría
                    </TableHead>
                    <TableHead colSpan={3} className="text-center border-b">
                      Encargado
                    </TableHead>
                    {userRole === "administrador" && (
                      <TableHead colSpan={3} className="text-center border-b">
                        Administrador
                      </TableHead>
                    )}
                    {userRole === "administrador" && (
                      <TableHead rowSpan={2} className="text-center w-[120px]">
                        Diferencia
                      </TableHead>
                    )}
                  </TableRow>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-center w-[120px]">1. Apertura</TableHead>
                    <TableHead className="text-center w-[120px]">2. Ingreso</TableHead>
                    <TableHead className="text-center w-[120px]">6. Cierre</TableHead>

                    {userRole === "administrador" && (
                      <>
                        <TableHead className="text-center w-[120px]">3. Vendidas</TableHead>
                        <TableHead className="text-center w-[120px]">4. Decomisos</TableHead>
                        <TableHead className="text-center w-[120px]">5. Consumos</TableHead>
                      </>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockData.map((product) => (
                    <TableRow key={product.product_id}>
                      <TableCell className="font-medium">{product.product_name}</TableCell>
                      <TableCell>{product.category}</TableCell>

                      {/* Apertura - Solo editable por encargado y si no está bloqueado */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={product.opening_quantity || ""}
                              onChange={(e) =>
                                handleStockDataChange(
                                  product.product_id,
                                  "opening_quantity",
                                  e.target.value === "" ? null : Number.parseInt(e.target.value),
                                )
                              }
                              disabled={product.opening_locked || userRole !== "encargado"}
                              className="w-20 text-center"
                            />
                            {product.opening_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          {userRole === "encargado" && !product.opening_locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLockField(product.product_id, "opening")}
                              className="flex items-center"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Guardar
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Ingreso de Mercadería - Solo editable por encargado y si no está bloqueado */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={product.incoming_quantity || ""}
                              disabled={true}
                              className="w-20 text-center"
                            />
                            {product.incoming_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          {userRole === "encargado" && !product.incoming_locked && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleAddIncoming(product.product_id)}
                                className="flex items-center"
                              >
                                <Plus className="h-4 w-4 mr-1" />
                                Agregar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => finalizeIncoming(product.product_id)}
                                className="flex items-center"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Finalizar
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* Stock de Cierre - Solo editable por encargado y si no está bloqueado */}
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={product.closing_quantity || ""}
                              onChange={(e) =>
                                handleStockDataChange(
                                  product.product_id,
                                  "closing_quantity",
                                  e.target.value === "" ? null : Number.parseInt(e.target.value),
                                )
                              }
                              disabled={product.closing_locked || userRole !== "encargado"}
                              className="w-20 text-center"
                            />
                            {product.closing_locked && <Lock className="h-4 w-4 text-muted-foreground" />}
                          </div>
                          {userRole === "encargado" && !product.closing_locked && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleLockField(product.product_id, "closing")}
                              className="flex items-center"
                            >
                              <Save className="h-4 w-4 mr-1" />
                              Guardar
                            </Button>
                          )}
                        </div>
                      </TableCell>

                      {/* Campos solo visibles para administradores */}
                      {userRole === "administrador" && (
                        <>
                          {/* Unidades Vendidas */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={product.units_sold || ""}
                              onChange={(e) =>
                                handleStockDataChange(
                                  product.product_id,
                                  "units_sold",
                                  e.target.value === "" ? null : Number.parseInt(e.target.value),
                                )
                              }
                              className="w-20 text-center"
                            />
                          </TableCell>

                          {/* Decomisos */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={product.discarded_quantity || ""}
                              onChange={(e) =>
                                handleStockDataChange(
                                  product.product_id,
                                  "discarded_quantity",
                                  e.target.value === "" ? null : Number.parseInt(e.target.value),
                                )
                              }
                              className="w-20 text-center"
                            />
                          </TableCell>

                          {/* Consumos Internos - Solo si el producto los tiene */}
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              value={product.internal_consumption || ""}
                              onChange={(e) =>
                                handleStockDataChange(
                                  product.product_id,
                                  "internal_consumption",
                                  e.target.value === "" ? null : Number.parseInt(e.target.value),
                                )
                              }
                              disabled={!product.has_internal_consumption}
                              className="w-20 text-center"
                            />
                          </TableCell>

                          {/* Diferencia - Calculada automáticamente */}
                          <TableCell>
                            <div className="flex items-center justify-between">
                              <span
                                className={
                                  product.difference === null
                                    ? ""
                                    : product.difference === 0
                                      ? "text-green-600 font-medium"
                                      : product.difference > 0
                                        ? "text-amber-600 font-medium"
                                        : "text-red-600 font-medium"
                                }
                              >
                                {product.difference === null ? "-" : product.difference}
                              </span>

                              {product.difference !== null && product.difference !== 0 && (
                                <AlertTriangle
                                  className={`h-4 w-4 ${product.difference > 0 ? "text-amber-600" : "text-red-600"}`}
                                />
                              )}
                            </div>
                          </TableCell>
                        </>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={() => router.push("/stock-check")}>
                Cancelar
              </Button>

              <div className="flex gap-2">
                {userRole === "administrador" && (
                  <Button variant="outline" onClick={updateAllDifferences}>
                    Calcular Diferencias
                  </Button>
                )}

                <Button onClick={handleSaveSheet} disabled={isLoading}>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar
                </Button>

                <Button
                  variant="default"
                  onClick={handleFinalizeSheet}
                  disabled={isLoading || sheetData.status === "completado"}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Finalizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Diálogo para agregar ingreso de mercadería */}
        <Dialog open={showIncomingDialog} onOpenChange={setShowIncomingDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agregar Ingreso de Mercadería</DialogTitle>
              <DialogDescription>Ingrese la cantidad de unidades recibidas</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="incoming-amount">Cantidad</Label>
                <Input
                  id="incoming-amount"
                  type="number"
                  min="1"
                  value={incomingAmount || ""}
                  onChange={(e) => setIncomingAmount(Number.parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowIncomingDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={confirmIncoming}>Agregar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}

