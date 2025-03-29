"use client"

import type React from "react"

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
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "@/components/ui/use-toast"

// Lista de locales para seleccionar
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

// Definir categorías predeterminadas
const defaultCategories = [
  {
    id: "limpieza",
    name: "Limpieza",
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
    name: "Seguridad",
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
    name: "Atención",
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
    name: "Calidad",
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
    name: "Procesos",
    maxScore: 10,
    items: [
      { id: "seguimiento_recetas", name: "Seguimiento de recetas estándar", maxScore: 5 },
      { id: "eficiencia", name: "Eficiencia en procesos", maxScore: 5 },
    ],
  },
]

export default function NuevaAuditoriaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("limpieza")
  const [auditCategories, setAuditCategories] = useState([])

  // Estado para los datos de la auditoría
  const [auditData, setAuditData] = useState({
    localId: "",
    auditor: "",
    date: format(new Date(), "yyyy-MM-dd"),
    generalObservations: "",
    categories: [],
  })

  // Cargar categorías desde la API
  useEffect(() => {
    const fetchAuditConfig = async () => {
      try {
        setIsLoading(true)

        // Intentar cargar desde la API
        const response = await fetch('/api/auditorias/config')
        
        if (response.ok) {
          const configData = await response.json()
          
          if (configData && configData.categories && Array.isArray(configData.categories)) {
            // Usar la configuración de la API
            setAuditCategories(configData.categories)

            // Inicializar el estado de la auditoría con las categorías cargadas
            setAuditData({
              ...auditData,
              categories: configData.categories.map((category) => ({
                ...category,
                score: 0,
                items: category.items.map((item) => ({
                  ...item,
                  score: 0,
                  observations: "",
                })),
              })),
            })

            // Establecer la primera categoría como activa
            if (configData.categories.length > 0) {
              setActiveTab(configData.categories[0].id)
            }
          } else {
            // Si no hay datos válidos, usar valores predeterminados
            console.log("Usando categorías predeterminadas debido a datos inválidos")
            useDefaultCategories()
          }
        } else {
          // Si hay error, usar valores predeterminados
          console.log("Usando categorías predeterminadas debido a error en la API")
          useDefaultCategories()
        }
      } catch (error) {
        console.error("Error al cargar configuración de auditoría:", error)
        toast({
          title: "Error",
          description: "Se usará la configuración predeterminada",
          variant: "destructive",
        })

        // En caso de error, usar valores predeterminados
        useDefaultCategories()
      } finally {
        setIsLoading(false)
      }
    }

    // Función para usar categorías predeterminadas
    const useDefaultCategories = () => {
      setAuditCategories(defaultCategories)

      // Inicializar el estado de la auditoría con las categorías predeterminadas
      setAuditData({
        ...auditData,
        categories: defaultCategories.map((category) => ({
          ...category,
          score: 0,
          items: category.items.map((item) => ({
            ...item,
            score: 0,
            observations: "",
          })),
        })),
      })

      // Establecer la primera categoría como activa
      if (defaultCategories.length > 0) {
        setActiveTab(defaultCategories[0].id)
      }
    }

    fetchAuditConfig()
  }, [])

  // Calcular puntaje total
  const totalScore = auditData.categories.reduce((acc, category) => acc + category.score, 0)
  const maxScore = auditData.categories.reduce((acc, category) => acc + category.maxScore, 0)
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  // Manejar cambios en los campos generales
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setAuditData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Manejar cambios en el puntaje de un ítem
  const handleItemScoreChange = (categoryId: string, itemId: string, score: number) => {
    setAuditData((prev) => {
      const newCategories = prev.categories.map((category) => {
        if (category.id === categoryId) {
          // Actualizar el puntaje del ítem
          const newItems = category.items.map((item) => {
            if (item.id === itemId) {
              return { ...item, score }
            }
            return item
          })

          // Calcular el nuevo puntaje de la categoría
          const categoryScore = newItems.reduce((acc, item) => acc + item.score, 0)

          return {
            ...category,
            items: newItems,
            score: Math.min(categoryScore, category.maxScore), // Asegurar que no exceda el máximo
          }
        }
        return category
      })

      return { ...prev, categories: newCategories }
    })
  }

  // Manejar cambios en las observaciones de un ítem
  const handleItemObservationsChange = (categoryId: string, itemId: string, observations: string) => {
    setAuditData((prev) => {
      const newCategories = prev.categories.map((category) => {
        if (category.id === categoryId) {
          const newItems = category.items.map((item) => {
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

  // Guardar la auditoría
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!auditData.localId) {
      toast({
        title: "Error",
        description: "Debes seleccionar un local",
        variant: "destructive",
      })
      return
    }

    if (!auditData.auditor) {
      toast({
        title: "Error",
        description: "Debes ingresar el nombre del auditor",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)

      // Encontrar el nombre del local
      const localName = locales.find((local) => local.id === auditData.localId)?.name || ""

      // Preparar datos para guardar
      const dataToSave = {
        localId: auditData.localId,
        localName,
        auditor: auditData.auditor,
        date: new Date(auditData.date).toISOString(),
        generalObservations: auditData.generalObservations,
        categories: auditData.categories,
        totalScore,
        maxScore,
        percentage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Guardar en la API
      const response = await fetch('/api/auditorias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(`Error al guardar auditoría: ${response.status} - ${errorData.error || 'Error desconocido'}`)
      }

      const result = await response.json()

      toast({
        title: "Auditoría guardada",
        description: "La auditoría se ha guardado correctamente",
      })

      // Redireccionar a la página de auditorías
      router.push("/auditorias")
    } catch (error) {
      console.error("Error al guardar la auditoría:", error)
      toast({
        title: "Error",
        description: error.message || "Ocurrió un error al guardar la auditoría",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout isLoading={isLoading}>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Nueva Auditoría</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/auditorias")}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? "Guardando..." : "Guardar Auditoría"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Información general */}
          <Card className="md:col-span-1">
            <CardHeader>
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos básicos de la auditoría</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="localId">Local</Label>
                <Select
                  name="localId"
                  value={auditData.localId}
                  onValueChange={(value) => setAuditData((prev) => ({ ...prev, localId: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locales.map((local) => (
                      <SelectItem key={local.id} value={local.id}>
                        {local.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="auditor">Auditor</Label>
                <Input
                  id="auditor"
                  name="auditor"
                  value={auditData.auditor}
                  onChange={handleInputChange}
                  placeholder="Nombre del auditor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input id="date" name="date" type="date" value={auditData.date} onChange={handleInputChange} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="generalObservations">Observaciones Generales</Label>
                <Textarea
                  id="generalObservations"
                  name="generalObservations"
                  value={auditData.generalObservations}
                  onChange={handleInputChange}
                  placeholder="Observaciones generales de la auditoría"
                  rows={4}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col items-start">
              <div className="w-full mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Puntaje Total:</span>
                  <span className="text-sm font-medium">
                    {totalScore} / {maxScore} ({percentage}%)
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${percentage}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Completa todas las categorías para finalizar la auditoría</p>
            </CardFooter>
          </Card>

          {/* Categorías y puntajes */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Evaluación por Categorías</CardTitle>
              <CardDescription>Califica cada ítem de 0 a 5 puntos</CardDescription>
            </CardHeader>
            <CardContent>
              {auditData.categories.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">Cargando categorías...</p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-5 mb-4 overflow-x-auto">
                    {auditData.categories.map((category) => (
                      <TabsTrigger 
                        key={category.id} 
                        value={category.id}
                        className="px-2 py-1 text-xs sm:text-sm whitespace-nowrap"
                      >
                        {category.name}
                      </TabsTrigger>
                    ))}
                  </TabsList>

                  {auditData.categories.map((category) => (
                    <TabsContent key={category.id} value={category.id} className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">{category.name}</h3>
                        <span className="text-sm font-medium">
                          {category.score} / {category.maxScore} puntos
                        </span>
                      </div>

                      {category.items.map((item) => (
                        <div key={item.id} className="space-y-4 border-b pb-4">
                          <div className="flex justify-between items-center">
                            <Label htmlFor={item.id}>{item.name}</Label>
                            <span className="text-sm font-medium">
                              {item.score} / {item.maxScore}
                            </span>
                          </div>

                          <Slider
                            id={item.id}
                            min={0}
                            max={item.maxScore}
                            step={1}
                            value={[item.score]}
                            onValueChange={(value) => handleItemScoreChange(category.id, item.id, value[0])}
                            className="py-2"
                          />

                          <Textarea
                            placeholder="Observaciones (opcional)"
                            value={item.observations}
                            onChange={(e) => handleItemObservationsChange(category.id, item.id, e.target.value)}
                            rows={2}
                          />
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}







