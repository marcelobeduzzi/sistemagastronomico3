"use client"

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  MoreHorizontal,
  Plus,
  Settings,
  FileText,
  Clock,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
} from "lucide-react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"
import { deleteAuditoria, getAuditorias } from "@/lib/api/auditorias/queries"
import type { Auditoria } from "@/lib/db/schema"
import { Skeleton } from "@/components/ui/skeleton"
import { useUser } from "@clerk/nextjs"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Progress } from "@/components/ui/progress"

interface DataTableProps {
  columns: ColumnDef<Auditoria>[]
  data: Auditoria[]
}

// Función para renderizar el badge de tipo
const renderTypeBadge = (type: string) => {
  // Verificar el tipo de auditoría correctamente
  if (type === "rapida") {
    return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Rápida</Badge>
  } else {
    return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Detallada</Badge>
  }
}

// Función para renderizar el badge de estado
const renderStatusBadge = (status: string) => {
  switch (status) {
    case "completed":
      return <Badge className="bg-green-100 text-green-800 border-green-300">Completada</Badge>
    case "in_progress":
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">En Progreso</Badge>
    case "pending":
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Pendiente</Badge>
    case "failed":
      return <Badge className="bg-red-100 text-red-800 border-red-300">Fallida</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">{status}</Badge>
  }
}

// Función para calcular el porcentaje de cumplimiento
const calculateCompliancePercentage = (auditoria: Auditoria) => {
  if (!auditoria.items || auditoria.items.length === 0) return 0

  const totalItems = auditoria.items.length
  const compliantItems = auditoria.items.filter((item) => item.status === "compliant").length

  return Math.round((compliantItems / totalItems) * 100)
}

function DataTable<TData, TValue>({ columns, data }: DataTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  return (
    <div className="w-full">
      <div className="flex items-center py-4">
        <Input
          placeholder="Filtrar auditorías..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columnas <MoreHorizontal className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(value)}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <th key={header.id} className="px-4 py-2">
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} data-state={row.getIsSelected() && "selected"}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="h-24 text-center font-medium">
                  No hay resultados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between space-x-2 py-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} de {table.getCoreRowModel().rows.length} fila(s)
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Siguiente
          </Button>
        </div>
      </div>
    </div>
  )
}

const columns: ColumnDef<Auditoria>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Nombre",
  },
  {
    accessorKey: "description",
    header: "Descripción",
  },
  {
    accessorKey: "type",
    header: "Tipo",
    cell: ({ row }) => {
      // Corregido: Usar el valor real del tipo para determinar qué mostrar
      return renderTypeBadge(row.original.type || "detallada")
    },
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) => {
      return renderStatusBadge(row.original.status || "pending")
    },
  },
  {
    accessorKey: "date",
    header: "Fecha",
    cell: ({ row }) => {
      const date = row.original.date
      if (!date) return "No especificada"
      try {
        return format(new Date(date), "dd/MM/yyyy", { locale: es })
      } catch (error) {
        return date
      }
    },
  },
  {
    accessorKey: "shift",
    header: "Turno",
    cell: ({ row }) => {
      // Corregido: Procesar correctamente el valor del turno
      const shift = row.original.shift?.toLowerCase() || ""
      if (shift === "morning") return "Mañana"
      if (shift === "afternoon") return "Tarde"
      if (shift === "night") return "Noche"
      return row.original.shift || "No especificado"
    },
  },
  {
    accessorKey: "local",
    header: "Local",
  },
  {
    accessorKey: "compliance",
    header: "Cumplimiento",
    cell: ({ row }) => {
      const percentage = calculateCompliancePercentage(row.original)
      return (
        <div className="w-full">
          <div className="flex justify-between mb-1">
            <span className="text-xs font-medium">{percentage}%</span>
          </div>
          <Progress value={percentage} className="h-2" />
        </div>
      )
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      const auditoria = row.original
      const router = useRouter()
      const { toast } = useToast()

      return (
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => router.push(`/auditorias/${auditoria.id}/view`)}>
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => router.push(`/auditorias/${auditoria.id}`)}>
            <Edit className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. ¿Quieres borrar la auditoría "{auditoria.name}"?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    try {
                      await deleteAuditoria(auditoria.id)
                      router.refresh()
                      toast({
                        title: "Éxito",
                        description: "Auditoría borrada.",
                      })
                    } catch (error: any) {
                      toast({
                        title: "Error",
                        description: error.message,
                        variant: "destructive",
                      })
                    }
                  }}
                >
                  Borrar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )
    },
  },
]

