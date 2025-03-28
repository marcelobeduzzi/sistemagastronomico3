"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { db } from "@/lib/db"
import { toast } from "@/components/ui/use-toast"
import { Plus, Edit, Trash2, Save, ArrowLeft } from "lucide-react"

// Tipos para categorías e ítems
interface AuditItem {
  id: string
  name: string
  maxScore: number
  observations?: string
}

interface AuditCategory {
  id: string
  name: string
  maxScore: number
  items: AuditItem[]
}

export default function ConfiguracionAuditoriaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState<AuditCategory[]>([])
  const [activeTab, setActiveTab] = useState<string>("categorias")

  // Estados para diálogos
  const [isNewCategoryDialogOpen, setIsNewCategoryDialogOpen] = useState(false)
  const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
  const [isNewItemDialogOpen, setIsNewItemDialogOpen] = useState(false)
  const [isEditItemDialogOpen, setIsEditItemDialogOpen] = useState(false)

  // Estados para formularios
  const [newCategory, setNewCategory] = useState<Omit<AuditCategory, "items">>({
    id: "",
    name: "",
    maxScore: 25,
  })

  const [editCategory, setEditCategory] = useState<Omit<AuditCategory, "items">>({
    id: "",
    name: "",
    maxScore: 25,
  })

  const [newItem, setNewItem] = useState<AuditItem & { categoryId: string }>({
    id: "",
    name: "",
    maxScore: 5,
    categoryId: "",
  })

  const [editItem, setEditItem] = useState<AuditItem & { categoryId: string }>({
    id: "",
    name: "",
    maxScore: 5,
    categoryId: "",
  })

  // Cargar categorías e ítems
  useEffect(() => {
    const fetchAuditConfig = async () => {
      try {
        setIsLoading(true)

        // Intentar cargar desde la base de datos
        const { data: configData, error } = await db.supabase.from("audit_config").select("*").single()

        if (error || !configData) {
          // Si no hay configuración, usar valores predeterminados
          const defaultCategories: AuditCategory[] = [
            {
              id: "limpieza",
              name: "Limpieza y Orden",
              maxScore: 25,
              items: [
                { id: "limpieza_general", name: "Limpieza general del local", maxScore: 5 },
                { id: "orden_cocina", name: "Orden en la cocina", maxScore: 5 },
                { id: "limpieza_banos", name: "Limpieza de baños", maxScore: 5 },
                { id: "manejo_residuos", name: "Manejo de residuos", maxScore: 5 },
                { id: "orden_almacen", name: "Orden en almacén", maxScore: 5 },
              ],
            },
            {
              id: "seguridad_alimentaria",
              name: "Seguridad Alimentaria",
              maxScore: 25,
              items: [
                { id: "control_temperatura", name: "Control de temperatura de alimentos", maxScore: 5 },
                { id: "almacenamiento", name: "Almacenamiento adecuado", maxScore: 5 },
                { id: "fechas_vencimiento", name: "Control de fechas de vencimiento", maxScore: 5 },
                { id: "manipulacion", name: "Manipulación de alimentos", maxScore: 5 },
                { id: "contaminacion_cruzada", name: "Prevención de contaminación cruzada", maxScore: 5 },
              ],
            },
            {
              id: "atencion_cliente",
              name: "Atención al Cliente",
              maxScore: 20,
              items: [
                { id: "presentacion_personal", name: "Presentación del personal", maxScore: 5 },
                { id: "amabilidad", name: "Amabilidad y cortesía", maxScore: 5 },
                { id: "rapidez", name: "Rapidez en el servicio", maxScore: 5 },
                { id: "conocimiento_menu", name: "Conocimiento del menú", maxScore: 5 },
              ],
            },
            {
              id: "calidad_producto",
              name: "Calidad del Producto",
              maxScore: 20,
              items: [
                { id: "presentacion_platos", name: "Presentación de platos", maxScore: 5 },
                { id: "sabor", name: "Sabor y temperatura adecuados", maxScore: 5 },
                { id: "consistencia", name: "Consistencia en la calidad", maxScore: 5 },
                { id: "frescura", name: "Frescura de ingredientes", maxScore: 5 },
              ],
            },
            {
              id: "procesos_operativos",
              name: "Procesos Operativos",
              maxScore: 10,
              items: [
                { id: "seguimiento_recetas", name: "Seguimiento de recetas estándar", maxScore: 5 },
                { id: "eficiencia", name: "Eficiencia en procesos", maxScore: 5 },
              ],
            },
          ]

          setCategories(defaultCategories)

          // Guardar la configuración predeterminada en la base de datos
          await db.supabase.from("audit_config").insert([{ categories: defaultCategories }])
        } else {
          // Usar la configuración de la base de datos
          setCategories(configData.categories || [])
        }
      } catch (error) {
        console.error("Error al cargar configuración de auditoría:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la configuración de auditoría",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditConfig()
  }, [])

  // Guardar cambios en la base de datos
  const saveConfiguration = async () => {
    try {
      setIsLoading(true)

      await db.supabase.from("audit_config").update({ categories }).eq("id", 1)

      toast({
        title: "Configuración guardada",
        description: "La configuración de auditoría se ha guardado correctamente",
      })
    } catch (error) {
      console.error("Error al guardar configuración:", error)
      toast({
        title: "Error",
        description: "No se pudo guardar la configuración",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Funciones para manejar categorías
  const handleAddCategory = () => {
    if (!newCategory.name) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es obligatorio",
        variant: "destructive",
      })
      return
    }

    // Generar ID a partir del nombre
    const id = newCategory.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")

    const categoryToAdd: AuditCategory = {
      ...newCategory,
      id,
      items: [],
    }

    setCategories([...categories, categoryToAdd])
    setNewCategory({ id: "", name: "", maxScore: 25 })
    setIsNewCategoryDialogOpen(false)

    toast({
      title: "Categoría agregada",
      description: "La categoría se ha agregado correctamente",
    })
  }

  const handleEditCategory = () => {
    if (!editCategory.name) {
      toast({
        title: "Error",
        description: "El nombre de la categoría es obligatorio",
        variant: "destructive",
      })
      return
    }

    setCategories(
      categories.map((cat) =>
        cat.id === editCategory.id ? { ...cat, name: editCategory.name, maxScore: editCategory.maxScore } : cat,
      ),
    )

    setIsEditCategoryDialogOpen(false)

    toast({
      title: "Categoría actualizada",
      description: "La categoría se ha actualizado correctamente",
    })
  }

  const handleDeleteCategory = (id: string) => {
    if (confirm("¿Estás seguro de eliminar esta categoría? Se eliminarán también todos sus ítems.")) {
      setCategories(categories.filter((cat) => cat.id !== id))

      toast({
        title: "Categoría eliminada",
        description: "La categoría se ha eliminado correctamente",
      })
    }
  }

  // Funciones para manejar ítems
  const handleAddItem = () => {
    if (!newItem.name || !newItem.categoryId) {
      toast({
        title: "Error",
        description: "El nombre del ítem y la categoría son obligatorios",
        variant: "destructive",
      })
      return
    }

    // Generar ID a partir del nombre
    const id = newItem.name
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "")

    const itemToAdd: AuditItem = {
      id,
      name: newItem.name,
      maxScore: newItem.maxScore,
    }

    setCategories(
      categories.map((cat) => (cat.id === newItem.categoryId ? { ...cat, items: [...cat.items, itemToAdd] } : cat)),
    )

    setNewItem({ id: "", name: "", maxScore: 5, categoryId: newItem.categoryId })
    setIsNewItemDialogOpen(false)

    toast({
      title: "Ítem agregado",
      description: "El ítem se ha agregado correctamente",
    })
  }

  const handleEditItem = () => {
    if (!editItem.name) {
      toast({
        title: "Error",
        description: "El nombre del ítem es obligatorio",
        variant: "destructive",
      })
      return
    }

    setCategories(
      categories.map((cat) =>
        cat.id === editItem.categoryId
          ? {
              ...cat,
              items: cat.items.map((item) =>
                item.id === editItem.id ? { ...item, name: editItem.name, maxScore: editItem.maxScore } : item,
              ),
            }
          : cat,
      ),
    )

    setIsEditItemDialogOpen(false)

    toast({
      title: "Ítem actualizado",
      description: "El ítem se ha actualizado correctamente",
    })
  }

  const handleDeleteItem = (categoryId: string, itemId: string) => {
    if (confirm("¿Estás seguro de eliminar este ítem?")) {
      setCategories(
        categories.map((cat) =>
          cat.id === categoryId ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) } : cat,
        ),
      )

      toast({
        title: "Ítem eliminado",
        description: "El ítem se ha eliminado correctamente",
      })
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/auditorias")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold">Configuración de Auditorías</h1>
          </div>
          <Button onClick={saveConfiguration} disabled={isLoading}>
            <Save className="mr-2 h-4 w-4" />
            Guardar Configuración
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Administrar Categorías e Ítems</CardTitle>
            <CardDescription>Personaliza las categorías e ítems que se utilizarán en las auditorías</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="categorias">Categorías</TabsTrigger>
                <TabsTrigger value="items">Ítems</TabsTrigger>
              </TabsList>

              <TabsContent value="categorias">
                <div className="flex justify-end mb-4">
                  <Dialog open={isNewCategoryDialogOpen} onOpenChange={setIsNewCategoryDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nueva Categoría
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Categoría</DialogTitle>
                        <DialogDescription>
                          Completa los datos para agregar una nueva categoría de auditoría
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-category-name">Nombre</Label>
                          <Input
                            id="new-category-name"
                            value={newCategory.name}
                            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                            placeholder="Ej: Limpieza y Orden"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-category-max-score">Puntaje Máximo</Label>
                          <Input
                            id="new-category-max-score"
                            type="number"
                            min="1"
                            max="100"
                            value={newCategory.maxScore}
                            onChange={(e) =>
                              setNewCategory({ ...newCategory, maxScore: Number.parseInt(e.target.value) || 0 })
                            }
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewCategoryDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddCategory}>Agregar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Puntaje Máximo</TableHead>
                        <TableHead>Ítems</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No hay categorías configuradas
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.map((category) => (
                          <TableRow key={category.id}>
                            <TableCell className="font-medium">{category.name}</TableCell>
                            <TableCell>{category.maxScore}</TableCell>
                            <TableCell>{category.items.length}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Dialog
                                  open={isEditCategoryDialogOpen && editCategory.id === category.id}
                                  onOpenChange={(open) => {
                                    setIsEditCategoryDialogOpen(open)
                                    if (open)
                                      setEditCategory({
                                        id: category.id,
                                        name: category.name,
                                        maxScore: category.maxScore,
                                      })
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Editar Categoría</DialogTitle>
                                      <DialogDescription>Modifica los datos de la categoría</DialogDescription>
                                    </DialogHeader>
                                    <div className="grid gap-4 py-4">
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-category-name">Nombre</Label>
                                        <Input
                                          id="edit-category-name"
                                          value={editCategory.name}
                                          onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                                        />
                                      </div>
                                      <div className="space-y-2">
                                        <Label htmlFor="edit-category-max-score">Puntaje Máximo</Label>
                                        <Input
                                          id="edit-category-max-score"
                                          type="number"
                                          min="1"
                                          max="100"
                                          value={editCategory.maxScore}
                                          onChange={(e) =>
                                            setEditCategory({
                                              ...editCategory,
                                              maxScore: Number.parseInt(e.target.value) || 0,
                                            })
                                          }
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button variant="outline" onClick={() => setIsEditCategoryDialogOpen(false)}>
                                        Cancelar
                                      </Button>
                                      <Button onClick={handleEditCategory}>Guardar</Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <Button variant="outline" size="icon" onClick={() => handleDeleteCategory(category.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>

              <TabsContent value="items">
                <div className="flex justify-end mb-4">
                  <Dialog open={isNewItemDialogOpen} onOpenChange={setIsNewItemDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Nuevo Ítem
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Agregar Ítem</DialogTitle>
                        <DialogDescription>
                          Completa los datos para agregar un nuevo ítem de auditoría
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="new-item-category">Categoría</Label>
                          <select
                            id="new-item-category"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            value={newItem.categoryId}
                            onChange={(e) => setNewItem({ ...newItem, categoryId: e.target.value })}
                          >
                            <option value="">Seleccionar categoría</option>
                            {categories.map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-item-name">Nombre</Label>
                          <Input
                            id="new-item-name"
                            value={newItem.name}
                            onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                            placeholder="Ej: Limpieza general del local"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="new-item-max-score">Puntaje Máximo</Label>
                          <Input
                            id="new-item-max-score"
                            type="number"
                            min="1"
                            max="10"
                            value={newItem.maxScore}
                            onChange={(e) => setNewItem({ ...newItem, maxScore: Number.parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewItemDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button onClick={handleAddItem}>Agregar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Categoría</TableHead>
                        <TableHead>Nombre</TableHead>
                        <TableHead>Puntaje Máximo</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {categories.flatMap((cat) =>
                        cat.items.map((item) => ({ categoryId: cat.id, categoryName: cat.name, ...item })),
                      ).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="h-24 text-center">
                            No hay ítems configurados
                          </TableCell>
                        </TableRow>
                      ) : (
                        categories.flatMap((cat) =>
                          cat.items.map((item) => (
                            <TableRow key={`${cat.id}-${item.id}`}>
                              <TableCell>{cat.name}</TableCell>
                              <TableCell className="font-medium">{item.name}</TableCell>
                              <TableCell>{item.maxScore}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Dialog
                                    open={
                                      isEditItemDialogOpen && editItem.id === item.id && editItem.categoryId === cat.id
                                    }
                                    onOpenChange={(open) => {
                                      setIsEditItemDialogOpen(open)
                                      if (open)
                                        setEditItem({
                                          id: item.id,
                                          name: item.name,
                                          maxScore: item.maxScore,
                                          categoryId: cat.id,
                                        })
                                    }}
                                  >
                                    <DialogTrigger asChild>
                                      <Button variant="outline" size="icon">
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Editar Ítem</DialogTitle>
                                        <DialogDescription>Modifica los datos del ítem</DialogDescription>
                                      </DialogHeader>
                                      <div className="grid gap-4 py-4">
                                        <div className="space-y-2">
                                          <Label htmlFor="edit-item-name">Nombre</Label>
                                          <Input
                                            id="edit-item-name"
                                            value={editItem.name}
                                            onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                                          />
                                        </div>
                                        <div className="space-y-2">
                                          <Label htmlFor="edit-item-max-score">Puntaje Máximo</Label>
                                          <Input
                                            id="edit-item-max-score"
                                            type="number"
                                            min="1"
                                            max="10"
                                            value={editItem.maxScore}
                                            onChange={(e) =>
                                              setEditItem({
                                                ...editItem,
                                                maxScore: Number.parseInt(e.target.value) || 0,
                                              })
                                            }
                                          />
                                        </div>
                                      </div>
                                      <DialogFooter>
                                        <Button variant="outline" onClick={() => setIsEditItemDialogOpen(false)}>
                                          Cancelar
                                        </Button>
                                        <Button onClick={handleEditItem}>Guardar</Button>
                                      </DialogFooter>
                                    </DialogContent>
                                  </Dialog>

                                  <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => handleDeleteItem(cat.id, item.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )),
                        )
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

