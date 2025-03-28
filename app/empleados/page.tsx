"use client"

import { useState, useEffect } from "react"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { dbService } from "@/lib/db-service"
import { formatDate } from "@/lib/export-utils" // Corregido: importar desde export-utils en lugar de utils
import { StatusBadge } from "@/components/status-badge"
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination"
import { Plus, Search, Filter } from 'lucide-react'
import Link from "next/link"
import type { Employee } from "@/types"

// Función de respaldo por si formatDate no está disponible
const formatDateFallback = (dateString: string) => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-AR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (error) {
    console.error("Error al formatear fecha:", error);
    return dateString.split('T')[0] || dateString;
  }
};

export default function EmpleadosPage() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [localFilter, setLocalFilter] = useState("all")
  const [positionFilter, setPositionFilter] = useState("all")
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10
  
  // Obtener lista de locales y posiciones únicas para los filtros
  const [uniqueLocals, setUniqueLocals] = useState<string[]>([])
  const [uniquePositions, setUniquePositions] = useState<string[]>([])

  useEffect(() => {
    const loadEmployees = async () => {
      setIsLoading(true)
      try {
        const data = await dbService.getEmployees()
        setEmployees(data)
        
        // Extraer locales y posiciones únicas para los filtros
        const locals = Array.from(new Set(data.map(emp => emp.local)))
        const positions = Array.from(new Set(data.map(emp => emp.position)))
        
        setUniqueLocals(locals)
        setUniquePositions(positions)
        
        setIsLoading(false)
      } catch (error) {
        console.error("Error al cargar empleados:", error)
        setIsLoading(false)
      }
    }
    
    loadEmployees()
  }, [])

  // Aplicar filtros y búsqueda
  useEffect(() => {
    let result = [...employees]
    
    // Aplicar filtro de búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(emp => 
        emp.firstName.toLowerCase().includes(term) || 
        emp.lastName.toLowerCase().includes(term) || 
        emp.documentId.toLowerCase().includes(term)
      )
    }
    
    // Aplicar filtro de estado
    if (statusFilter !== "all") {
      result = result.filter(emp => emp.status === statusFilter)
    }
    
    // Aplicar filtro de local
    if (localFilter !== "all") {
      result = result.filter(emp => emp.local === localFilter)
    }
    
    // Aplicar filtro de posición
    if (positionFilter !== "all") {
      result = result.filter(emp => emp.position === positionFilter)
    }
    
    // Calcular total de páginas
    setTotalPages(Math.ceil(result.length / itemsPerPage))
    
    // Asegurarse de que la página actual es válida
    if (currentPage > Math.ceil(result.length / itemsPerPage)) {
      setCurrentPage(1)
    }
    
    setFilteredEmployees(result)
  }, [employees, searchTerm, statusFilter, localFilter, positionFilter])

  // Obtener empleados para la página actual
  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredEmployees.slice(startIndex, endIndex)
  }

  // Generar array de páginas para la paginación
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    
    if (totalPages <= maxVisiblePages) {
      // Mostrar todas las páginas si hay menos que el máximo visible
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Mostrar un subconjunto de páginas con la actual en el centro
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
      let endPage = startPage + maxVisiblePages - 1
      
      if (endPage > totalPages) {
        endPage = totalPages
        startPage = Math.max(1, endPage - maxVisiblePages + 1)
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i)
      }
    }
    
    return pages
  }

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Empleados</h2>
            <p className="text-muted-foreground">Gestiona la información de los empleados</p>
          </div>
          <Button asChild>
            <Link href="/empleados/nuevo">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Empleado
            </Link>
          </Button>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Lista de Empleados</CardTitle>
            <CardDescription>
              {filteredEmployees.length} empleados encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Buscador y Filtros */}
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Buscar por nombre o documento..."
                      className="pl-8"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                      <SelectItem value="on_leave">En Licencia</SelectItem>
                      <SelectItem value="vacation">Vacaciones</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={localFilter} onValueChange={setLocalFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Local" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los locales</SelectItem>
                      {uniqueLocals.map(local => (
                        <SelectItem key={local} value={local}>{local}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={positionFilter} onValueChange={setPositionFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue placeholder="Puesto" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los puestos</SelectItem>
                      {uniquePositions.map(position => (
                        <SelectItem key={position} value={position}>{position}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Tabla de Empleados */}
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Ingreso</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <div className="flex justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                          </div>
                          <div className="mt-2">Cargando empleados...</div>
                        </TableCell>
                      </TableRow>
                    ) : getCurrentPageItems().length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          No se encontraron empleados con los filtros aplicados
                        </TableCell>
                      </TableRow>
                    ) : (
                      getCurrentPageItems().map((employee) => (
                        <TableRow key={employee.id}>
                          <TableCell className="font-medium">
                            {employee.firstName} {employee.lastName}
                          </TableCell>
                          <TableCell>{employee.documentId}</TableCell>
                          <TableCell>{employee.local}</TableCell>
                          <TableCell>{employee.position}</TableCell>
                          <TableCell>
                            {/* Usar la función de respaldo si formatDate no está disponible */}
                            {formatDateFallback(employee.hireDate)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={employee.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end space-x-2">
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/empleados/${employee.id}`}>
                                  Ver
                                </Link>
                              </Button>
                              <Button variant="outline" size="sm" asChild>
                                <Link href={`/empleados/${employee.id}/editar`}>
                                  Editar
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              
              {/* Paginación */}
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                    
                    {getPageNumbers().map(page => (
                      <PaginationItem key={page}>
                        <PaginationLink
                          onClick={() => setCurrentPage(page)}
                          isActive={currentPage === page}
                          className="cursor-pointer"
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    ))}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
