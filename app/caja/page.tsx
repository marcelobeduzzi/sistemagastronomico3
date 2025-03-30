"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { PlusCircle, Search, FileDown, Eye, AlertTriangle, DollarSign, ArrowUpDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

// Lista de locales para filtrar
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

// Datos de ejemplo para aperturas y cierres
const aperturasMock = [
  {
    id: "ap1",
    localId: "cabildo",
    localName: "BR Cabildo",
    fecha: "2023-05-15",
    turno: "mañana",
    responsable: "Juan Pérez",
    montoInicial: 5000,
    estado: "aprobado",
    tieneCierre: true,
  },
  {
    id: "ap2",
    localId: "carranza",
    localName: "BR Carranza",
    fecha: "2023-05-15",
    turno: "tarde",
    responsable: "María López",
    montoInicial: 4500,
    estado: "aprobado",
    tieneCierre: false,
  },
  {
    id: "ap3",
    localId: "pacifico",
    localName: "BR Pacífico",
    fecha: "2023-05-14",
    turno: "mañana",
    responsable: "Carlos Gómez",
    montoInicial: 5200,
    estado: "aprobado",
    tieneCierre: true,
  },
]

const cierresMock = [
  {
    id: "ci1",
    aperturaId: "ap1",
    localId: "cabildo",
    localName: "BR Cabildo",
    fecha: "2023-05-15",
    turno: "mañana",
    responsable: "Juan Pérez",
    ventasTotales: 45000,
    efectivo: 15000,
    saldoEsperado: 15000,
    saldoReal: 14850,
    diferencia: -150,
    estado: "aprobado",
    tieneAlerta: false,
  },
  {
    id: "ci3",
    aperturaId: "ap3",
    localId: "pacifico",
    localName: "BR Pacífico",
    fecha: "2023-05-14",
    turno: "mañana",
    responsable: "Carlos Gómez",
    ventasTotales: 38500,
    efectivo: 12000,
    saldoEsperado: 12000,
    saldoReal: 11500,
    diferencia: -500,
    estado: "pendiente",
    tieneAlerta: true,
  },
]

