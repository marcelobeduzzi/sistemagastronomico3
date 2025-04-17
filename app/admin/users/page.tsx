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
import { useToast } from "@/components/ui/use-toast"
import { Eye, EyeOff, Edit, Key, Loader2, RefreshCcw, UserPlus } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import DashboardLayout from "@/app/dashboard-layout"

// Tipo para usuario
interface User {
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

export default function UsersPage() {
  const { toast } = useToast()
  const { user: currentUser, refreshSession } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [activeTab, setActiveTab] = useState("all")
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [editedUser, setEditedUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
    phone: "",
    position: "",
    branch: "",
  })
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "encargado",
  })
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState("")
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [updatingPin, setUpdatingPin] = useState(false)
  const [creatingUser, setCreatingUser] = useState(false)

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const itemsPerPage = 10

  const supabase = createClientComponentClient()

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers()
  }, [])

  // Función para cargar usuarios de Supabase Auth
  const loadUsers = async () => {
    setLoading(true)
    try {
      // Obtener todos los usuarios de Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers()

      if (authError) {
        throw authError
      }

      if (authData?.users) {
        // Procesar los usuarios
        const processedUsers = authData.users.map((user) => ({
          id: user.id,
          name: user.user_metadata?.name || user.email.split("@")[0],
          email: user.email,
          role: user.role || "encargado", // Rol por defecto si no tiene
          phone: user.user_metadata?.phone || "",
          position: user.user_metadata?.position || "",
          branch: user.user_metadata?.branch || "",
          active: !user.banned_until,
          hasPin: !!user.user_metadata?.pin,
          pin: user.user_metadata?.pin || null,
        }))

        setUsers(processedUsers)
        calculateTotalPages(activeTab, processedUsers)

        // Mostrar mensaje de éxito
        toast({
          title: "Datos cargados correctamente",
          description: `Se han cargado ${processedUsers.length} usuarios del sistema.`,
          variant: "success",
        })
      }
    } catch (error) {
      console.error("Error al cargar usuarios:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar los usuarios. Usando datos de ejemplo temporalmente.",
        variant: "destructive",
      })

      // Usar datos de ejemplo como fallback
      const exampleUsers = [
        {
          id: "emp-1",
          name: "Juan Pérez",
          email: "juan@quadrifoglio.com",
          role: "empleado",
          phone: "1155667788",
          position: "Cajero",
          branch: "Cabildo",
          active: true,
          hasPin: false,
          pin: null,
        },
        {
          id: "enc-1",
          name: "Roberto Fernández",
          email: "roberto@quadrifoglio.com",
          role: "encargado",
          phone: "1155667791",
          position: "Encargado de turno",
          branch: "Cabildo",
          active: true,
          hasPin: false,
          pin: null,
        },
        {
          id: "sup-1",
          name: "Ana Gómez",
          email: "ana@quadrifoglio.com",
          role: "supervisor",
          phone: "1155667795",
          position: "Supervisor",
          branch: "Central",
          active: true,
          hasPin: true,
          pin: "1234",
        },
        {
          id: "admin-1",
          name: "Javier Acosta",
          email: "javier@quadrifoglio.com",
          role: "admin",
          phone: "1155667793",
          position: "Administrador",
          branch: "Central",
          active: true,
          hasPin: false,
          pin: null,
        },
      ]

      setUsers(exampleUsers)
      calculateTotalPages(activeTab, exampleUsers)
    } finally {
      setLoading(false)
    }
  }

  // Calcular el total de páginas según la pestaña activa
  const calculateTotalPages = (tab: string, userData: User[]) => {
    let filteredUsers = userData

    if (tab !== "all") {
      filteredUsers = userData.filter((user) => user.role === tab.slice(0, -1)) // Quitar la 's' del final
    }

    setTotalPages(Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage)))
  }

  // Actualizar total de páginas cuando cambia la pestaña
  useEffect(() => {
    calculateTotalPages(activeTab, users)
    setCurrentPage(1) // Resetear a la primera página al cambiar de pestaña
  }, [activeTab, users])

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

  // Función para editar un usuario
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
      // Actualizar el usuario en Supabase Auth
      const { error } = await supabase.auth.admin.updateUserById(editedUser.id, {
        user_metadata: {
          name: editedUser.name,
          phone: editedUser.phone,
          position: editedUser.position,
          branch: editedUser.branch,
        },
        email: editedUser.email,
      })

      if (error) throw error

      // Actualizar el usuario en el estado local
      setUsers(
        users.map((u) =>
          u.id === editedUser.id
            ? {
                ...u,
                name: editedUser.name,
                email: editedUser.email,
                phone: editedUser.phone,
                position: editedUser.position,
                branch: editedUser.branch,
              }
            : u,
        ),
      )

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

      // Actualizar el PIN en los metadatos del usuario
      const { error } = await supabase.auth.admin.updateUserById(selectedUser!.id, {
        user_metadata: {
          ...selectedUser?.user_metadata,
          pin: newPin,
        },
      })

      if (error) throw error

      // Actualizar el usuario en el estado local
      setUsers(
        users.map((u) =>
          u.id === selectedUser!.id
            ? {
                ...u,
                hasPin: true,
                pin: newPin,
              }
            : u,
        ),
      )

      toast({
        title: "PIN actualizado",
        description: `El PIN de ${selectedUser!.name} ha sido actualizado correctamente.`,
      })

      setShowPinDialog(false)
      setNewPin("")
      setConfirmPin("")
      setShowPin(false)
      setPinError("")
    } catch (error) {
      console.error("Error al actualizar PIN:", error)
      setPinError("Error al actualizar el PIN. Intente nuevamente.")
    } finally {
      setUpdatingPin(false)
    }
  }

  // Función para crear un nuevo usuario
  const handleCreateUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    try {
      setCreatingUser(true)

      // Crear el usuario en Supabase Auth
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUser.email,
        password: newUser.password,
        email_confirm: true,
        user_metadata: {
          name: newUser.name,
        },
      })

      if (error) throw error

      // Asignar el rol al usuario
      const { error: roleError } = await supabase.auth.admin.updateUserById(data.user.id, {
        role: newUser.role,
      })

      if (roleError) throw roleError

      // Añadir el nuevo usuario al estado local
      const newUserData = {
        id: data.user.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: "",
        position: "",
        branch: "",
        active: true,
        hasPin: false,
        pin: null,
      }

      setUsers([...users, newUserData])

      setShowCreateDialog(false)
      setNewUser({
        email: "",
        password: "",
        name: "",
        role: "encargado",
      })

      toast({
        title: "Usuario creado",
        description: `El usuario ${newUser.name} ha sido creado correctamente con rol de ${newUser.role}.`,
      })
    } catch (error) {
      console.error("Error al crear usuario:", error)
      toast({
        title: "Error",
        description: `No se pudo crear el usuario: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setCreatingUser(false)
    }
  }

  // Obtener usuarios filtrados según la pestaña activa
  const getFilteredUsers = () => {
    let filteredUsers = users

    if (activeTab !== "all") {
      const roleFilter = activeTab.slice(0, -1) // Quitar la 's' del final (employees -> empleado)
      filteredUsers = users.filter((user) => user.role === roleFilter)
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

  // Si no es admin, no mostrar la página
  if (currentUser?.role !== "admin") {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-10">
          <Card>
            <CardHeader>
              <CardTitle>Acceso Denegado</CardTitle>
              <CardDescription>No tienes permisos para acceder a esta página.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
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
      </DashboardLayout>
    )
  }

  const filteredUsers = getFilteredUsers()

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={refreshUsers} disabled={refreshing}>
              {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
              Actualizar
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Nuevo Usuario
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Todos</TabsTrigger>
            <TabsTrigger value="empleados">Empleados</TabsTrigger>
            <TabsTrigger value="encargados">Encargados</TabsTrigger>
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

        {/* Diálogo para crear nuevo usuario */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>Ingresa los datos para crear un nuevo usuario en el sistema</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Nombre</Label>
                <Input
                  id="new-name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email">Email</Label>
                <Input
                  id="new-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="correo@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Contraseña segura"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-role">Rol</Label>
                <Select value={newUser.role} onValueChange={(value) => setNewUser({ ...newUser, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="gerente">Gerente</SelectItem>
                    <SelectItem value="supervisor">Supervisor</SelectItem>
                    <SelectItem value="encargado">Encargado</SelectItem>
                    <SelectItem value="empleado">Empleado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creatingUser}>
                {creatingUser ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Usuario"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}