function AuditoriasStats({ auditorias }: { auditorias: Auditoria[] }) {
  // Estadísticas generales
  const totalAuditorias = auditorias.length
  const completedAuditorias = auditorias.filter((a) => a.status === "completed").length
  const inProgressAuditorias = auditorias.filter((a) => a.status === "in_progress").length
  const pendingAuditorias = auditorias.filter((a) => a.status === "pending").length

  // Calcular cumplimiento promedio
  let averageCompliance = 0
  if (totalAuditorias > 0) {
    const totalCompliance = auditorias.reduce((acc, auditoria) => {
      return acc + calculateCompliancePercentage(auditoria)
    }, 0)
    averageCompliance = Math.round(totalCompliance / totalAuditorias)
  }

  // Auditorías por tipo
  const rapidaAuditorias = auditorias.filter((a) => a.type === "rapida").length
  const detalladaAuditorias = auditorias.filter((a) => a.type !== "rapida").length

  // Auditorías por local
  const auditoriasPerLocal: Record<string, number> = {}
  auditorias.forEach((auditoria) => {
    const local = auditoria.local || "No especificado"
    auditoriasPerLocal[local] = (auditoriasPerLocal[local] || 0) + 1
  })

  // Ordenar locales por cantidad de auditorías
  const sortedLocals = Object.entries(auditoriasPerLocal)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Auditorías</CardTitle>
          <FileText className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAuditorias}</div>
          <p className="text-xs text-muted-foreground">
            {rapidaAuditorias} rápidas, {detalladaAuditorias} detalladas
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cumplimiento Promedio</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{averageCompliance}%</div>
          <Progress value={averageCompliance} className="h-2" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Estado</CardTitle>
          <AlertCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Badge className="bg-green-100 text-green-800 border-green-300">{completedAuditorias}</Badge>
            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">{inProgressAuditorias}</Badge>
            <Badge className="bg-gray-100 text-gray-800 border-gray-300">{pendingAuditorias}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Completadas, En Progreso, Pendientes</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Top Locales</CardTitle>
          <Building className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {sortedLocals.map(([local, count]) => (
              <div key={local} className="flex items-center justify-between text-xs">
                <span className="truncate">{local}</span>
                <span>{count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RecentAuditorias({ auditorias }: { auditorias: Auditoria[] }) {
  const router = useRouter()

  // Ordenar auditorías por fecha (más recientes primero)
  const sortedAuditorias = [...auditorias]
    .sort((a, b) => {
      const dateA = a.date ? new Date(a.date).getTime() : 0
      const dateB = b.date ? new Date(b.date).getTime() : 0
      return dateB - dateA
    })
    .slice(0, 5) // Mostrar solo las 5 más recientes

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auditorías Recientes</CardTitle>
        <CardDescription>Las últimas 5 auditorías realizadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sortedAuditorias.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay auditorías recientes</p>
          ) : (
            sortedAuditorias.map((auditoria) => (
              <div key={auditoria.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div>
                    <p className="text-sm font-medium">{auditoria.name}</p>
                    <div className="flex items-center space-x-2">
                      <p className="text-xs text-muted-foreground">
                        {auditoria.date ? format(new Date(auditoria.date), "dd/MM/yyyy", { locale: es }) : "Sin fecha"}
                      </p>
                      <p className="text-xs text-muted-foreground">•</p>
                      <p className="text-xs text-muted-foreground">{auditoria.local || "Sin local"}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {renderStatusBadge(auditoria.status || "pending")}
                  <Button variant="ghost" size="icon" onClick={() => router.push(`/auditorias/${auditoria.id}/view`)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" asChild>
          <Link href="/auditorias/historial">Ver todas las auditorías</Link>
        </Button>
      </CardFooter>
    </Card>
  )
}

function AuditoriasFilters({
  auditorias,
  setFilteredAuditorias,
}: {
  auditorias: Auditoria[]
  setFilteredAuditorias: (auditorias: Auditoria[]) => void
}) {
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [localFilter, setLocalFilter] = useState<string>("all")

  // Extraer todos los locales únicos
  const uniqueLocals = Array.from(new Set(auditorias.map((a) => a.local).filter(Boolean)))

  // Aplicar filtros
  useEffect(() => {
    let filtered = [...auditorias]

    if (statusFilter !== "all") {
      filtered = filtered.filter((a) => a.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((a) => a.type === typeFilter)
    }

    if (localFilter !== "all") {
      filtered = filtered.filter((a) => a.local === localFilter)
    }

    setFilteredAuditorias(filtered)
  }, [statusFilter, typeFilter, localFilter, auditorias, setFilteredAuditorias])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="mr-2 h-4 w-4" />
          Filtros
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium">Estado</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="completed">Completada</SelectItem>
                <SelectItem value="in_progress">En Progreso</SelectItem>
                <SelectItem value="pending">Pendiente</SelectItem>
                <SelectItem value="failed">Fallida</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Tipo</label>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="rapida">Rápida</SelectItem>
                <SelectItem value="detallada">Detallada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium">Local</label>
            <Select value={localFilter} onValueChange={setLocalFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Todos los locales" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los locales</SelectItem>
                {uniqueLocals.map((local) => (
                  <SelectItem key={local} value={local || ""}>
                    {local}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function AuditoriasPage() {
  const [auditorias, setAuditorias] = useState<Auditoria[]>([])
  const [filteredAuditorias, setFilteredAuditorias] = useState<Auditoria[]>([])
  const [activeTab, setActiveTab] = useState<string>("dashboard")
  const { toast } = useToast()
  const { isLoaded, isSignedIn, user } = useUser()

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const fetchAuditorias = async () => {
      try {
        const auditorias = await getAuditorias(user.id)
        // Asegurarse de que los campos type y shift estén correctamente definidos
        const processedData = auditorias.map((audit) => ({
          ...audit,
          type: audit.type || "detallada", // Valor por defecto si es null
          shift: audit.shift || "morning", // Valor por defecto si es null
        }))
        setAuditorias(processedData)
        setFilteredAuditorias(processedData)
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      }
    }

    fetchAuditorias()
  }, [isLoaded, isSignedIn, user, toast])

  if (!isLoaded)
    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold">
          <Skeleton className="h-8 w-[300px]" />
        </h1>
        <p className="text-muted-foreground">
          <Skeleton className="h-4 w-[500px]" />
        </p>
        <div className="mt-4">
          <Skeleton className="h-10 w-[200px]" />
        </div>
        <div className="mt-8">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full mt-2" />
          <Skeleton className="h-10 w-full mt-2" />
        </div>
      </div>
    )

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between">
        <div>
          <h1 className="text-3xl font-bold">Auditorías</h1>
          <p className="text-muted-foreground">Gestiona las auditorías de tu organización.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/auditorias/configuracion">
              <Settings className="mr-2 h-4 w-4" />
              Configuración
            </Link>
          </Button>
          {/* Botón de auditoría rápida temporalmente oculto
          <Button asChild>
            <Link href="/auditorias/nueva-rapida">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Auditoría Rápida
            </Link>
          </Button>
          */}
          <Button asChild>
            <Link href="/auditorias/nueva">
              <Plus className="mr-2 h-4 w-4" />
              Nueva Auditoría Detallada
            </Link>
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="list">Lista de Auditorías</TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-4 mt-6">
          <AuditoriasStats auditorias={auditorias} />
          <div className="grid gap-4 md:grid-cols-2">
            <RecentAuditorias auditorias={auditorias} />
            <Card>
              <CardHeader>
                <CardTitle>Acciones Rápidas</CardTitle>
                <CardDescription>Acciones comunes para gestionar auditorías</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full" asChild>
                  <Link href="/auditorias/nueva">
                    <Plus className="mr-2 h-4 w-4" />
                    Nueva Auditoría
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auditorias/historial">
                    <Clock className="mr-2 h-4 w-4" />
                    Ver Historial
                  </Link>
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/auditorias/reportes">
                    <Download className="mr-2 h-4 w-4" />
                    Generar Reportes
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4 mt-6">
          <AuditoriasFilters auditorias={auditorias} setFilteredAuditorias={setFilteredAuditorias} />
          <DataTable columns={columns} data={filteredAuditorias} />
        </TabsContent>
      </Tabs>
    </div>
  )
}









