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
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import { ArrowLeft, Plus, Eye, FileSpreadsheet } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type StockSheet = {
  id: number
  date: string
  location_id: number
  location_name: string
  manager_id: number
  manager_name: string
  shift: string
  status: string
  created_at: string
}

export default function StockMatrixListPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [stockSheets, setStockSheets] = useState<StockSheet[]>([])
  const [filteredSheets, setFilteredSheets] = useState<StockSheet[]>([])
  const [filterLocation, setFilterLocation] = useState<string>("all")
  const [filterDate, setFilterDate] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [locations, setLocations] = useState<{ id: number; name: string }[]>([])

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        const supabase = createClient()

        // Fetch locations for filter
        const { data: locationsData, error: locationsError } = await supabase
          .from("locations")
          .select("id, name")
          .eq("active", true)
          .order("name")

        if (locationsError) {
          console.error("Error al cargar locales:", locationsError)
          toast({
            title: "Error",
            description: "No se pudieron cargar los locales para el filtro",
            variant: "destructive",
          })
        } else {
          setLocations(locationsData || [])
        }

        // Fetch stock sheets
        const { data: sheetsData, error: sheetsError } = await supabase
          .from("stock_matrix_sheets")
          .select(`
            id,
            date,
            location_id,
            locations(name),
            manager_id,
            managers(name),
            shift,
            status,
            created_at
          `)
          .order("date", { ascending: false })

        if (sheetsError) {
          console.error("Error al cargar planillas:", sheetsError)
          toast({
            title: "Error",
            description: "No se pudieron cargar las planillas",
            variant: "destructive",
          })
          setStockSheets([])
          setFilteredSheets([])
        } else {
          // Transformar los datos para que tengan el formato correcto
          const formattedSheets: StockSheet[] = (sheetsData || []).map((sheet) => ({
            id: sheet.id,
            date: sheet.date,
            location_id: sheet.location_id,
            location_name: sheet.locations?.name || "Desconocido",
            manager_id: sheet.manager_id,
            manager_name: sheet.managers?.name || "Desconocido",
            shift: sheet.shift,
            status: sheet.status,
            created_at: sheet.created_at,
          }))

          setStockSheets(formattedSheets)
          setFilteredSheets(formattedSheets)
        }
      } catch (error: any) {
        console.error("Error fetching data:", error.message)
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        })
        setStockSheets([])
        setFilteredSheets([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Aplicar filtros cuando cambien
  useEffect(() => {
    let filtered = [...stockSheets]

    // Filtrar por local
    if (filterLocation !== "all") {
      filtered = filtered.filter((sheet) => sheet.location_id.toString() === filterLocation)
    }

    // Filtrar por fecha
    if (filterDate) {
      filtered = filtered.filter((sheet) => sheet.date === filterDate)
    }

    // Filtrar por estado
    if (filterStatus !== "all") {
      filtered = filtered.filter((sheet) => sheet.status === filterStatus)
    }

    setFilteredSheets(filtered)
  }, [filterLocation, filterDate, filterStatus, stockSheets])

  const handleViewSheet = (id: number) => {
    router.push(`/stock-matrix/${id}`)
  }

  const handleCreateNew = () => {
    router.push("/stock-matrix")
  }

  const handleExportToExcel = (id: number) => {
    toast({
      title: "Exportando",
      description: `Exportando planilla #${id} a Excel...`,
    })
    // Aquí iría la lógica para exportar a Excel
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "borrador":
        return <Badge variant="outline">Borrador</Badge>
      case "parcial":
        return <Badge variant="secondary">Parcial</Badge>
      case "completado":
        return <Badge variant="default">Completado</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Planillas de Stock</h1>
            <p className="text-muted-foreground">Listado de planillas de stock matriz</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/stock-check")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Planilla
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-location">Local</Label>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger id="filter-location">
                    <SelectValue placeholder="Todos los locales" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los locales</SelectItem>
                    {locations.map((location) => (
                      <SelectItem key={location.id} value={location.id.toString()}>
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-date">Fecha</Label>
                <Input
                  id="filter-date"
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filter-status">Estado</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger id="filter-status">
                    <SelectValue placeholder="Todos los estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="borrador">Borrador</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="completado">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de planillas */}
        <Card>
          <CardHeader>
            <CardTitle>Planillas de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Cargando planillas...</div>
            ) : filteredSheets.length === 0 ? (
              <div className="text-center py-4">
                {stockSheets.length === 0
                  ? "No hay planillas registradas en el sistema"
                  : "No se encontraron planillas con los filtros seleccionados"}
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Encargado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSheets.map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>{sheet.id}</TableCell>
                        <TableCell>{format(new Date(sheet.date), "dd/MM/yyyy")}</TableCell>
                        <TableCell className="capitalize">{sheet.shift}</TableCell>
                        <TableCell>{sheet.location_name}</TableCell>
                        <TableCell>{sheet.manager_name}</TableCell>
                        <TableCell>{getStatusBadge(sheet.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleViewSheet(sheet.id)}
                              title="Ver planilla"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleExportToExcel(sheet.id)}
                              title="Exportar a Excel"
                            >
                              <FileSpreadsheet className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
