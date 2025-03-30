"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { DashboardLayout } from "@/app/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Slider } from "@/components/ui/slider"
import { db } from "@/lib/db"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Save, Plus, Trash2 } from 'lucide-react'

// Lista de locales
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

// Lista de turnos
const turnos = [
  { id: "morning", name: "Mañana" },
  { id: "afternoon", name: "Tarde" },
  { id: "night", name: "Noche" },
]

// Categorías predefinidas
const categoriasPredefinidas = [
  {
    id: "limpieza",
    name: "Limpieza y Orden",
    items: [
      { id: "limpieza_pisos", name: "Pisos limpios", maxScore: 5 },
      { id: "limpieza_mesas", name: "Mesas y sillas", maxScore: 5 },
      { id: "limpieza_banos", name: "Baños", maxScore: 5 },
      { id: "limpieza_cocina", name: "Cocina", maxScore: 5 },
      { id: "limpieza_vitrinas", name: "Vitrinas y exhibidores", maxScore: 5 },
      { id: "orden_general", name: "Orden general", maxScore: 5 },
    ],
  },
  {
    id: "presentacion",
    name: "Presentación del Personal",
    items: [
      { id: "uniforme", name: "Uniforme completo y limpio", maxScore: 5 },
      { id: "higiene_personal", name: "Higiene personal", maxScore: 5 },
      { id: "identificacion", name: "Identificación visible", maxScore: 5 },
      { id: "comportamiento", name: "Comportamiento profesional", maxScore: 5 },
    ],
  },
  {
    id: "atencion",
    name: "Atención al Cliente",
    items: [
      { id: "saludo", name: "Saludo y bienvenida", maxScore: 5 },
      { id: "tiempo_espera", name: "Tiempo de espera", maxScore: 5 },
      { id: "conocimiento", name: "Conocimiento de productos", maxScore: 5 },
      { id: "resolucion", name: "Resolución de problemas", maxScore: 5 },
      { id: "despedida", name: "Despedida", maxScore: 5 },
    ],
  },
  {
    id: "productos",
    name: "Calidad de Productos",
    items: [
      { id: "presentacion_productos", name: "Presentación de productos", maxScore: 5 },
      { id: "frescura", name: "Frescura de ingredientes", maxScore: 5 },
      { id: "temperatura", name: "Temperatura adecuada", maxScore: 5 },
      { id: "sabor", name: "Sabor", maxScore: 5 },
      { id: "consistencia", name: "Consistencia", maxScore: 5 },
    ],
  },
  {
    id: "procesos",
    name: "Procesos Operativos",
    items: [
      { id: "preparacion", name: "Preparación de alimentos", maxScore: 5 },
      { id: "manejo_caja", name: "Manejo de caja", maxScore: 5 },
      { id: "control_stock", name: "Control de stock", maxScore: 5 },
      { id: "limpieza_equipos", name: "Limpieza de equipos", maxScore: 5 },
      { id: "mantenimiento", name: "Mantenimiento preventivo", maxScore: 5 },
    ],
  },
]

