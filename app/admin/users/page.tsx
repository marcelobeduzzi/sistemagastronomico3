"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { mockUsers } from "@/lib/mock-data"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Edit, UserPlus, Key, Loader2 } from "lucide-react"

export default function UsersPage() {
  const { toast } = useToast()
  const { supervisors, updateSupervisorPin } = useAuth()
  const [users, setUsers] = useState([...mockUsers])
  const [activeTab, setActiveTab] = useState("all")
  const [selectedUser, setSelectedUser] = useState(null)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showNewUserDialog, setShowNewUserDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [editedUser, setEditedUser] = useState({
    id: "",
    name: "",
    email: "",
    role: "",
  })
  const [newPin, setNewPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [pinError, setPinError] = useState("")
  const [loading, setLoading] = useState(true)
  const [updatingPin, setUpdatingPin] = useState(false)

  // Cargar usuarios al montar el componente
  useEffect(() => {
    // Simulamos una carga de datos
    const loadUsers = async () => {
      try {
        // En un caso real, aquí cargaríamos los usuarios desde la base de datos
        // Para este ejemplo, usamos los datos de mockUsers

        // Combinar los usuarios mock con los supervisores para tener la información completa
        const combinedUsers = [...mockUsers]

        // Marcar los usuarios que son supervisores y tienen PIN
        combinedUsers.forEach((user) => {
          const supervisor = supervisors.find((s) => s.id === user.id)
          if (supervisor) {
            user.hasPin = true
            user.pin = supervisor.pin
          } else {
            user.hasPin = false
            user.pin = null
          }
        })

        setUsers(combinedUsers)
      } catch (error) {
        console.error("Error al cargar usuarios:", error)
        toast({
          title: "Error",
          description: "No se pudieron cargar los usuarios. Se están usando datos de ejemplo.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    loadUsers()
  }, [toast, supervisors])

  // Función para editar un usuario
  const handleEditUser = () => {
    if (!editedUser.name || !editedUser.email || !editedUser.role) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    // Actualizar el usuario en el estado local
    setUsers(users.map((user) => (user.id === editedUser.id ? { ...user, ...editedUser } : user)))

    setShowEditDialog(false)
    toast({
      title: "Usuario actualizado",
      description: "El usuario ha sido actualizado correctamente.",
    })
  }

  // Función para crear un nuevo usuario
  const handleCreateUser = () => {
    if (!editedUser.name || !editedUser.email || !editedUser.role) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos requeridos.",
        variant: "destructive",
      })
      return
    }

    const newUser = {
      id: `user-${Date.now()}`,
      ...editedUser,
      hasPin: false,
      pin: null,
    }

    // Agregar el nuevo usuario al estado local
    setUsers([...users, newUser])

    setShowNewUserDialog(false)
    setEditedUser({
      id: "",
      name: "",
      email: "",
      role: "",
    })

    toast({
      title: "Usuario creado",
      description: "El nuevo usuario ha sido creado correctamente.",
    })
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
      const success = await updateSupervisorPin(selectedUser.id, newPin)

      if (success) {
        // Actualizar el usuario en el estado local
        setUsers(users.map((user) => (user.id === selectedUser.id ? { ...user, hasPin: true, pin: newPin } : user)))

        setShowPinDialog(false)
        setNewPin("")
        setConfirmPin("")
        setShowPin(false)
        setPinError("")

        toast({
          title: "PIN actualizado",
          description: `El PIN de ${selectedUser.name} ha sido actualizado correctamente.`,
        })
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

  // Filtrar usuarios según la pestaña activa
  const filteredUsers = users.filter((user) => {
    if (activeTab === "all") return true
    if (activeTab === "employees") return user.role === "empleado"
    if (activeTab === "managers") return user.role === "encargado"
    if (activeTab === "supervisors") return user.role === "supervisor" || user.role === "gerente"
    if (activeTab === "admins") return user.role === "admin"
    return true
  })

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

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Gestión de Usuarios</h1>
        <Button
          onClick={() => {
            setEditedUser({
              id: "",
              name: "",
              email: "",
              role: "",
            })
            setShowNewUserDialog(true)
          }}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
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
              <CardDescription>Gestiona los usuarios del sistema y sus permisos</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredUsers.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No hay usuarios que coincidan con los filtros</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
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
            <DialogDescription>Modifica los datos del usuario seleccionado</DialogDescription>
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
              <Label htmlFor="role">Rol</Label>
              <Select value={editedUser.role} onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empleado">Empleado</SelectItem>
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
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

      {/* Diálogo para nuevo usuario */}
      <Dialog open={showNewUserDialog} onOpenChange={setShowNewUserDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nuevo Usuario</DialogTitle>
            <DialogDescription>Crea un nuevo usuario en el sistema</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-name">Nombre</Label>
              <Input
                id="new-name"
                value={editedUser.name}
                onChange={(e) => setEditedUser({ ...editedUser, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-email">Email</Label>
              <Input
                id="new-email"
                type="email"
                value={editedUser.email}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role">Rol</Label>
              <Select value={editedUser.role} onValueChange={(value) => setEditedUser({ ...editedUser, role: value })}>
                <SelectTrigger id="new-role">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empleado">Empleado</SelectItem>
                  <SelectItem value="encargado">Encargado</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="gerente">Gerente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewUserDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateUser}>Crear Usuario</Button>
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