export default function CajaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")
  const [filterFecha, setFilterFecha] = useState("")
  const [aperturas, setAperturas] = useState<any[]>([])
  const [cierres, setCierres] = useState<any[]>([])
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "fecha", direction: "descending" })

  const { user } = useAuth()

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        // Aquí iría la lógica para cargar datos de la API
        // Por ahora, usamos datos de ejemplo
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setAperturas(aperturasMock)
        setCierres(cierresMock)
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar y ordenar aperturas
  const filteredAperturas = aperturas
    .filter((apertura) => {
      const matchesSearch =
        apertura.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apertura.responsable.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLocal = filterLocal === "all" || apertura.localId === filterLocal

      const matchesFecha = !filterFecha || apertura.fecha === filterFecha

      return matchesSearch && matchesLocal && matchesFecha
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })

  // Filtrar y ordenar cierres
  const filteredCierres = cierres
    .filter((cierre) => {
      const matchesSearch =
        cierre.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cierre.responsable.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLocal = filterLocal === "all" || cierre.localId === filterLocal

      const matchesFecha = !filterFecha || cierre.fecha === filterFecha

      return matchesSearch && matchesLocal && matchesFecha
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? -1 : 1
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "ascending" ? 1 : -1
      }
      return 0
    })

  // Formatear fecha
  const formatFecha = (fechaStr: string) => {
    try {
      const fecha = new Date(fechaStr)
      return format(fecha, "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return fechaStr
    }
  }

  // Renderizar badge de estado
  const renderEstadoBadge = (estado: string) => {
    switch (estado) {
      case "aprobado":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Aprobado
          </Badge>
        )
      case "pendiente":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "rechazado":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Rechazado
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  // Componente para la página de inicio
  const HomePage = () => {
    // Datos simulados para el panel de resumen
    const summaryData = {
      pendingOpenings: 2,
      pendingClosings: 3,
      activeAlerts: 5,
      todaySales: 125000,
    }

    return (
      <div className="space-y-6">
        {/* Panel de resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Aperturas Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.pendingOpenings}</div>
              <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Cierres Pendientes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summaryData.pendingClosings}</div>
              <p className="text-xs text-muted-foreground mt-1">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Alertas Activas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <div className="text-2xl font-bold">{summaryData.activeAlerts}</div>
                {summaryData.activeAlerts > 0 && <AlertTriangle className="ml-2 h-5 w-5 text-yellow-500" />}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Requieren revisión</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Ventas de Hoy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(summaryData.todaySales)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total en todos los locales</p>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
            <CardDescription>Operaciones comunes del sistema de caja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/caja/apertura")}
              >
                <PlusCircle className="h-6 w-6" />
                <span>Nueva Apertura</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/caja/cierre")}
              >
                <DollarSign className="h-6 w-6" />
                <span>Nuevo Cierre</span>
              </Button>

              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col items-center justify-center gap-2"
                onClick={() => router.push("/caja/alertas")}
              >
                <AlertTriangle className="h-6 w-6" />
                <span>Ver Alertas</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Operaciones recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Operaciones Recientes</CardTitle>
            <CardDescription>Últimas actividades en el sistema de caja</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Aquí irían las operaciones recientes */}
              <p className="text-muted-foreground text-center py-4">No hay operaciones recientes para mostrar</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Control de Caja</h1>
          <div className="flex gap-2">
            <Button onClick={() => router.push("/caja/apertura")}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Nueva Apertura
            </Button>
            <Button onClick={() => router.push("/caja/cierre")}>
              <DollarSign className="mr-2 h-4 w-4" />
              Nuevo Cierre
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por local o responsable..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={filterLocal} onValueChange={setFilterLocal}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por local" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los locales</SelectItem>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="w-full md:w-[200px]">
                  <Input
                    type="date"
                    value={filterFecha}
                    onChange={(e) => setFilterFecha(e.target.value)}
                    placeholder="Filtrar por fecha"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="home">Inicio</TabsTrigger>
              <TabsTrigger value="aperturas">Aperturas de Caja</TabsTrigger>
              <TabsTrigger value="cierres">Cierres de Caja</TabsTrigger>
            </TabsList>

            {/* Tab de Inicio */}
            <TabsContent value="home" className="space-y-4">
              <HomePage />
            </TabsContent>

            {/* Tab de Aperturas */}
            <TabsContent value="aperturas" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Aperturas de Caja</CardTitle>
                  <CardDescription>Listado de aperturas de caja registradas</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => requestSort("fecha")}>
                            Fecha
                            {sortConfig.key === "fecha" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => requestSort("localName")}>
                            Local
                            {sortConfig.key === "localName" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead className="text-right">Monto Inicial</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAperturas.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="h-24 text-center">
                              No se encontraron aperturas
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredAperturas.map((apertura) => (
                            <TableRow key={apertura.id}>
                              <TableCell>{formatFecha(apertura.fecha)}</TableCell>
                              <TableCell className="font-medium">{apertura.localName}</TableCell>
                              <TableCell>{apertura.turno === "mañana" ? "Mañana" : "Tarde"}</TableCell>
                              <TableCell>{apertura.responsable}</TableCell>
                              <TableCell className="text-right">${apertura.montoInicial.toLocaleString()}</TableCell>
                              <TableCell>{renderEstadoBadge(apertura.estado)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" title="Ver detalles">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {!apertura.tieneCierre && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      title="Realizar cierre"
                                      onClick={() => router.push(`/caja/cierre?aperturaId=${apertura.id}`)}
                                    >
                                      <DollarSign className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab de Cierres */}
            <TabsContent value="cierres" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Cierres de Caja</CardTitle>
                  <CardDescription>Listado de cierres de caja registrados</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="cursor-pointer" onClick={() => requestSort("fecha")}>
                            Fecha
                            {sortConfig.key === "fecha" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => requestSort("localName")}>
                            Local
                            {sortConfig.key === "localName" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead>Turno</TableHead>
                          <TableHead>Responsable</TableHead>
                          <TableHead className="text-right">Ventas</TableHead>
                          <TableHead className="text-right">Diferencia</TableHead>
                          <TableHead>Estado</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredCierres.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="h-24 text-center">
                              No se encontraron cierres
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredCierres.map((cierre) => (
                            <TableRow key={cierre.id}>
                              <TableCell>{formatFecha(cierre.fecha)}</TableCell>
                              <TableCell className="font-medium">{cierre.localName}</TableCell>
                              <TableCell>{cierre.turno === "mañana" ? "Mañana" : "Tarde"}</TableCell>
                              <TableCell>{cierre.responsable}</TableCell>
                              <TableCell className="text-right">${cierre.ventasTotales.toLocaleString()}</TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={
                                    cierre.diferencia < 0
                                      ? "text-red-600"
                                      : cierre.diferencia > 0
                                        ? "text-green-600"
                                        : ""
                                  }
                                >
                                  ${cierre.diferencia.toLocaleString()}
                                </span>
                                {cierre.tieneAlerta && (
                                  <AlertTriangle className="h-4 w-4 text-yellow-500 inline ml-1" />
                                )}
                              </TableCell>
                              <TableCell>{renderEstadoBadge(cierre.estado)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" title="Ver detalles">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button variant="ghost" size="icon" title="Exportar">
                                    <FileDown className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}





