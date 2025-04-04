"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Edit, Key, Loader2, RefreshCcw } from "lucide-react"
import { supabase } from "@/lib/supabase-client"

// Tipo para empleado
interface Employee {
  id: string
  name: string
  email: string
  role: string
  hasPin?: boolean
  pin?: string | null
  active?: boolean
  phone?: string
  position?: string
  branch?: string
}

// Tipo para supervisor
interface Supervisor {
  id: string
  name: string
  email: string
  role: string
  pin: string
}

export default function UsersPage() {
  const { toast } = useToast()
  const { supervisors, updateSupervisorPin } = useAuth()
  const [employees, setEmployees] = useState<Employee[]>([])
  const [managers, setManagers] = useState<Employee[]>([])
  const [adminUsers, setAdminUsers] = useState<Employee[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [selectedUser, setSelectedUser] = useState<Employee | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [editedUser, setEditedUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    phone: "",
    position: "",
    branch: "",
  })
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingPin, setUpdatingPin] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers()
  }, [supervisors])

  // Función para cargar usuarios reales de la base de datos
  const loadUsers = async () => {
    setLoading(true)
    try {
      // Cargar empleados activos de la tabla employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .eq("active", true)
        .eq("role", "empleado")
        .order("name", { ascending: true })

      if (employeesError) throw employeesError

      // Procesar los datos de empleados
      const processedEmployees =
        employeesData?.map((emp) => ({
          id: emp.id.toString(),
          name: emp.name || emp.full_name || "Sin nombre",
          email: emp.email || "",
          role: emp.role || "empleado",
          phone: emp.phone || emp.telephone || "",
          position: emp.position || emp.job_title || "",
          branch: emp.branch || emp.location || "",
          active: emp.active,
          hasPin: false,
          pin: null,
        })) || []

      // Cargar encargados activos
      const { data: managersData, error: managersError } = await supabase
        .from("employees")
        .select("*")
        .eq("active", true)
        .eq("role", "encargado")
        .order("name", { ascending: true })

      if (managersError) throw managersError

      // Procesar los datos de encargados
      const processedManagers =
        managersData?.map((mgr) => ({
          id: mgr.id.toString(),
          name: mgr.name || mgr.full_name || "Sin nombre",
          email: mgr.email || "",
          role: mgr.role || "encargado",
          phone: mgr.phone || mgr.telephone || "",
          position: mgr.position || mgr.job_title || "",
          branch: mgr.branch || mgr.location || "",
          active: mgr.active,
          hasPin: false,
          pin: null,
        })) || []

      // Cargar administradores
      const { data: adminsData, error: adminsError } = await supabase
        .from("users")
        .select("*")
        .eq("active", true)
        .eq("role", "admin")
        .order("name", { ascending: true })

      if (adminsError) throw adminsError

      // Procesar los datos de administradores
      const processedAdmins =
        adminsData?.map((admin) => ({
          id: admin.id.toString(),
          name: admin.name || admin.full_name || admin.email.split("@")[0],
          email: admin.email,
          role: admin.role || "admin",
          phone: admin.phone || admin.telephone || "",
          position: admin.position || admin.job_title || "",
          branch: admin.branch || admin.location || "",
          active: admin.active,
          hasPin: false,
          pin: null,
        })) || []

      // Marcar los usuarios que son supervisores y tienen PIN
      const markPinStatus = (users: Employee[]) => {
        return users.map((user) => {
          const supervisor = supervisors.find((s) => s.id === user.id)
          if (supervisor) {
            return {
              ...user,
              hasPin: true,
              pin: supervisor.pin,
            }
          }
          return user
        })
      }

      // Actualizar el estado con los datos obtenidos
      setEmployees(markPinStatus(processedEmployees))
      setManagers(markPinStatus(processedManagers))
      setAdminUsers(markPinStatus(processedAdmins))

      // Calcular el total de páginas para la pestaña actual
      calculateTotalPages(activeTab, processedEmployees, processedManagers, supervisors, processedAdmins)
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios. Usando datos de ejemplo temporalmente.",
        variant: "destructive",
      })

      // Usar datos de ejemplo como fallback
      setEmployees([
        {
          id: "emp-1",
          name: "Juan Pérez",
          email: "juan@quadrifoglio.com",
          role: "empleado",
          phone: "1155667788",
          position: "Cajero",
          branch: "Cabildo",
        },
        {
          id: "emp-2",
          name: "María López",
          email: "maria@quadrifoglio.com",
          role: "empleado",
          phone: "1155667789",
          position: "Atención al cliente",
          branch: "Carranza",
        },
        {
          id: "emp-3",
          name: "Carlos Rodríguez",
          email: "carlos@quadrifoglio.com",
          role: "empleado",
          phone: "1155667790",
          position: "Cocinero",
          branch: "Pacífico",
        },
      ])

      setManagers([
        {
          id: "enc-1",
          name: "Roberto Fernández",
          email: "roberto@quadrifoglio.com",
          role: "encargado",
          phone: "1155667791",
          position: "Encargado de turno",
          branch: "Cabildo",
        },
        {
          id: "enc-2",
          name: "Sofía Díaz",
          email: "sofia@quadrifoglio.com",
          role: "encargado",
          phone: "1155667792",
          position: "Encargado de turno",
          branch: "Carranza",
        },
      ])

      setAdminUsers([
        {
          id: "admin-1",
          name: "Javier Acosta",
          email: "javier@quadrifoglio.com",
          role: "admin",
          phone: "1155667793",
          position: "Administrador",
          branch: "Central",
        },
      ])

      // Calcular páginas con datos de ejemplo
      setTotalPages(1)
    } finally {
      setLoading(false)
    }
  }

  // Calcular el total de páginas según la pestaña activa
  const calculateTotalPages = (
    tab: string,
    empData: Employee[],
    mgrData: Employee[],
    supData: Supervisor[],
    admData: Employee[],
  ) => {
    let count = 0

    if (tab === "all") {
      count = empData.length + mgrData.length + supData.length + admData.length
    } else if (tab === "employees") {
      count = empData.length
    } else if (tab === "managers") {
      count = mgrData.length
    } else if (tab === "supervisors") {
      count = supData.length
    } else if (tab === "admins") {
      count = admData.length
    }

    setTotalPages(Math.max(1, Math.ceil(count / itemsPerPage)))
  }

  // Actualizar total de páginas cuando cambia la pestaña
  useEffect(() => {
    calculateTotalPages(activeTab, employees, managers, supervisors, adminUsers)
    setCurrentPage(1) // Resetear a la primera página al cambiar de pestaña
  }, [activeTab, employees, managers, supervisors, adminUsers])

  // Función para refrescar la lista de usuarios
  const refreshUsers = async () => {
    setRefreshing(true)
    try {
      await loadUsers()
      toast({
        title: "Lista actualizada",
        description: "La lista de usuarios ha sido actualizada correctamente.",
      })
    } catch (error) {
      console.error("Error al refrescar usuarios:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la lista de usuarios.",
        variant: "destructive",
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Función para editar un usuario (solo para información básica, no para activar/desactivar)
  const handleEditUser = async () => {
    if (!editedUser.name || !editedUser.email) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    try {
      // Intentar actualizar en la base de datos
      const { error } = await supabase
        .from("employees")
        .update({
          name: editedUser.name,
          email: editedUser.email,
          phone: editedUser.phone,
          position: editedUser.position,
          branch: editedUser.branch,
        })
        .eq("id", editedUser.id)

      if (error) throw error

      // Actualizar localmente según el rol
      if (editedUser.role === "empleado") {
        setEmployees(
          employees.map((emp) =>
            emp.id === editedUser.id
              ? {
                  ...emp,
                  name: editedUser.name,
                  email: editedUser.email,
                  phone: editedUser.phone,
                  position: editedUser.position,
                  branch: editedUser.branch,
                }
              : emp,
          ),
        )
      } else if (editedUser.role === "encargado") {
        setManagers(
          managers.map((mgr) =>
            mgr.id === editedUser.id
              ? {
                  ...mgr,
                  name: editedUser.name,
                  email: editedUser.email,
                  phone: editedUser.phone,
                  position: editedUser.position,
                  branch: editedUser.branch,
                }
              : mgr,
          ),
        )
      } else if (editedUser.role === "admin") {
        setAdminUsers(
          adminUsers.map((adm) =>
            adm.id === editedUser.id
              ? {
                  ...adm,
                  name: editedUser.name,
                  email: editedUser.email,
                  phone: editedUser.phone,
                  position: editedUser.position,
                  branch: editedUser.branch,
                }
              : adm,
          ),
        )
      }

      setShowEditDialog(false)
      toast({
        title: "Usuario actualizado",
        description: "La información del usuario ha sido actualizada correctamente.",
      })
    } catch (error) {
      console.error("Error al actualizar usuario:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la información del usuario.",
        variant: "destructive",
      })
    }
  }

  // Función para actualizar el PIN de un supervisor
  const handleUpdatePin = async () => {
    if (!newPin) {
      setPinError("El PIN no puede estar vacío")
      return
    }

    if (newPin !== confirmPin) {
      setPinError("Los PINs no coinciden")
      return
    }

    if (!/^\d{4}$/.test(newPin)) {
      setPinError("El PIN debe ser un número de 4 dígitos")
      return
    }

    try {
      setUpdatingPin(true)

      // Actualizar el PIN en la base de datos a través del contexto de autenticación
      const success = await updateSupervisorPin(selectedUser!.id, newPin)

      if (success) {
        // Actualizar el usuario en el estado local según su rol
        if (selectedUser?.role === "supervisor" || selectedUser?.role === "gerente") {
          // No necesitamos actualizar el estado local de supervisores ya que viene del contexto
          toast({
            title: "PIN actualizado",
            description: `El PIN de ${selectedUser!.name} ha sido actualizado correctamente.`,
          })
        }

        setShowPinDialog(false)
        setNewPin("")
        setConfirmPin("")
        setShowPin(false)
        setPinError("")
      } else {
        setPinError("Error al actualizar el PIN en la base de datos. Intente nuevamente.")
      }
    } catch (error) {
      console.error("Error al actualizar PIN:", error)
      setPinError("Error al actualizar el PIN. Intente nuevamente.")
    } finally {
      setUpdatingPin(false)
    }
  }

  // Obtener usuarios filtrados según la pestaña activa
  const getFilteredUsers = () => {
    let filteredUsers: Employee[] = []

    if (activeTab === "all") {
      filteredUsers = [...employees, ...managers, ...supervisors, ...adminUsers]
    } else if (activeTab === "employees") {
      filteredUsers = employees
    } else if (activeTab === "managers") {
      filteredUsers = managers
    } else if (activeTab === "supervisors") {
      filteredUsers = supervisors
    } else if (activeTab === "admins") {
      filteredUsers = adminUsers
    }

    // Aplicar paginación
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage

    return filteredUsers.slice(startIndex, endIndex)
  }

  // Obtener el color de la insignia según el rol
  const getRoleBadgeColor = (role) => {
    switch (role) {
      case "admin":
        return "destructive"
      case "gerente":
        return "destructive"
      case "supervisor":
        return "warning"
      case "encargado":
        return "secondary"
      case "empleado":
        return "outline"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        </div>
        <Card>
          <CardContent className="py-10">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
              <p>Cargando usuarios...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredUsers = getFilteredUsers()

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshUsers} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Actualizar
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="employees">Empleados</TabsTrigger>
          <TabsTrigger value="managers">Encargados</TabsTrigger>
          <TabsTrigger value="supervisors">Supervisores</TabsTrigger>
          <TabsTrigger value="admins">Administradores</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Usuarios {activeTab !== "all" ? `(${activeTab})` : ""}</CardTitle>
              <CardDescription>Usuarios activos del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  No hay usuarios activos que coincidan con los filtros
                </p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Rol</TableHead>
                        <TableHead>Sucursal</TableHead>
                        <TableHead>PIN de Supervisor</TableHead>
                        <TableHead>Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleBadgeColor(user.role)}>
                              {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>{user.branch || "N/A"}</TableCell>
                          <TableCell>
                            {user.role === "supervisor" || user.role === "gerente" ? (
                              user.hasPin ? (
                                <Badge variant="outline" className="bg-green-50">
                                  Configurado
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50">
                                  No configurado
                                </Badge>
                              )
                            ) : (
                              <span className="text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user)
                                  setEditedUser({
                                    id: user.id,
                                    name: user.name,
                                    email: user.email,
                                    role: user.role,
                                    phone: user.phone || "",
                                    position: user.position || "",
                                    branch: user.branch || "",
                                  })
                                  setShowEditDialog(true)
                                }}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Editar
                              </Button>
                              {(user.role === "supervisor" || user.role === "gerente") && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUser(user)
                                    setNewPin(user.pin || "")
                                    setConfirmPin(user.pin || "")
                                    setShowPinDialog(true)
                                  }}
                                >
                                  <Key className="h-4 w-4 mr-1" />
                                  {user.hasPin ? "Cambiar PIN" : "Asignar PIN"}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Pagination>
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                              className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                            />
                          </PaginationItem>

                          {/* Primera página */}
                          {currentPage > 2 && (
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(1)}>1</PaginationLink>
                            </PaginationItem>
                          )}

                          {/* Elipsis si hay muchas páginas */}
                          {currentPage > 3 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}

                          {/* Página anterior si no es la primera */}
                          {currentPage > 1 && (
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(currentPage - 1)}>
                                {currentPage - 1}
                              </PaginationLink>
                            </PaginationItem>
                          )}

                          {/* Página actual */}
                          <PaginationItem>
                            <PaginationLink isActive>{currentPage}</PaginationLink>
                          </PaginationItem>

                          {/* Página siguiente si no es la última */}
                          {currentPage < totalPages && (
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(currentPage + 1)}>
                                {currentPage + 1}
                              </PaginationLink>
                            </PaginationItem>
                          )}

                          {/* Elipsis si hay muchas páginas */}
                          {currentPage < totalPages - 2 && (
                            <PaginationItem>
                              <PaginationEllipsis />
                            </PaginationItem>
                          )}

                          {/* Última página */}
                          {currentPage < totalPages - 1 && (
                            <PaginationItem>
                              <PaginationLink onClick={() => setCurrentPage(totalPages)}>{totalPages}</PaginationLink>
                            </PaginationItem>
                          )}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                              className={
                                currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Diálogo para editar usuario */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>Modifica los datos básicos del usuario</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={editedUser.email}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                value={editedUser.phone}
                onChange={(e) => setEditedUser({ ...editedUser, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Cargo</Label>
              <Input
                id="position"
                value={editedUser.position}
                onChange={(e) => setEditedUser({ ...editedUser, position: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="branch">Sucursal</Label>
              <Input
                id="branch"
                value={editedUser.branch}
                onChange={(e) => setEditedUser({ ...editedUser, branch: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol</Label>
              <Input
                id="role"
                value={editedUser.role.charAt(0).toUpperCase() + editedUser.role.slice(1)}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">El rol no puede ser modificado desde esta interfaz.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditUser}>Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para gestionar PIN de supervisor */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.hasPin ? "Cambiar PIN de Supervisor" : "Asignar PIN de Supervisor"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.hasPin
                ? `Actualiza el PIN de acceso para ${selectedUser?.name}`
                : `Asigna un nuevo PIN de acceso para ${selectedUser?.name}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN (4 dígitos)</Label>
              <div className="relative">
                <Input
                  id="pin"
                  type={showPin ? "text" : "password"}
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(e.target.value)
                    setPinError("")
                  }}
                  maxLength={4}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  placeholder="Ingrese un PIN de 4 dígitos"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirmar PIN</Label>
              <Input
                id="confirm-pin"
                type={showPin ? "text" : "password"}
                value={confirmPin}
                onChange={(e) => {
                  setConfirmPin(e.target.value)
                  setPinError("")
                }}
                maxLength={4}
                pattern="[0-9]*"
                inputMode="numeric"
                placeholder="Confirme el PIN"
              />
            </div>
            {pinError && <p className="text-sm text-destructive">{pinError}</p>}
            <p className="text-sm text-muted-foreground">
              El PIN debe ser un número de 4 dígitos y será utilizado para validar operaciones que requieren
              autorización de supervisor.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPinDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdatePin} disabled={updatingPin}>
              {updatingPin ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar PIN"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}





