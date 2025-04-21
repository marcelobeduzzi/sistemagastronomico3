"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Save, Trash2 } from 'lucide-react'
import { salesService } from "@/lib/sales-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AlertCircle, CheckCircle } from 'lucide-react'

export default function EditProductPage({ params }) {
  const router = useRouter()
  const { id } = params
  
  const [product, setProduct] = useState({
    name: "",
    description: "",
    category: "",
    price: 0,
    price_pedidosya: 0,
    price_rappi: 0,
    status: "active",
    stock: 0,
    min_stock: 0
  })
  
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [categories, setCategories] = useState([])
  
  // Cargar datos del producto
  useEffect(() => {
    async function loadProduct() {
      try {
        const productData = await salesService.getProductById(id)
        setProduct(productData)
        
        // Cargar categorías
        const products = await salesService.getProducts()
        const uniqueCategories = [...new Set(products.map(p => p.category))]
          .filter(category => category) // Eliminar valores nulos o vacíos
        setCategories(uniqueCategories)
      } catch (error) {
        console.error("Error al cargar producto:", error)
        setErrorMessage("Error al cargar los datos del producto")
      } finally {
        setIsLoading(false)
      }
    }
    
    loadProduct()
  }, [id])
  
  // Manejar cambios en los campos
  const handleChange = (e) => {
    const { name, value } = e.target
    setProduct(prev => ({ ...prev, [name]: value }))
  }
  
  // Manejar cambios en campos numéricos
  const handleNumberChange = (name, value) => {
    const numValue = parseFloat(value) || 0
    setProduct(prev => ({ ...prev, [name]: numValue }))
  }
  
  // Manejar cambios en campos de selección
  const handleSelectChange = (name, value) => {
    setProduct(prev => ({ ...prev, [name]: value }))
  }
  
  // Guardar cambios
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSaving(true)
    setErrorMessage("")
    setSuccessMessage("")
    
    try {
      // Llamar al servicio para actualizar el producto
      await supabase
        .from('products')
        .update({
          name: product.name,
          description: product.description,
          category: product.category,
          price: product.price,
          price_pedidosya: product.price_pedidosya,
          price_rappi: product.price_rappi,
          status: product.status
        })
        .eq('id', id)
      
      // Actualizar el inventario si es necesario
      await supabase
        .from('sales_inventory')
        .upsert({
          product_id: id,
          min_stock: product.min_stock,
          updated_at: new Date().toISOString()
        }, { onConflict: 'product_id' })
      
      setSuccessMessage("Producto actualizado correctamente")
    } catch (error) {
      console.error("Error al guardar producto:", error)
      setErrorMessage("Error al guardar los cambios")
    } finally {
      setIsSaving(false)
    }
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando datos del producto...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/ventas/productos">
          <Button variant="outline" size="icon">
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Volver</span>
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Editar Producto</h1>
          <p className="text-muted-foreground">
            Modifica la información del producto y sus precios
          </p>
        </div>
      </div>
      
      {/* Mensajes de éxito o error */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative flex items-center">
          <CheckCircle className="h-5 w-5 mr-2" />
          <span>{successMessage}</span>
          <button 
            className="absolute top-0 right-0 p-2" 
            onClick={() => setSuccessMessage("")}
          >
            &times;
          </button>
        </div>
      )}
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <span>{errorMessage}</span>
          <button 
            className="absolute top-0 right-0 p-2" 
            onClick={() => setErrorMessage("")}
          >
            &times;
          </button>
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">Información General</TabsTrigger>
            <TabsTrigger value="prices">Precios</TabsTrigger>
            <TabsTrigger value="inventory">Inventario</TabsTrigger>
          </TabsList>
          
          {/* Pestaña de información general */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>Información del Producto</CardTitle>
                <CardDescription>
                  Información básica del producto
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Producto</Label>
                  <Input
                    id="name"
                    name="name"
                    value={product.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={product.description || ""}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={product.category || ""}
                    onValueChange={(value) => handleSelectChange("category", value)}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Seleccionar categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                      <SelectItem value="nueva">+ Nueva categoría</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {product.category === "nueva" && (
                  <div className="space-y-2">
                    <Label htmlFor="new-category">Nueva Categoría</Label>
                    <Input
                      id="new-category"
                      name="new-category"
                      value={product.newCategory || ""}
                      onChange={(e) => setProduct(prev => ({ ...prev, newCategory: e.target.value, category: e.target.value }))}
                      required
                    />
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="status">Estado</Label>
                  <Select
                    value={product.status || "active"}
                    onValueChange={(value) => handleSelectChange("status", value)}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Activo</SelectItem>
                      <SelectItem value="inactive">Inactivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de precios */}
          <TabsContent value="prices">
            <Card>
              <CardHeader>
                <CardTitle>Precios</CardTitle>
                <CardDescription>
                  Configura los precios para diferentes canales de venta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Precio Local</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7"
                      value={product.price || 0}
                      onChange={(e) => handleNumberChange("price", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price_pedidosya">Precio PedidosYa</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="price_pedidosya"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7"
                      value={product.price_pedidosya || 0}
                      onChange={(e) => handleNumberChange("price_pedidosya", e.target.value)}
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price_rappi">Precio Rappi</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5">$</span>
                    <Input
                      id="price_rappi"
                      type="number"
                      step="0.01"
                      min="0"
                      className="pl-7"
                      value={product.price_rappi || 0}
                      onChange={(e) => handleNumberChange("price_rappi", e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Pestaña de inventario */}
          <TabsContent value="inventory">
            <Card>
              <CardHeader>
                <CardTitle>Inventario</CardTitle>
                <CardDescription>
                  Configura los parámetros de inventario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Actual</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    value={product.stock || 0}
                    disabled
                  />
                  <p className="text-sm text-muted-foreground">
                    Para modificar el stock, utiliza la opción "Ajustar Stock" en la sección de Inventario
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="min_stock">Stock Mínimo</Label>
                  <Input
                    id="min_stock"
                    type="number"
                    min="0"
                    value={product.min_stock || 0}
                    onChange={(e) => handleNumberChange("min_stock", e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Se generará una alerta cuando el stock sea menor a este valor
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/ventas/productos')}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⟳</span>
                Guardando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}