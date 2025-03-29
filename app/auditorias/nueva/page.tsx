// Archivo: app/auditorias/nueva/page.tsx

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

export default function NuevaAuditoriaPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("")
  const [auditCategories, setAuditCategories] = useState([])

  // Estado para los datos de la auditoría
  const [auditData, setAuditData] = useState({
    localId: "",
    localName: "",
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

        // Usar la API route en lugar de acceder directamente a Supabase
        const response = await fetch('/api/auditorias/config')
        
        if (!response.ok) {
          throw new Error(`Error al cargar configuración: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data && data.categories && Array.isArray(data.categories)) {
          // Inicializar el estado de la auditoría con las categorías cargadas
          const categories = data.categories.map(category => ({
            ...category,
            score: 0,
            items: category.items.map(item => ({
              ...item,
              score: 0,
              observations: "",
            })),
          }))
          
          setAuditCategories(categories)
          setAuditData(prev => ({
            ...prev,
            categories
          }))
          
          // Establecer la primera categoría como activa
          if (categories.length > 0) {
            setActiveTab(categories[0].id)
          }
        } else {
          console.log("No se encontraron categorías")
          toast({
            title: "Error",
            description: "No se pudieron cargar las categorías de auditoría",
            variant: "destructive",
          })
        }
      } catch (error) {
        console.error("Error al cargar configuración de auditoría:", error)
        toast({
          title: "Error",
          description: "Error al cargar la configuración de auditoría",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditConfig()
  }, [])

  // Calcular puntaje total
  const totalScore = auditData.categories.reduce((acc, category) => acc + category.score, 0)
  const maxScore = auditData.categories.reduce((acc, category) => acc + category.maxScore, 0)
  const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0

  // Manejar cambios en los campos generales
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAuditData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  // Manejar cambios en el local seleccionado
  const handleLocalChange = (value) => {
    const selectedLocal = locales.find(local => local.id === value)
    setAuditData(prev => ({
      ...prev,
      localId: value,
      localName: selectedLocal ? selectedLocal.name : ""
    }))
  }

  // Manejar cambios en el puntaje de un ítem
  const handleItemScoreChange = (categoryId, itemId, score) => {
    setAuditData(prev => {
      const newCategories = prev.categories.map(category => {
        if (category.id === categoryId) {
          // Actualizar el puntaje del ítem
          const newItems = category.items.map(item => {
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

  // Guardar la auditoría
  const handleSubmit = async (e) => {
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

      // Preparar datos para guardar
      const dataToSave = {
        ...auditData,
        totalScore,
        maxScore,
        percentage,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      // Guardar en la base de datos usando la API route
      const response = await fetch('/api/auditorias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSave),
      })
      
      if (!response.ok) {
        throw new Error(`Error al guardar auditoría: ${response.status}`)
      }

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
        description: "Ocurrió un error al guardar la auditoría",
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
                  value={auditData.localId}
                  onValueChange={handleLocalChange}
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
                <Input 
                  id="date" 
                  name="date" 
                  type="date" 
                  value={auditData.date} 
                  onChange={handleInputChange} 
                />
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
              <CardDescription>Califica cada ítem según corresponda</CardDescription>
            </CardHeader>
            <CardContent>
              {auditData.categories.length === 0 ? (
                <div className="flex items-center justify-center h-64">
                  <p className="text-muted-foreground">Cargando categorías...</p>
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-2 md:grid-cols-7 mb-4">
                    {auditData.categories.map((category) => (
                      <TabsTrigger key={category.id} value={category.id}>
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







