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
import { Badge } from "@/components/ui/badge"
import { Search, Eye, AlertTriangle, AlertCircle, Info, CheckCircle2, ArrowLeft, BellOff } from "lucide-react"

// Datos de ejemplo para alertas
const alertasMock = [
  {
    id: "al1",
    cajaId: "ci3",
    tipo: "cierre",
    nivelAlerta: "error",
    mensaje: "Diferencia significativa en cierre de caja",
    detalles: "Se detectó una diferencia de $500 (4.17%) en el cierre de caja del local BR Pacífico, turno mañana.",
    fecha: "2023-05-14T15:30:00",
    estado: "activa",
    localId: "pacifico",
    localName: "BR Pacífico",
  },
  {
    id: "al2",
    cajaId: "ap2",
    tipo: "apertura",
    nivelAlerta: "warning",
    mensaje: "Apertura sin cierre previo",
    detalles: "Se realizó una apertura de caja sin haber cerrado el turno anterior en el local BR Carranza.",
    fecha: "2023-05-15T09:15:00",
    estado: "resuelta",
    localId: "carranza",
    localName: "BR Carranza",
  },
  {
    id: "al3",
    cajaId: "ci1",
    tipo: "cierre",
    nivelAlerta: "info",
    mensaje: "Cierre con observaciones",
    detalles: "El cierre de caja tiene observaciones sobre el estado de la terminal POS.",
    fecha: "2023-05-15T14:45:00",
    estado: "activa",
    localId: "cabildo",
    localName: "BR Cabildo",
  },
  {
    id: "al4",
    cajaId: "ap3",
    tipo: "apertura",
    nivelAlerta: "critical",
    mensaje: "Monto inicial inusualmente alto",
    detalles: "El monto inicial de la apertura es un 30% mayor al habitual para este turno.",
    fecha: "2023-05-14T08:30:00",
    estado: "ignorada",
    localId: "pacifico",
    localName: "BR Pacífico",
  },
]

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

export default function AlertasCajaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")
  const [filterNivel, setFilterNivel] = useState("all")
  const [filterEstado, setFilterEstado] = useState("all")
  const [alertas, setAlertas] = useState<any[]>([])

  // Cargar datos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        // Aquí iría la lógica para cargar datos de la API
        // Por ahora, usamos datos de ejemplo
        await new Promise((resolve) => setTimeout(resolve, 1000))
        setAlertas(alertasMock)
      } catch (error) {
        console.error("Error al cargar alertas:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filtrar alertas
  const filteredAlertas = alertas.filter((alerta) => {
    const matchesSearch =
      alerta.mensaje.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alerta.localName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alerta.detalles.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesLocal = filterLocal === "all" || alerta.localId === filterLocal

    const matchesNivel = filterNivel === "all" || alerta.nivelAlerta === filterNivel

    const matchesEstado = filterEstado === "all" || alerta.estado === filterEstado

    return matchesSearch && matchesLocal && matchesNivel && matchesEstado
  })

  // Formatear fecha
  const formatFecha = (fechaStr: string) => {
    try {
      const fecha = new Date(fechaStr)
      return format(fecha, "dd/MM/yyyy HH:mm", { locale: es })
    } catch (error) {
      return fechaStr
    }
  }

  // Renderizar icono según nivel de alerta
  const renderAlertIcon = (nivel: string) => {
    switch (nivel) {
      case "info":
        return <Info className="h-5 w-5 text-blue-500" />
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case "error":
        return <AlertCircle className="h-5 w-5 text-red-500" />
      case "critical":
        return <AlertCircle className="h-5 w-5 text-red-700" />
      default:
        return <Info className="h-5 w-5 text-gray-500" />
    }
  }

  // Renderizar badge de estado
  const renderEstadoBadge = (estado: string) => {
    switch (estado) {
      case "activa":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Activa
          </Badge>
        )
      case "resuelta":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Resuelta
          </Badge>
        )
      case "ignorada":
        return (
          <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
            Ignorada
          </Badge>
        )
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  // Marcar alerta como resuelta
  const marcarComoResuelta = (id: string) => {
    setAlertas(alertas.map((alerta) => (alerta.id === id ? { ...alerta, estado: "resuelta" } : alerta)))
  }

  // Marcar alerta como ignorada
  const marcarComoIgnorada = (id: string) => {
    setAlertas(alertas.map((alerta) => (alerta.id === id ? { ...alerta, estado: "ignorada" } : alerta)))
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Alertas de Caja</h1>
          <Button variant="outline" onClick={() => router.push("/caja")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver a Gestión de Caja
          </Button>
        </div>

        <div className="space-y-6">
          {/* Filtros */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por mensaje o local..."
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
                <Select value={filterNivel} onValueChange={setFilterNivel}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por nivel" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los niveles</SelectItem>
                    <SelectItem value="info">Información</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="critical">Crítico</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterEstado} onValueChange={setFilterEstado}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filtrar por estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los estados</SelectItem>
                    <SelectItem value="activa">Activas</SelectItem>
                    <SelectItem value="resuelta">Resueltas</SelectItem>
                    <SelectItem value="ignorada">Ignoradas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Listado de alertas */}
          <Card>
            <CardHeader>
              <CardTitle>Listado de Alertas</CardTitle>
              <CardDescription>Alertas generadas por el sistema de caja</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAlertas.length === 0 ? (
                <div className="text-center py-8">
                  <BellOff className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <p className="mt-4 text-lg font-medium">No hay alertas que coincidan con los filtros</p>
                  <p className="text-sm text-muted-foreground">Prueba con otros criterios de búsqueda</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAlertas.map((alerta) => (
                    <div
                      key={alerta.id}
                      className={`border rounded-lg p-4 ${
                        alerta.estado === "activa"
                          ? alerta.nivelAlerta === "critical"
                            ? "bg-red-50 border-red-200"
                            : alerta.nivelAlerta === "error"
                              ? "bg-red-50 border-red-200"
                              : alerta.nivelAlerta === "warning"
                                ? "bg-yellow-50 border-yellow-200"
                                : "bg-blue-50 border-blue-200"
                          : ""
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-1">{renderAlertIcon(alerta.nivelAlerta)}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{alerta.mensaje}</h3>
                            <div className="flex items-center gap-2">
                              {renderEstadoBadge(alerta.estado)}
                              <span className="text-xs text-muted-foreground">{formatFecha(alerta.fecha)}</span>
                            </div>
                          </div>
                          <p className="mt-1 text-sm">{alerta.detalles}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{alerta.localName}</span>
                              <span className="text-xs text-muted-foreground">
                                {alerta.tipo === "apertura" ? "Apertura" : "Cierre"}
                              </span>
                            </div>
                            {alerta.estado === "activa" && (
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    router.push(
                                      `/caja/${alerta.tipo === "apertura" ? "apertura" : "cierre"}/${alerta.cajaId}`,
                                    )
                                  }
                                >
                                  <Eye className="mr-1 h-3 w-3" />
                                  Ver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-green-600 border-green-200 hover:bg-green-50"
                                  onClick={() => marcarComoResuelta(alerta.id)}
                                >
                                  <CheckCircle2 className="mr-1 h-3 w-3" />
                                  Resolver
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-gray-600 border-gray-200 hover:bg-gray-50"
                                  onClick={() => marcarComoIgnorada(alerta.id)}
                                >
                                  <BellOff className="mr-1 h-3 w-3" />
                                  Ignorar
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

