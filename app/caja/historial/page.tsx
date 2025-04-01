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
import { ArrowLeft, Search, Eye, Calendar, ArrowUpDown, Filter } from 'lucide-react'
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

// Meses para filtrar
const meses = [
  { value: "all", label: "Todos los meses" },
  { value: "1", label: "Enero" },
  { value: "2", label: "Febrero" },
  { value: "3", label: "Marzo" },
  { value: "4", label: "Abril" },
  { value: "5", label: "Mayo" },
  { value: "6", label: "Junio" },
  { value: "7", label: "Julio" },
  { value: "8", label: "Agosto" },
  { value: "9", label: "Septiembre" },
  { value: "10", label: "Octubre" },
  { value: "11", label: "Noviembre" },
  { value: "12", label: "Diciembre" },
]

// Años para filtrar (últimos 5 años)
const currentYear = new Date().getFullYear()
const años = [
  { value: "all", label: "Todos los años" },
  ...Array.from({ length: 5 }, (_, i) => ({
    value: (currentYear - i).toString(),
    label: (currentYear - i).toString(),
  })),
]

export default function HistorialCajaPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [isLoading, setIsLoading] = useState(true)
  const [operaciones, setOperaciones] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")
  const [filterTipo, setFilterTipo] = useState("all")
  const [filterMes, setFilterMes] = useState("all")
  const [filterAño, setFilterAño] = useState(currentYear.toString())
  const [sortConfig, setSortConfig] = useState<{
    key: string
    direction: "ascending" | "descending"
  }>({ key: "fecha", direction: "descending" })

  // Cargar operaciones
  useEffect(() => {
    const fetchOperaciones = async () => {
      try {
        setIsLoading(true)
        
        // Construir filtros de fecha
        let fechaDesde, fechaHasta
        
        if (filterAño !== "all") {
          if (filterMes !== "all") {
            // Filtrar por mes y año específicos
            const mes = parseInt(filterMes, 10)
            fechaDesde = new Date(parseInt(filterAño, 10), mes - 1, 1).toISOString()
            fechaHasta = new Date(parseInt(filterAño, 10), mes, 0).toISOString()
          } else {
            // Filtrar solo por año
            fechaDesde = new Date(parseInt(filterAño, 10), 0, 1).toISOString()
            fechaHasta = new Date(parseInt(filterAño, 10), 11, 31).toISOString()
          }
        }
        
        // Consultar aperturas
        let aperturasPromise = supabase
          .from('cash_register_openings')
          .select('*, local:local_id(*)')
        
        // Consultar cierres
        let cierresPromise = supabase
          .from('cash_register_closings')
          .select('*, local:local_id(*)')
        
        // Aplicar filtros comunes
        if (filterLocal !== "all") {
          aperturasPromise = aperturasPromise.eq('local_id', filterLocal)
          cierresPromise = cierresPromise.eq('local_id', filterLocal)
        }
        
        // Aplicar filtros de fecha
        if (fechaDesde && fechaHasta) {
          aperturasPromise = aperturasPromise.gte('fecha', fechaDesde).lte('fecha', fechaHasta)
          cierresPromise = cierresPromise.gte('fecha', fechaDesde).lte('fecha', fechaHasta)
        }
        
        // Ejecutar consultas en paralelo
        let [aperturasResult, cierresResult] = await Promise.all([
          filterTipo === "cierre" ? { data: [] } : aperturasPromise,
          filterTipo === "apertura" ? { data: [] } : cierresPromise
        ])
        
        // Procesar resultados
        const aperturas = (aperturasResult.data || []).map(item => ({
          ...item,
          tipo: 'apertura',
          monto: item.saldo_inicial,
          responsable: item.responsable,
          fecha_completa: item.fecha
        }))
        
        const cierres = (cierresResult.data || []).map(item => ({
          ...item,
          tipo: 'cierre',
          monto: item.ventas_totales,
          responsable: item.responsable,
          fecha_completa: item.fecha
        }))
        
        // Combinar resultados
        let todasOperaciones = [...aperturas, ...cierres]
        
        // Ordenar
        todasOperaciones.sort((a, b) => {
          const dateA = new Date(a.fecha_completa).getTime()
          const dateB = new Date(b.fecha_completa).getTime()
          
          if (sortConfig.direction === 'ascending') {
            return dateA - dateB
          } else {
            return dateB - dateA
          }
        })
        
        setOperaciones(todasOperaciones)
      } catch (error) {
        console.error("Error al cargar operaciones:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las operaciones",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchOperaciones()
  }, [filterLocal, filterTipo, filterMes, filterAño, sortConfig, supabase])

  // Función para ordenar
  const requestSort = (key: string) => {
    let direction: "ascending" | "descending" = "ascending"
    if (sortConfig.key === key && sortConfig.direction === "ascending") {
      direction = "descending"
    }
    setSortConfig({ key, direction })
  }

  // Filtrar operaciones por término de búsqueda
  const filteredOperaciones = operaciones.filter((operacion) => {
    return (
      operacion.responsable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operacion.local?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      operacion.turno?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })

  // Formatear fecha
  const formatFecha = (fechaStr: string) => {
    try {
      const fecha = parseISO(fechaStr)
      return format(fecha, "dd/MM/yyyy", { locale: es })
    } catch (error) {
      return fechaStr
    }
  }

  // Renderizar badge de tipo de operación
  const renderTipoBadge = (tipo: string) => {
    switch (tipo) {
      case "apertura":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Apertura
          </Badge>
        )
      case "cierre":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Cierre
          </Badge>
        )
      default:
        return <Badge variant="outline">{tipo}</Badge>
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Historial de Operaciones</h1>
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
                  placeholder="Buscar por responsable o local..."
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
                  {locales.map((local) => (
                    <SelectItem key={local.id} value={local.id}>
                      {local.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterTipo} onValueChange={setFilterTipo}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Tipo de operación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las operaciones</SelectItem>
                  <SelectItem value="apertura">Aperturas</SelectItem>
                  <SelectItem value="cierre">Cierres</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterMes} onValueChange={setFilterMes}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Mes" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterAño} onValueChange={setFilterAño}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Año" />
                </SelectTrigger>
                <SelectContent>
                  {años.map((año) => (
                    <SelectItem key={año.value} value={año.value}>
                      {año.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Listado de Operaciones</CardTitle>
            <CardDescription>
              Historial de aperturas y cierres de caja
            </CardDescription>
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
                    <TableHead>Local</TableHead>
                    <TableHead>Turno</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Responsable</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOperaciones.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No se encontraron operaciones
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredOperaciones.map((operacion) => (
                      <TableRow key={`${operacion.tipo}-${operacion.id}`}>
                        <TableCell>{formatFecha(operacion.fecha_completa)}</TableCell>
                        <TableCell>
                          {operacion.local?.name || locales.find(l => l.id === operacion.local_id)?.name || operacion.local_id}
                        </TableCell>
                        <TableCell className="capitalize">{operacion.turno}</TableCell>
                        <TableCell>{renderTipoBadge(operacion.tipo)}</TableCell>
                        <TableCell>{operacion.responsable}</TableCell>
                        <TableCell className="text-right">
                          ${operacion.monto?.toLocaleString() || '0'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            title="Ver detalles"
                            onClick={() => router.push(`/caja/${operacion.tipo === 'apertura' ? 'apertura' : 'cierre'}/${operacion.id}`)}
                          >
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