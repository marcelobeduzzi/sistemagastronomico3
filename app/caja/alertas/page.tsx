"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format, parseISO } from "date-fns"
import { es } from "date-fns/locale"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Search, Eye, AlertTriangle, CheckCircle, ArrowUpDown } from 'lucide-react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// Lista de locales para filtrar
const locales = [
  { id: "all", name: "Todos los locales" },
  { id: "cabildo", name: "BR Cabildo" },
  { id: "carranza", name: "BR Carranza" },
  { id: "pacifico", name: "BR Pacífico" },
  { id: "lavalle", name: "BR Lavalle" },
  { id: "rivadavia", name: "BR Rivadavia" },
  { id: "aguero", name: "BR Aguero" },
  { id: "dorrego", name: "BR Dorrego" },
  { id: "dean_dennys", name: "Dean & Dennys" },
]

export default function AlertasPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [alertas, setAlertas] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")
  const [filterLevel, setFilterLevel] = useState("all")
  const [filterStatus, setFilterStatus] = useState("pending")
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "date", direction: "descending" })

  // Cargar alertas
  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        setIsLoading(true)
        
        let query = supabase
          .from('cash_register_alerts')
          .select('*')
          
        // Aplicar filtros
        if (filterLocal !== "all") {
          query = query.eq('local_id', filterLocal)
        }
        
        if (filterLevel !== "all") {
          query = query.eq('alert_level', filterLevel)
        }
        
        if (filterStatus !== "all") {
          query = query.eq('status', filterStatus)
        }
        
        // Ordenar
        query = query.order(sortConfig.key, { ascending: sortConfig.direction === 'ascending' })
        
        const { data, error } = await query
        
        if (error) throw error
        
        setAlertas(data || [])
      } catch (error) {
        console.error("Error al cargar alertas:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las alertas",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlertas()
  }, [filterLocal, filterLevel, filterStatus, sortConfig, supabase])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar alertas por término de búsqueda
  const filteredAlertas = alertas.filter((alerta) => {
    return (
      alerta.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alerta.local_name?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Marcar alerta como resuelta
  const resolveAlert = async (alertId: string) => {
    try {
      setIsLoading(true)
      
      const { error } = await supabase
        .from('cash_register_alerts')
        .update({ 
          status: 'resolved',
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId)
      
      if (error) throw error
      
      // Actualizar la lista de alertas
      setAlertas(alertas.map(alerta => 
        alerta.id === alertId 
          ? { ...alerta, status: 'resolved', updated_at: new Date().toISOString() }
          : alerta
      ))
      
      toast({
        title: "Alerta resuelta",
        description: "La alerta ha sido marcada como resuelta",
      })
    } catch (error) {
      console.error("Error al resolver la alerta:", error)
      toast({
        title: "Error",
        description: "No se pudo resolver la alerta",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Formatear fecha
  const formatFecha = (fechaStr: string) => {
    try {
      const fecha = parseISO(fechaStr)
      return format(fecha, "dd/MM/yyyy HH:mm", { locale: es })
    } catch (error) {
      return fechaStr
    }
  }

  // Renderizar badge de nivel de alerta
  const renderLevelBadge = (level: string) => {
    switch (level) {
      case "high":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Alta
          </Badge>
        )
      case "medium":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Media
          </Badge>
        )
      case "low":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Baja
          </Badge>
        )
      default:
        return <Badge variant="outline">{level}</Badge>
    }
  }

  // Renderizar badge de estado
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            Pendiente
          </Badge>
        )
      case "in_progress":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            En revisión
          </Badge>
        )
      case "resolved":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Resuelta
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // Obtener tipo de alerta legible
  const getAlertTypeDisplay = (type: string) => {
    switch (type) {
      case "diferencia_caja":
        return "Diferencia de caja"
      case "gastos_elevados":
        return "Gastos elevados"
      default:
        return type
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Alertas de Caja</h1>
          <Button variant="outline" onClick={() => router.push("/caja")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar en alertas..."
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
              
              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por nivel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los niveles</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="in_progress">En revisión</SelectItem>
                  <SelectItem value="resolved">Resueltas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Alertas</CardTitle>
            <CardDescription>
              {filterStatus === "pending" 
                ? "Alertas pendientes que requieren atención" 
                : filterStatus === "all" 
                  ? "Todas las alertas del sistema"
                  : filterStatus === "in_progress"
                    ? "Alertas en proceso de revisión"
                    : "Alertas que ya han sido resueltas"}
            </CardDescription>
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
                    <TableHead>Local</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Mensaje</TableHead>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAlertas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron alertas
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAlertas.map((alerta) => (
                      <TableRow key={alerta.id}>
                        <TableCell>{formatFecha(alerta.date)}</TableCell>
                        <TableCell>{alerta.local_name}</TableCell>
                        <TableCell>{getAlertTypeDisplay(alerta.type)}</TableCell>
                        <TableCell className="max-w-xs truncate">{alerta.message}</TableCell>
                        <TableCell>{renderLevelBadge(alerta.alert_level)}</TableCell>
                        <TableCell>{renderStatusBadge(alerta.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              title="Ver detalles"
                              onClick={() => router.push(`/caja/alertas/${alerta.id}`)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            
                            {alerta.status === "pending" && (
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Marcar como resuelta"
                                onClick={() => resolveAlert(alerta.id)}
                              >
                                <CheckCircle className="h-4 w-4 text-green-600" />
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
      </div>
    </DashboardLayout>
  )
}

