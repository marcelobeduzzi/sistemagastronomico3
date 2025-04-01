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
import { PlusCircle, Search, FileDown, Eye, AlertTriangle, DollarSign, ArrowUpDown } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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

export default function CajaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("home")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")
  const [filterFecha, setFilterFecha] = useState("")
  const [aperturas, setAperturas] = useState<any[]>([])
  const [cierres, setCierres] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState({
    pendingOpenings: 0,
    pendingClosings: 0,
    activeAlerts: 0,
    todaySales: 0,
  })
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "fecha", direction: "descending" })

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        
        // Obtener fecha actual para filtrar datos de hoy
        const today = format(new Date(), "yyyy-MM-dd")
        
        // Consultas en paralelo
        const [aperturasResult, cierresResult, alertasResult, ventasHoyResult] = await Promise.all([
          // Aperturas
          supabase
            .from('cash_register_openings')
            .select('*')
            .order('date', { ascending: false }),
          
          // Cierres
          supabase
            .from('cash_register_closings')
            .select('*')
            .order('date', { ascending: false }),
          
          // Alertas
          supabase
            .from('cash_register_alerts')
            .select('*')
            .eq('status', 'pending'),
          
          // Ventas de hoy
          supabase
            .from('cash_register_closings')
            .select('total_sales')
            .eq('date', today)
        ])
        
        if (aperturasResult.error) throw aperturasResult.error
        if (cierresResult.error) throw cierresResult.error
        if (alertasResult.error) throw alertasResult.error
        if (ventasHoyResult.error) throw ventasHoyResult.error
        
        // Procesar datos
        const aperturasData = aperturasResult.data || []
        const cierresData = cierresResult.data || []
        const alertasData = alertasResult.data || []
        
        // Calcular ventas de hoy
        const ventasHoy = ventasHoyResult.data?.reduce((sum, item) => sum + (item.total_sales || 0), 0) || 0
        
        // Contar aperturas pendientes (sin cierre)
        const aperturasPendientes = aperturasData.filter(a => !a.has_closing && a.status === 'aprobado').length
        
        // Contar cierres pendientes (no aprobados)
        const cierresPendientes = cierresData.filter(c => c.status === 'pendiente').length
        
        // Actualizar estados
        setAperturas(aperturasData)
        setCierres(cierresData)
        setAlertas(alertasData)
        
        // Actualizar datos de resumen
        setSummaryData({
          pendingOpenings: aperturasPendientes,
          pendingClosings: cierresPendientes,
          activeAlerts: alertasData.length,
          todaySales: ventasHoy
        })
      } catch (error) {
        console.error("Error al cargar datos:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [supabase])

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
        apertura.local_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        apertura.responsible?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLocal = filterLocal === "all" || apertura.local_id === filterLocal

      const matchesFecha = !filterFecha || apertura.date === filterFecha

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
        cierre.local_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        cierre.responsible?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesLocal = filterLocal === "all" || cierre.local_id === filterLocal

      const matchesFecha = !filterFecha || cierre.date === filterFecha

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
              {/* Mostrar las últimas 5 operaciones (aperturas o cierres) */}
              {[...aperturas, ...cierres]
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .slice(0, 5)
                .map((operacion) => {
                  const esApertura = 'initial_amount' in operacion
                  return (
                    <div key={operacion.id} className="flex items-center justify-between border-b pb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={esApertura ? "bg-blue-50 text-blue-700" : "bg-green-50 text-green-700"}>
                            {esApertura ? "Apertura" : "Cierre"}
                          </Badge>
                          <span className="font-medium">{operacion.local_name}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {formatFecha(operacion.date)} - {operacion.shift === 'mañana' ? 'Mañana' : 'Tarde'} - {operacion.responsible}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push(`/caja/${esApertura ? 'apertura' : 'cierre'}/${operacion.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              
              {[...aperturas, ...cierres].length === 0 && (
                <p className="text-muted-foreground text-center py-4">No hay operaciones recientes para mostrar</p>
              )}
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
                          <TableHead className="cursor-pointer" onClick={() => requestSort("date")}>
                            Fecha
                            {sortConfig.key === "date" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
                          </TableHead>
                          <TableHead className="cursor-pointer" onClick={() => requestSort("local_name")}>
                            Local
                            {sortConfig.key === "local_name" && <ArrowUpDown className="ml-2 h-4 w-4 inline" />}
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
                              <TableCell>{formatFecha(apertura.date)}</TableCell>
                              <TableCell className="font-medium">{apertura.local_name}</TableCell>
                              <TableCell>{apertura.shift === "mañana" ? "Mañana" : "Tarde"}</TableCell>
                              <TableCell>{apertura.responsible}</TableCell>
                              <TableCell className="text-right">${apertura.initial_amount?.toLocaleString()}</TableCell>
                              <TableCell>{renderEstadoBadge(apertura.status)}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    title="Ver detalles"
                                    onClick={() => router.push(`/caja/apertura/${apertura.id}`)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  {





