"use client"

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
import { ArrowLeft, Search, FileDown, Eye } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Badge } from "@/components/ui/badge"

// Lista de locales para seleccionar
const locales = [
  { id: "cabildo", name: "BR Cabildo" },
  { id: "carranza", name: "BR Carranza" },
  { id: "pacifico", name: "BR Pacífico" },
  { id: "lavalle", name: "BR Lavalle" },
  { id: "rivadavia", name: "BR Rivadavia" },
  { id: "aguero", name: "BR Aguero" },
  { id: "dorrego", name: "BR Dorrego" },
  { id: "dean_dennys", name: "Dean & Dennys" },
]

// Interfaz para los cierres de caja
interface CierreCaja {
  id: string
  local_id: string
  local_name: string
  date: string
  shift: string
  responsible: string
  supervisor: string | null
  total_sales: number
  cash_sales: number
  credit_card_sales: number
  debit_card_sales: number
  transfer_sales: number
  mercado_pago_sales: number
  other_sales: number
  initial_balance: number
  total_expenses: number
  total_withdrawals: number
  expected_balance: number
  actual_balance: number
  difference: number
  difference_percentage: number
  status: string
  has_alert: boolean
  created_at: string
}

export default function HistorialCajaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(false)
  const [cierres, setCierres] = useState<CierreCaja[]>([])
  const [filtros, setFiltros] = useState({
    local_id: "",
    fecha_desde: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
    fecha_hasta: format(new Date(), "yyyy-MM-dd"),
    turno: "",
    estado: "",
  })

  // Cargar cierres de caja
  useEffect(() => {
    const fetchCierres = async () => {
      try {
        setIsLoading(true)
        
        let query = supabase
          .from('cash_register_closings')
          .select('*')
          .order('date', { ascending: false })
          .order('created_at', { ascending: false })
        
        // Aplicar filtros
        if (filtros.local_id) {
          query = query.eq('local_id', filtros.local_id)
        }
        
        if (filtros.fecha_desde) {
          query = query.gte('date', filtros.fecha_desde)
        }
        
        if (filtros.fecha_hasta) {
          query = query.lte('date', filtros.fecha_hasta)
        }
        
        if (filtros.turno) {
          query = query.eq('shift', filtros.turno)
        }
        
        if (filtros.estado) {
          query = query.eq('status', filtros.estado)
        }
        
        const { data, error } = await query
        
        if (error) throw error
        
        setCierres(data || [])
      } catch (error) {
        console.error("Error al cargar cierres de caja:", error)
      } finally {
        setIsLoading(false)
      }
    }
    
    fetchCierres()
  }, [supabase, filtros])

  // Manejar cambios en los filtros
  const handleFiltroChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar cambios en selects
  const handleSelectChange = (name: string, value: string) => {
    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Aplicar filtros
  const aplicarFiltros = () => {
    // Los filtros se aplican automáticamente en el useEffect
  }

  // Resetear filtros
  const resetearFiltros = () => {
    setFiltros({
      local_id: "",
      fecha_desde: format(new Date(new Date().setDate(new Date().getDate() - 30)), "yyyy-MM-dd"),
      fecha_hasta: format(new Date(), "yyyy-MM-dd"),
      turno: "",
      estado: "",
    })
  }

  // Ver detalle de un cierre
  const verDetalle = (id: string) => {
    router.push(`/caja/historial/${id}`)
  }

  // Exportar a Excel (simulado)
  const exportarExcel = () => {
    alert("Funcionalidad de exportación a Excel en desarrollo")
  }

  // Obtener color de badge según estado
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'aprobado':
        return 'bg-green-100 text-green-800'
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800'
      case 'rechazado':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Historial de Cierres de Caja</h1>
          <Button variant="outline" onClick={() => router.push("/caja")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="space-y-2">
                <Label htmlFor="local_id">Local</Label>
                <Select
                  value={filtros.local_id}
                  onValueChange={(value) => handleSelectChange("local_id", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los locales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los locales</SelectItem>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_desde">Desde</Label>
                <Input
                  id="fecha_desde"
                  name="fecha_desde"
                  type="date"
                  value={filtros.fecha_desde}
                  onChange={handleFiltroChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_hasta">Hasta</Label>
                <Input
                  id="fecha_hasta"
                  name="fecha_hasta"
                  type="date"
                  value={filtros.fecha_hasta}
                  onChange={handleFiltroChange}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="turno">Turno</Label>
                <Select
                  value={filtros.turno}
                  onValueChange={(value) => handleSelectChange("turno", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los turnos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los turnos</SelectItem>
                    <SelectItem value="mañana">Mañana</SelectItem>
                    <SelectItem value="tarde">Tarde</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="estado">Estado</Label>
                <Select
                  value={filtros.estado}
                  onValueChange={(value) => handleSelectChange("estado", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Todos los estados</SelectItem>
                    <SelectItem value="aprobado">Aprobado</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="rechazado">Rechazado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={resetearFiltros}>
                Resetear
              </Button>
              <Button onClick={aplicarFiltros}>
                <Search className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Resultados</CardTitle>
            <Button variant="outline" onClick={exportarExcel}>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a Excel
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Ventas Totales</TableHead>
                    <TableHead className="text-right">Diferencia</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cierres.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-4">
                        No se encontraron registros
                      </TableCell>
                    </TableRow>
                  ) : (
                    cierres.map((cierre) => (
                      <TableRow key={cierre.id}>
                        <TableCell>{cierre.date}</TableCell>
                        <TableCell>{cierre.local_name}</TableCell>
                        <TableCell>
                          {cierre.shift === 'mañana' ? 'Mañana' : cierre.shift === 'tarde' ? 'Tarde' : cierre.shift}
                        </TableCell>
                        <TableCell>{cierre.responsible}</TableCell>
                        <TableCell className="text-right">${cierre.total_sales.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <span className={cierre.difference !== 0 ? (cierre.difference > 0 ? "text-green-600" : "text-red-600") : ""}>
                            ${cierre.difference.toLocaleString()}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(cierre.status)}>
                            {cierre.status === 'aprobado' ? 'Aprobado' : 
                             cierre.status === 'pendiente' ? 'Pendiente' : 
                             cierre.status === 'rechazado' ? 'Rechazado' : cierre.status}
                          </Badge>
                          {cierre.has_alert && (
                            <Badge className="ml-2 bg-red-100 text-red-800">
                              Alerta
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => verDetalle(cierre.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}