export default function NuevaAuditoriaPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [auditConfig, setAuditConfig] = useState(null)
  
  // Estado para los datos de la auditoría
  const [auditData, setAuditData] = useState({
    localId: "",
    localName: "",
    auditor: "",
    managerName: "",
    date: format(new Date(), "yyyy-MM-dd"),
    shift: "morning",
    generalObservations: "",
    type: "detallada", // Tipo de auditoría: detallada
    categories: categoriasPredefinidas.map(category => ({
      ...category,
      score: 0,
      maxScore: category.items.reduce((acc, item) => acc + item.maxScore, 0),
      items: category.items.map(item => ({
        ...item,
        score: 0,
        observations: ""
      }))
    }))
  })

  // Cargar configuración de auditoría
  useEffect(() => {
    const fetchAuditConfig = async () => {
      try {
        const config = await db.auditConfig.findFirst()
        if (config) {
          setAuditConfig(config)
          
          // Si hay categorías configuradas, usarlas
          if (config.categories && config.categories.length > 0) {
            setAuditData(prev => ({
              ...prev,
              categories: config.categories.map(category => ({
                ...category,
                score: 0,
                items: category.items.map(item => ({
                  ...item,
                  score: 0,
                  observations: ""
                }))
              }))
            }))
          }
        }
      } catch (error) {
        console.error("Error al cargar configuración de auditoría:", error)
      }
    }

    fetchAuditConfig()
  }, [])

  // Calcular puntaje total
  const totalScore = auditData.categories.reduce((acc, category) => 
    acc + category.items.reduce((sum, item) => sum + item.score, 0), 0)
  
  const maxScore = auditData.categories.reduce((acc, category) => 
    acc + category.items.reduce((sum, item) => sum + item.maxScore, 0), 0)
  
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  // Manejar cambios en los campos generales
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAuditData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejar cambios en el select
  const handleSelectChange = (name, value) => {
    setAuditData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'localId' && { 
        localName: locales.find(local => local.id === value)?.name || "" 
      })
    }))
  }

  // Manejar cambios en el puntaje de un ítem
  const handleItemScoreChange = (categoryId, itemId, score) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = category.items.map(item => {
            if (item.id === itemId) {
              return { ...item, score }
            }
            return item
          })

          // Recalcular el puntaje de la categoría
          const categoryScore = newItems.reduce((acc, item) => acc + item.score, 0)

          return {
            ...category,
            items: newItems,
            score: categoryScore
          }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Manejar cambios en las observaciones de un ítem
  const handleItemObservationsChange = (categoryId, itemId, observations) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = category.items.map(item => {
            if (item.id === itemId) {
              return { ...item, observations }
            }
            return item
          })

          return { ...category, items: newItems }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Agregar una nueva categoría
  const handleAddCategory = () => {
    const newCategoryId = `category_${Date.now()}`
    const newCategory = {
      id: newCategoryId,
      name: "Nueva Categoría",
      score: 0,
      maxScore: 0,
      items: []
    }

    setAuditData(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }))

    // Cambiar a la nueva pestaña
    setActiveTab(newCategoryId)
  }

  // Editar nombre de categoría
  const handleCategoryNameChange = (categoryId, name) => {
    setAuditData(prev => ({
      ...prev,
      categories: prev.categories.map(category => 
        category.id === categoryId ? { ...category, name } : category
      )
    }))
  }

  // Eliminar categoría
  const handleDeleteCategory = (categoryId) => {
    setAuditData(prev => ({
      ...prev,
      categories: prev.categories.filter(category => category.id !== categoryId)
    }))

    // Cambiar a la pestaña general
    setActiveTab("general")
  }

  // Agregar un nuevo ítem a una categoría
  const handleAddItem = (categoryId) => {
    const newItemId = `item_${Date.now()}`
    const newItem = {
      id: newItemId,
      name: "Nuevo Ítem",
      score: 0,
      maxScore: 5,
      observations: ""
    }

    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = [...category.items, newItem]
          return {
            ...category,
            items: newItems,
            maxScore: newItems.reduce((acc, item) => acc + item.maxScore, 0)
          }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Editar nombre de ítem
  const handleItemNameChange = (categoryId, itemId, name) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = category.items.map(item => {
            if (item.id === itemId) {
              return { ...item, name }
            }
            return item
          })

          return { ...category, items: newItems }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Editar puntaje máximo de ítem
  const handleItemMaxScoreChange = (categoryId, itemId, maxScore) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = category.items.map(item => {
            if (item.id === itemId) {
              return { ...item, maxScore }
            }
            return item
          })

          // Recalcular el puntaje máximo de la categoría
          const categoryMaxScore = newItems.reduce((acc, item) => acc + item.maxScore, 0)

          return {
            ...category,
            items: newItems,
            maxScore: categoryMaxScore
          }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Eliminar ítem
  const handleDeleteItem = (categoryId, itemId) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          const newItems = category.items.filter(item => item.id !== itemId)
          
          // Recalcular el puntaje y puntaje máximo de la categoría
          const categoryScore = newItems.reduce((acc, item) => acc + item.score, 0)
          const categoryMaxScore = newItems.reduce((acc, item) => acc + item.maxScore, 0)

          return {
            ...category,
            items: newItems,
            score: categoryScore,
            maxScore: categoryMaxScore
          }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Guardar la auditoría
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!auditData.localId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un local",
        variant: "destructive"
      })
      return
    }

    if (!auditData.auditor) {
      toast({
        title: "Error",
        description: "Debes ingresar el nombre del auditor",
        variant: "destructive"
      })
      return
    }

    try {
      setIsLoading(true)

      // Preparar datos para guardar
      const dataToSave = {
        localId: auditData.localId,
        localName: auditData.localName,
        auditor: auditData.auditor,
        auditorName: auditData.auditor,
        managerName: auditData.managerName,
        date: new Date(auditData.date).toISOString(),
        shift: auditData.shift,
        generalObservations: auditData.generalObservations,
        categories: auditData.categories,
        totalScore,
        maxScore,
        percentage,
        type: "detallada" // Especificar que es una auditoría detallada
      }

      console.log("Guardando auditoría:", dataToSave)

      // Guardar en la base de datos
      const result = await db.audits.create({
        data: dataToSave
      })

      console.log("Auditoría guardada:", result)

      toast({
        title: "Auditoría guardada",
        description: "La auditoría se ha guardado correctamente"
      })

      // Redireccionar a la página de auditorías
      router.push("/auditorias")
    } catch (error) {
      console.error("Error al guardar la auditoría:", error)
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar la auditoría. Por favor, intente nuevamente.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Nueva Auditoría Detallada</h1>
            <p className="text-muted-foreground">Complete el formulario para registrar una nueva auditoría detallada</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/auditorias")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              <Save className="mr-2 h-4 w-4" />
              {isLoading ? "Guardando..." : "Guardar Auditoría"}
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="flex-1">
              <TabsTrigger value="general">Información General</TabsTrigger>
              {auditData.categories.map((category) => (
                <TabsTrigger key={category.id} value={category.id}>
                  {category.name}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" onClick={handleAddCategory}>
              <Plus className="mr-2 h-4 w-4" />
              Agregar Categoría
            </Button>
          </div>

          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Información General</CardTitle>
                <CardDescription>Datos básicos de la auditoría</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-col













