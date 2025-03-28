"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import { db } from "@/lib/db"
import { exportToCSV, formatDate, generateAuditReport } from "@/lib/export-utils"
import type { Audit, AuditItem } from "@/types"
import type { ColumnDef } from "@tanstack/react-table"
import { Download, Plus, Calendar, FileText, List, Eye } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/date-picker"
import { Progress } from "@/components/ui/progress"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import Link from "next/link"

export default function AuditoriasPage() {
  const [audits, setAudits] = useState<Audit[]>([])
  const [recentAudits, setRecentAudits] = useState<Audit[]>([])
  const [auditItems, setAuditItems] = useState<AuditItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRecentLoading, setIsRecentLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [selectedLocal, setSelectedLocal] = useState<string>("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<string>("recent")
  const [selectedAudit, setSelectedAudit] = useState<Audit | null>(null)
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false)
  const { toast } = useToast()

  // Estado para el formulario de nueva auditoría
  const [newAudit, setNewAudit] = useState<Omit<Audit, "id">>({
    localId: "",
    local: "BR Cabildo",
    date: new Date().toISOString().split("T")[0],
    shift: "morning",
    supervisorId: "",
    supervisorName: "",
    managerId: "",
    managerName: "",
    totalScore: 0,
    items: [],
  })

  // Cargar auditorías recientes
  useEffect(() => {
    const fetchRecentAudits = async () => {
      if (activeTab !== "recent") return

      setIsRecentLoading(true)
      try {
        const recentData = await db.audits.findMany()
        setRecentAudits(recentData.slice(0, 50)) // Mostrar las 50 más recientes
      } catch (error) {
        console.error("Error al cargar auditorías recientes:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las auditorías recientes. Intente nuevamente.",
          variant: "destructive",
        })
      } finally {
        setIsRecentLoading(false)
      }
    }

    fetchRecentAudits()
  }, [activeTab, toast])

  // Cargar auditorías filtradas y items
  useEffect(() => {
    const fetchData = async () => {
      if (activeTab !== "date") return

      setIsLoading(true)
      try {
        // Obtener auditorías
        const auditData = await db.audits.findMany()

        // Filtrar por fecha y local si es necesario
        const filteredData = auditData.filter((audit) => {
          const auditDate = new Date(audit.date)
          const matchesDate =
            !selectedDate ||
            (auditDate.getFullYear() === selectedDate.getFullYear() &&
              auditDate.getMonth() === selectedDate.getMonth() &&
              auditDate.getDate() === selectedDate.getDate())

          const matchesLocal = !selectedLocal || selectedLocal === "todos" || audit.local === selectedLocal

          return matchesDate && matchesLocal
        })

        setAudits(filteredData)
      } catch (error) {
        console.error("Error al cargar datos de auditorías:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar las auditorías. Intente nuevamente.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [selectedDate, selectedLocal, activeTab, toast])

  // Cargar items de auditoría
  useEffect(() => {
    const fetchAuditItems = async () => {
      try {
        // Definir items de auditoría predeterminados si no hay API
        const defaultItems: AuditItem[] = [
          { id: "1", name: "Limpieza de pisos", category: "Limpieza", value: 5, completed: false },
          { id: "2", name: "Limpieza de baños", category: "Limpieza", value: 5, completed: false },
          { id: "3", name: "Limpieza de cocina", category: "Limpieza", value: 5, completed: false },
          { id: "4", name: "Limpieza de mesas", category: "Limpieza", value: 5, completed: false },
          { id: "5", name: "Limpieza de vitrinas", category: "Limpieza", value: 5, completed: false },
          { id: "6", name: "Orden en cocina", category: "Orden", value: 5, completed: false },
          { id: "7", name: "Orden en almacén", category: "Orden", value: 5, completed: false },
          { id: "8", name: "Orden en caja", category: "Orden", value: 5, completed: false },
          { id: "9", name: "Orden en salón", category: "Orden", value: 5, completed: false },
          { id: "10", name: "Orden en baños", category: "Orden", value: 5, completed: false },
          { id: "11", name: "Funcionamiento de equipos", category: "Operatividad", value: 5, completed: false },
          { id: "12", name: "Funcionamiento de caja", category: "Operatividad", value: 5, completed: false },
          { id: "13", name: "Funcionamiento de hornos", category: "Operatividad", value: 5, completed: false },
          { id: "14", name: "Funcionamiento de refrigeradores", category: "Operatividad", value: 5, completed: false },
          { id: "15", name: "Funcionamiento de iluminación", category: "Operatividad", value: 5, completed: false },
          { id: "16", name: "Temperatura de refrigeradores", category: "Temperaturas", value: 5, completed: false },
          { id: "17", name: "Temperatura de congeladores", category: "Temperaturas", value: 5, completed: false },
          {
            id: "18",
            name: "Temperatura de alimentos calientes",
            category: "Temperaturas",
            value: 5,
            completed: false,
          },
          { id: "19", name: "Temperatura de alimentos fríos", category: "Temperaturas", value: 5, completed: false },
          { id: "20", name: "Temperatura ambiente", category: "Temperaturas", value: 5, completed: false },
          { id: "21", name: "Procedimiento de apertura", category: "Procedimientos", value: 5, completed: false },
          { id: "22", name: "Procedimiento de cierre", category: "Procedimientos", value: 5, completed: false },
          { id: "23", name: "Procedimiento de preparación", category: "Procedimientos", value: 5, completed: false },
          { id: "24", name: "Procedimiento de servicio", category: "Procedimientos", value: 5, completed: false },
          { id: "25", name: "Procedimiento de limpieza", category: "Procedimientos", value: 5, completed: false },
          { id: "26", name: "Habilitación municipal", category: "Legales", value: 5, completed: false },
          { id: "27", name: "Habilitación sanitaria", category: "Legales", value: 5, completed: false },
          { id: "28", name: "Libreta sanitaria", category: "Legales", value: 5, completed: false },
          { id: "29", name: "Seguro de responsabilidad civil", category: "Legales", value: 5, completed: false },
          { id: "30", name: "Cumplimiento normativo", category: "Legales", value: 5, completed: false },
        ]

        setAuditItems(defaultItems)

        // Inicializar nueva auditoría con los items
        setNewAudit((prev) => ({
          ...prev,
          items: defaultItems.map((item) => ({ ...item, completed: false })),
        }))
      } catch (error) {
        console.error("Error al cargar items de auditoría:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los items de auditoría. Intente nuevamente.",
          variant: "destructive",
        })
      }
    }

    fetchAuditItems()
  }, [toast])

  const handleExportCSV = () => {
    // Preparar datos para exportar
    const dataToExport = activeTab === "recent" ? recentAudits : audits
    const data = dataToExport.map((audit) => ({
      Local: audit.local,
      Fecha: formatDate(audit.date),
      Turno: audit.shift === "morning" ? "Mañana" : audit.shift === "afternoon" ? "Tarde" : "Noche",
      Supervisor: audit.supervisorName,
      Encargado: audit.managerName,
      "Puntaje Total": audit.totalScore,
      "Puntaje Máximo": 150,
      Porcentaje: `${Math.round((audit.totalScore / 150) * 100)}%`,
    }))

    exportToCSV(
      data,
      `auditorias_${activeTab === "recent" ? "recientes" : selectedDate ? selectedDate.toISOString().split("T")[0] : "todas"}`,
    )
  }

  const handleItemChange = (id: string, completed: boolean) => {
    setNewAudit((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === id ? { ...item, completed } : item)),
      // Recalcular puntaje total
      totalScore: prev.items.reduce(
        (sum, item) => sum + (item.id === id ? (completed ? item.value : 0) : item.completed ? item.value : 0),
        0,
      ),
    }))
  }

  const handleSubmit = async () => {
    try {
      // Validar datos mínimos
      if (!newAudit.local || !newAudit.supervisorName) {
        toast({
          title: "Datos incompletos",
          description: "Por favor complete los campos obligatorios: Local y Supervisor.",
          variant: "destructive",
        })
        return
      }

      // Preparar datos para guardar
      const auditToSave = {
        ...newAudit,
        localId: newAudit.local.toLowerCase().replace(/\s+/g, "_"),
        localName: newAudit.local,
        auditor: newAudit.supervisorName,
        categories: [
          {
            id: "limpieza",
            name: "Limpieza y Orden",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Limpieza" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Limpieza")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
          {
            id: "orden",
            name: "Orden",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Orden" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Orden")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
          {
            id: "operatividad",
            name: "Operatividad",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Operatividad" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Operatividad")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
          {
            id: "temperaturas",
            name: "Temperaturas",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Temperaturas" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Temperaturas")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
          {
            id: "procedimientos",
            name: "Procedimientos",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Procedimientos" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Procedimientos")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
          {
            id: "legales",
            name: "Legales",
            maxScore: 25,
            score: newAudit.items
              .filter((item) => item.category === "Legales" && item.completed)
              .reduce((sum, item) => sum + item.value, 0),
            items: newAudit.items
              .filter((item) => item.category === "Legales")
              .map((item) => ({
                id: item.id,
                name: item.name,
                maxScore: item.value,
                score: item.completed ? item.value : 0,
                observations: "",
              })),
          },
        ],
        maxScore: 150,
        percentage: Math.round((newAudit.totalScore / 150) * 100),
      }

      // Crear nueva auditoría
      const createdAudit = await db.audits.create({
        data: auditToSave,
      })

      // Actualizar la lista de auditorías según la pestaña activa
      if (activeTab === "recent") {
        setRecentAudits((prev) => [createdAudit, ...prev])
      } else {
        setAudits((prev) => [...prev, createdAudit])
      }

      // Cerrar el diálogo
      setIsDialogOpen(false)

      // Mostrar mensaje de éxito
      toast({
        title: "Auditoría creada",
        description: "La auditoría ha sido registrada correctamente.",
      })

      // Resetear el formulario
      setNewAudit({
        localId: "",
        local: "BR Cabildo",
        date: new Date().toISOString().split("T")[0],
        shift: "morning",
        supervisorId: "",
        supervisorName: "",
        managerId: "",
        managerName: "",
        totalScore: 0,
        items: auditItems.map((item) => ({ ...item, completed: false })),
      })
    } catch (error) {
      console.error("Error al crear auditoría:", error)
      toast({
        title: "Error",
        description: "Error al registrar la auditoría. Por favor, intente nuevamente.",
        variant: "destructive",
      })
    }
  }

  const handleViewAuditDetails = async (audit: Audit) => {
    try {
      // Si la auditoría ya tiene los items detallados, usarla directamente
      if (audit.items && audit.items.length > 0) {
        setSelectedAudit(audit)
        setIsDetailsDialogOpen(true)
        return
      }

      // Si no, obtener los detalles de la auditoría
      const auditDetails = await db.audits.findUnique({
        where: { id: audit.id },
      })

      if (auditDetails) {
        setSelectedAudit(auditDetails)
        setIsDetailsDialogOpen(true)
      } else {
        toast({
          title: "Error",
          description: "No se pudieron cargar los detalles de la auditoría.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Error al obtener detalles de la auditoría:", error)
      toast({
        title: "Error",
        description: "Error al cargar los detalles de la auditoría.",
        variant: "destructive",
      })
    }
  }

  // Función para obtener el color de la barra de progreso según el puntaje
  const getProgressColor = (score: number) => {
    const percentage = (score / 150) * 100
    if (percentage >= 90) return "bg-green-500"
    if (percentage >= 70) return "bg-yellow-500"
    return "bg-red-500"
  }

  // Función para obtener el color del badge según el puntaje
  const getBadgeColor = (score: number) => {
    const percentage = (score / 150) * 100
    if (percentage >= 90) return "bg-green-500 hover:bg-green-600"
    if (percentage >= 70) return "bg-yellow-500 hover:bg-yellow-600"
    return "bg-red-500 hover:bg-red-600"
  }

  const columns: ColumnDef<Audit>[] = [
    {
      accessorKey: "local",
      header: "Local",
    },
    {
      accessorKey: "date",
      header: "Fecha",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      accessorKey: "shift",
      header: "Turno",
      cell: ({ row }) =>
        row.original.shift === "morning" ? "Mañana" : row.original.shift === "afternoon" ? "Tarde" : "Noche",
    },
    {
      accessorKey: "supervisorName",
      header: "Supervisor",
    },
    {
      accessorKey: "totalScore",
      header: "Puntaje",
      cell: ({ row }) => {
        const percentage = Math.round((row.original.totalScore / 150) * 100)
        return (
          <div className="flex items-center space-x-2">
            <Badge className={getBadgeColor(row.original.totalScore)}>{percentage}%</Badge>
            <Progress value={percentage} className={`w-24 ${getProgressColor(row.original.totalScore)}`} />
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              // Exportar auditoría
              generateAuditReport(row.original)
              toast({
                title: "Reporte generado",
                description: "El reporte de auditoría ha sido generado correctamente.",
              })
            }}
          >
            <FileText className="mr-1 h-4 w-4" />
            Exportar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleViewAuditDetails(row.original)}>
            <Eye className="mr-1 h-4 w-4" />
            Ver
          </Button>
        </div>
      ),
    },
  ]

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Auditorías</h2>
            <p className="text-muted-foreground">Gestiona las auditorías de los locales</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Nueva Auditoría (Rápida)
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl">
                <DialogHeader>
                  <DialogTitle>Nueva Auditoría</DialogTitle>
                  <DialogDescription>Completa el formulario para registrar una nueva auditoría</DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="local">Local</Label>
                      <Select
                        value={newAudit.local}
                        onValueChange={(value) => setNewAudit((prev) => ({ ...prev, local: value }))}
                      >
                        <SelectTrigger id="local">
                          <SelectValue placeholder="Seleccionar local" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BR Cabildo">BR Cabildo</SelectItem>
                          <SelectItem value="BR Carranza">BR Carranza</SelectItem>
                          <SelectItem value="BR Pacifico">BR Pacifico</SelectItem>
                          <SelectItem value="BR Lavalle">BR Lavalle</SelectItem>
                          <SelectItem value="BR Rivadavia">BR Rivadavia</SelectItem>
                          <SelectItem value="BR Aguero">BR Aguero</SelectItem>
                          <SelectItem value="BR Dorrego">BR Dorrego</SelectItem>
                          <SelectItem value="Dean & Dennys">Dean & Dennys</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">Fecha</Label>
                      <DatePicker
                        date={new Date(newAudit.date)}
                        setDate={(date) => setNewAudit((prev) => ({ ...prev, date: date.toISOString().split("T")[0] }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="shift">Turno</Label>
                      <Select
                        value={newAudit.shift}
                        onValueChange={(value) =>
                          setNewAudit((prev) => ({ ...prev, shift: value as "morning" | "afternoon" | "night" }))
                        }
                      >
                        <SelectTrigger id="shift">
                          <SelectValue placeholder="Seleccionar turno" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="morning">Mañana</SelectItem>
                          <SelectItem value="afternoon">Tarde</SelectItem>
                          <SelectItem value="night">Noche</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="supervisorName">Supervisor</Label>
                      <Input
                        id="supervisorName"
                        value={newAudit.supervisorName}
                        onChange={(e) => setNewAudit((prev) => ({ ...prev, supervisorName: e.target.value }))}
                        placeholder="Nombre del supervisor"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="managerName">Encargado</Label>
                      <Input
                        id="managerName"
                        value={newAudit.managerName}
                        onChange={(e) => setNewAudit((prev) => ({ ...prev, managerName: e.target.value }))}
                        placeholder="Nombre del encargado"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Items de Auditoría</Label>
                      <div className="text-sm">
                        Puntaje: <span className="font-medium">{newAudit.totalScore}/150</span>
                        <Progress
                          value={(newAudit.totalScore / 150) * 100}
                          className={`w-24 ml-2 inline-block ${getProgressColor(newAudit.totalScore)}`}
                        />
                      </div>
                    </div>

                    <Tabs defaultValue="limpieza">
                      <TabsList className="grid grid-cols-7 w-full">
                        <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
                        <TabsTrigger value="orden">Orden</TabsTrigger>
                        <TabsTrigger value="operatividad">Operatividad</TabsTrigger>
                        <TabsTrigger value="temperaturas">Temperaturas</TabsTrigger>
                        <TabsTrigger value="procedimientos">Procedimientos</TabsTrigger>
                        <TabsTrigger value="legales">Legales</TabsTrigger>
                        <TabsTrigger value="nomina">Nómina</TabsTrigger>
                      </TabsList>

                      {["limpieza", "orden", "operatividad", "temperaturas", "procedimientos", "legales", "nomina"].map(
                        (category) => (
                          <TabsContent key={category} value={category} className="border rounded-md p-4">
                            <div className="space-y-4">
                              {newAudit.items
                                .filter((item) => item.category.toLowerCase() === category)
                                .map((item) => (
                                  <div key={item.id} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                      <Checkbox
                                        id={`item-${item.id}`}
                                        checked={item.completed}
                                        onCheckedChange={(checked) => handleItemChange(item.id, checked === true)}
                                      />
                                      <Label htmlFor={`item-${item.id}`} className="text-sm">
                                        {item.name}
                                      </Label>
                                    </div>
                                    <div className="text-sm text-muted-foreground">{item.value} puntos</div>
                                  </div>
                                ))}
                            </div>
                          </TabsContent>
                        ),
                      )}
                    </Tabs>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" onClick={handleSubmit}>
                    Guardar Auditoría
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button asChild>
              <Link href="/auditorias/nueva">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Auditoría (Detallada)
              </Link>
            </Button>
          </div>
        </div>

        {/* Diálogo de detalles de auditoría */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Detalles de Auditoría</DialogTitle>
              <DialogDescription>
                {selectedAudit && (
                  <>
                    {selectedAudit.local} - {formatDate(selectedAudit.date)} -
                    {selectedAudit.shift === "morning"
                      ? " Turno Mañana"
                      : selectedAudit.shift === "afternoon"
                        ? " Turno Tarde"
                        : " Turno Noche"}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            {selectedAudit && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium">Información General</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Local:</span> {selectedAudit.local}
                      </p>
                      <p>
                        <span className="font-medium">Fecha:</span> {formatDate(selectedAudit.date)}
                      </p>
                      <p>
                        <span className="font-medium">Turno:</span>{" "}
                        {selectedAudit.shift === "morning"
                          ? "Mañana"
                          : selectedAudit.shift === "afternoon"
                            ? "Tarde"
                            : "Noche"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium">Responsables</h3>
                    <div className="mt-2 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">Supervisor:</span> {selectedAudit.supervisorName}
                      </p>
                      <p>
                        <span className="font-medium">Encargado:</span> {selectedAudit.managerName}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Puntaje</h3>
                    <div className="flex items-center space-x-2">
                      <Badge className={getBadgeColor(selectedAudit.totalScore)}>
                        {Math.round((selectedAudit.totalScore / 150) * 100)}%
                      </Badge>
                      <span className="text-sm">{selectedAudit.totalScore}/150 puntos</span>
                    </div>
                  </div>
                  <Progress
                    value={(selectedAudit.totalScore / 150) * 100}
                    className={`mt-2 ${getProgressColor(selectedAudit.totalScore)}`}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Items Evaluados</h3>
                  <Tabs defaultValue="limpieza">
                    <TabsList className="grid grid-cols-7 w-full">
                      <TabsTrigger value="limpieza">Limpieza</TabsTrigger>
                      <TabsTrigger value="orden">Orden</TabsTrigger>
                      <TabsTrigger value="operatividad">Operatividad</TabsTrigger>
                      <TabsTrigger value="temperaturas">Temperaturas</TabsTrigger>
                      <TabsTrigger value="procedimientos">Procedimientos</TabsTrigger>
                      <TabsTrigger value="legales">Legales</TabsTrigger>
                      <TabsTrigger value="nomina">Nómina</TabsTrigger>
                    </TabsList>

                    {["limpieza", "orden", "operatividad", "temperaturas", "procedimientos", "legales", "nomina"].map(
                      (category) => (
                        <TabsContent key={category} value={category} className="border rounded-md p-4">
                          <div className="space-y-4">
                            {selectedAudit.items
                              .filter((item) => item.category.toLowerCase() === category)
                              .map((item) => (
                                <div key={item.id} className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox id={`detail-item-${item.id}`} checked={item.completed} disabled />
                                    <Label htmlFor={`detail-item-${item.id}`} className="text-sm">
                                      {item.name}
                                    </Label>
                                  </div>
                                  <div className="text-sm text-muted-foreground">{item.value} puntos</div>
                                </div>
                              ))}
                          </div>
                        </TabsContent>
                      ),
                    )}
                  </Tabs>
                </div>

                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => {
                      generateAuditReport(selectedAudit)
                      toast({
                        title: "Reporte generado",
                        description: "El reporte de auditoría ha sido generado correctamente.",
                      })
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Exportar Reporte
                  </Button>
                  <Button onClick={() => setIsDetailsDialogOpen(false)}>Cerrar</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Historial de Auditorías</CardTitle>
            <CardDescription>Consulta y gestiona las auditorías realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="recent" onValueChange={setActiveTab} value={activeTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="recent">
                  <List className="mr-2 h-4 w-4" />
                  Auditorías Recientes
                </TabsTrigger>
                <TabsTrigger value="date">
                  <Calendar className="mr-2 h-4 w-4" />
                  Filtrar por Fecha
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recent">
                <div className="flex items-center mb-4 justify-end">
                  <Button variant="outline" onClick={handleExportCSV}>
                    <Download className="mr-2 h-4 w-4" />
                    Exportar CSV
                  </Button>
                </div>

                <DataTable
                  columns={columns}
                  data={recentAudits}
                  searchColumn="local"
                  searchPlaceholder="Buscar por local..."
                  isLoading={isRecentLoading}
                />
              </TabsContent>

              <TabsContent value="date">
                <div className="flex items-center mb-4 space-x-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <DatePicker date={selectedDate || new Date()} setDate={(date) => setSelectedDate(date)} />
                    <Button variant="outline" size="sm" onClick={() => setSelectedDate(undefined)}>
                      Todas las fechas
                    </Button>
                  </div>

                  <div className="flex-1 max-w-sm">
                    <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los locales" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos los locales</SelectItem>
                        <SelectItem value="BR Cabildo">BR Cabildo</SelectItem>
                        <SelectItem value="BR Carranza">BR Carranza</SelectItem>
                        <SelectItem value="BR Pacifico">BR Pacifico</SelectItem>
                        <SelectItem value="BR Lavalle">BR Lavalle</SelectItem>
                        <SelectItem value="BR Rivadavia">BR Rivadavia</SelectItem>
                        <SelectItem value="BR Aguero">BR Aguero</SelectItem>
                        <SelectItem value="BR Dorrego">BR Dorrego</SelectItem>
                        <SelectItem value="Dean & Dennys">Dean & Dennys</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="ml-auto flex items-center gap-2">
                    <Button variant="outline" onClick={handleExportCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      Exportar CSV
                    </Button>
                  </div>
                </div>

                <DataTable
                  columns={columns}
                  data={audits}
                  searchColumn="local"
                  searchPlaceholder="Buscar por local..."
                  isLoading={isLoading}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}





