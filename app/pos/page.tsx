"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { ShoppingCart, Plus, Minus, Trash2, CreditCard, Receipt, CheckCircle, AlertCircle, ArrowLeft, Search, RefreshCw } from 'lucide-react'

export default function POSSystem() {
  const router = useRouter()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [cartItems, setCartItems] = useState([])
  const [searchQuery, setSearchQuery] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [paymentConfirmed, setPaymentConfirmed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [orderChannel, setOrderChannel] = useState("local")
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [recentSales, setRecentSales] = useState([])
  const [isLoadingRecentSales, setIsLoadingRecentSales] = useState(false)

  // Cargar productos y categorías
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true)
      
      // Cargar productos
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*, sales_inventory(current_stock, min_stock)')
        .eq('status', 'active')
      
      if (productsError) throw productsError
      
      // Formatear los datos para incluir información de stock
      const formattedProducts = productsData.map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        category: product.category,
        price: product.price,
        price_pedidosya: product.price_pedidosya,
        price_rappi: product.price_rappi,
        status: product.status,
        stock: product.sales_inventory?.[0]?.current_stock || 0,
        min_stock: product.sales_inventory?.[0]?.min_stock || 0
      }))
      
      // Cargar categorías
      const uniqueCategories = [...new Set(formattedProducts.map(item => item.category))]
        .filter(category => category) // Eliminar valores nulos o vacíos
      
      setProducts(formattedProducts || [])
      setCategories(uniqueCategories || [])
      
      // Cargar ventas recientes
      await loadRecentSales()
    } catch (error) {
      console.error("Error al cargar datos:", error)
      setErrorMessage("Error al cargar productos. Por favor, recarga la página.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Cargar ventas recientes
  const loadRecentSales = async () => {
    try {
      setIsLoadingRecentSales(true)
      
      const { data, error } = await supabase
        .from('sales_orders')
        .select(`
          id,
          created_at,
          total_amount,
          payment_method,
          payment_status,
          channel,
          sales_order_items(id)
        `)
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (error) throw error
      
      // Formatear los datos
      const formattedSales = data.map(sale => ({
        id: sale.id,
        date: sale.created_at,
        total: sale.total_amount,
        items: sale.sales_order_items.length,
        paymentMethod: sale.payment_method,
        status: sale.payment_status,
        channel: sale.channel
      }))
      
      setRecentSales(formattedSales)
    } catch (error) {
      console.error("Error al cargar ventas recientes:", error)
    } finally {
      setIsLoadingRecentSales(false)
    }
  }

  // Efecto para cargar los datos al montar el componente
  useEffect(() => {
    loadData()
  }, [loadData])

  // Filtrar productos por categoría y búsqueda
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  // Agregar producto al carrito
  const addToCart = (product) => {
    const existingItem = cartItems.find(item => item.id === product.id)
    
    if (existingItem) {
      setCartItems(cartItems.map(item => 
        item.id === product.id 
          ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price } 
          : item
      ))
    } else {
      // Determinar qué precio usar según el canal
      let price = product.price || 0
      if (orderChannel === "pedidosya" && product.price_pedidosya) {
        price = product.price_pedidosya
      } else if (orderChannel === "rappi" && product.price_rappi) {
        price = product.price_rappi
      }
      
      setCartItems([...cartItems, { 
        id: product.id, 
        name: product.name, 
        price: price,
        quantity: 1,
        subtotal: price
      }])
    }
  }

  // Incrementar cantidad de un producto en el carrito
  const incrementQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id 
        ? { ...item, quantity: item.quantity + 1, subtotal: (item.quantity + 1) * item.price } 
        : item
    ))
  }

  // Decrementar cantidad de un producto en el carrito
  const decrementQuantity = (id) => {
    setCartItems(cartItems.map(item => 
      item.id === id && item.quantity > 1
        ? { ...item, quantity: item.quantity - 1, subtotal: (item.quantity - 1) * item.price } 
        : item
    ).filter(item => item.quantity > 0))
  }

  // Eliminar producto del carrito
  const removeFromCart = (id) => {
    setCartItems(cartItems.filter(item => item.id !== id))
  }

  // Calcular total
  const total = cartItems.reduce((sum, item) => sum + item.subtotal, 0)

  // Procesar venta
  const processSale = async () => {
    if (cartItems.length === 0) {
      setErrorMessage("No hay productos en el carrito")
      return
    }
    
    if (!paymentMethod) {
      setErrorMessage("Selecciona un método de pago")
      return
    }
    
    setIsSaving(true)
    setErrorMessage("")
    
    try {
      // 1. Crear la venta en la tabla sales_orders
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          total_amount: total,
          payment_method: paymentMethod,
          payment_status: paymentConfirmed ? 'completed' : 'pending',
          channel: orderChannel,
          created_by: "encargado" // Idealmente, usar el ID o nombre del usuario actual
        })
        .select()
      
      if (orderError) throw orderError
      
      const orderId = orderData[0].id
      
      // 2. Crear los items de la venta
      const orderItems = cartItems.map(item => ({
        order_id: orderId,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.subtotal
      }))
      
      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(orderItems)
      
      if (itemsError) throw itemsError
      
      // 3. Actualizar el inventario
      for (const item of cartItems) {
        const { error: inventoryError } = await supabase
          .rpc('update_inventory_after_sale', { 
            p_product_id: item.id, 
            p_quantity: item.quantity 
          })
        
        if (inventoryError) {
          console.error("Error al actualizar inventario:", inventoryError)
          // Continuar con los demás productos
        }
      }
      
      // Limpiar carrito y mostrar mensaje de éxito
      setCartItems([])
      setPaymentMethod("")
      setPaymentConfirmed(false)
      setSuccessMessage(`Venta #${orderId} registrada correctamente`)
      
      // Recargar ventas recientes
      loadRecentSales()
      
    } catch (error) {
      console.error("Error al procesar venta:", error)
      setErrorMessage("Error al procesar la venta. Intenta nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

  // Generar factura
  const generateInvoice = async () => {
    if (!cartItems.length) {
      setErrorMessage("No hay productos para facturar")
      return
    }
    
    setIsSaving(true)
    
    try {
      // Aquí iría la lógica para generar la factura electrónica
      // Esto podría ser una llamada a un servicio externo o a una API interna
      
      // Por ahora, simplemente registramos la solicitud de factura
      const { data, error } = await supabase
        .from('invoices')
        .insert({
          total_amount: total,
          items: cartItems,
          status: 'pending'
        })
        .select()
      
      if (error) throw error
      
      setSuccessMessage(`Factura #${data[0].id} generada correctamente`)
    } catch (error) {
      console.error("Error al generar factura:", error)
      setErrorMessage("Error al generar la factura. Intenta nuevamente.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Encabezado */}
      <header className="bg-primary text-primary-foreground p-4">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              className="mr-2 text-primary-foreground"
              onClick={() => router.push('/ventas')}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Punto de Venta</h1>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary-foreground"
              onClick={loadData}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="text-primary-foreground"
              onClick={() => router.push('/ventas/historial')}
            >
              Ver Historial
            </Button>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="container mx-auto p-4">
        {/* Mensajes de éxito o error */}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4 flex items-center">
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
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 flex items-center">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Panel de productos */}
          <div className="md:col-span-2 space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4 mb-4">
                  {/* Selector de canal */}
                  <div className="w-full md:w-1/3">
                    <Label htmlFor="channel">Canal de Venta</Label>
                    <Select 
                      value={orderChannel} 
                      onValueChange={setOrderChannel}
                    >
                      <SelectTrigger id="channel">
                        <SelectValue placeholder="Seleccionar canal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Local</SelectItem>
                        <SelectItem value="pedidosya">PedidosYa</SelectItem>
                        <SelectItem value="rappi">Rappi</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Búsqueda */}
                  <div className="w-full md:w-2/3">
                    <Label htmlFor="search">Buscar Producto</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="search"
                        placeholder="Nombre del producto..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
                
                {/* Categorías */}
                <div className="mb-4">
                  <Tabs defaultValue="all" value={selectedCategory} onValueChange={setSelectedCategory}>
                    <TabsList className="w-full overflow-x-auto flex-nowrap">
                      <TabsTrigger value="all">Todos</TabsTrigger>
                      {categories.map((category) => (
                        <TabsTrigger key={category} value={category}>
                          {category}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </Tabs>
                </div>
                
                {/* Lista de productos */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {isLoading ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <Card key={index} className="animate-pulse">
                        <CardContent className="p-4 text-center">
                          <div className="h-5 bg-gray-200 rounded mb-2"></div>
                          <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-2"></div>
                          <div className="h-6 bg-gray-200 rounded w-1/2 mx-auto"></div>
                        </CardContent>
                      </Card>
                    ))
                  ) : filteredProducts.length === 0 ? (
                    <p className="col-span-full text-center text-muted-foreground py-8">
                      No se encontraron productos
                    </p>
                  ) : (
                    filteredProducts.map((product) => (
                      <Card 
                        key={product.id} 
                        className="cursor-pointer hover:bg-accent transition-colors"
                        onClick={() => addToCart(product)}
                      >
                        <CardContent className="p-4 text-center">
                          <div className="font-medium truncate">{product.name}</div>
                          <div className="text-sm text-muted-foreground truncate">
                            {product.category}
                          </div>
                          <div className="mt-2 font-bold">
                            ${orderChannel === "pedidosya" && product.price_pedidosya 
                              ? product.price_pedidosya.toFixed(2) 
                              : orderChannel === "rappi" && product.price_rappi 
                                ? product.price_rappi.toFixed(2)
                                : product.price?.toFixed(2) || "0.00"}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Stock: {product.stock}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Panel del carrito */}
          <div className="space-y-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center">
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    Carrito
                  </h2>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setCartItems([])}
                    disabled={cartItems.length === 0}
                  >
                    Limpiar
                  </Button>
                </div>
                
                {/* Items del carrito */}
                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No hay productos en el carrito
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => (
                      <div key={item.id} className="flex justify-between items-center border-b pb-2">
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            ${item.price.toFixed(2)} x {item.quantity}
                          </div>
                        </div>
                        <div className="font-bold mr-4">
                          ${item.subtotal.toFixed(2)}
                        </div>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => decrementQuantity(item.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8"
                            onClick={() => incrementQuantity(item.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Total */}
                    <div className="flex justify-between items-center pt-2 border-t">
                      <div className="font-bold text-lg">Total:</div>
                      <div className="font-bold text-lg">${total.toFixed(2)}</div>
                    </div>
                  </div>
                )}
                
                {/* Opciones de pago */}
                <div className="mt-6 space-y-4">
                  <div>
                    <Label htmlFor="payment-method">Método de Pago</Label>
                    <Select 
                      value={paymentMethod} 
                      onValueChange={setPaymentMethod}
                    >
                      <SelectTrigger id="payment-method">
                        <SelectValue placeholder="Seleccionar método" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                        <SelectItem value="mercadopago">MercadoPago</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Confirmación de pago */}
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="payment-confirmed"
                      checked={paymentConfirmed}
                      onChange={() => setPaymentConfirmed(!paymentConfirmed)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor="payment-confirmed" className="text-sm">
                      Pago confirmado
                    </Label>
                  </div>
                  
                  {/* Botones de acción */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button 
                      variant="default" 
                      className="w-full"
                      disabled={cartItems.length === 0 || isSaving}
                      onClick={processSale}
                    >
                      {isSaving ? "Procesando..." : "Finalizar Venta"}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={cartItems.length === 0 || isSaving}
                      onClick={generateInvoice}
                    >
                      <Receipt className="mr-2 h-4 w-4" />
                      Facturar
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Ventas recientes */}
        <div className="mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Ventas Recientes</h2>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={loadRecentSales}
                  disabled={isLoadingRecentSales}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingRecentSales ? 'animate-spin' : ''}`} />
                  Actualizar
                </Button>
              </div>
              
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Canal</TableHead>
                      <TableHead>Método de Pago</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-center">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoadingRecentSales ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          Cargando ventas recientes...
                        </TableCell>
                      </TableRow>
                    ) : recentSales.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-4">
                          No hay ventas recientes
                        </TableCell>
                      </TableRow>
                    ) : (
                      recentSales.map((sale) => (
                        <TableRow key={sale.id}>
                          <TableCell>{sale.id}</TableCell>
                          <TableCell>{new Date(sale.date).toLocaleString()}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              sale.channel === "local" 
                                ? "bg-blue-100 text-blue-800" 
                                : sale.channel === "pedidosya"
                                  ? "bg-[#FF5A5F]/20 text-[#FF5A5F]"
                                  : "bg-[#FF9500]/20 text-[#FF9500]"
                            }`}>
                              {sale.channel}
                            </span>
                          </TableCell>
                          <TableCell>{sale.paymentMethod}</TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded text-xs ${
                              sale.status === "completed" 
                                ? "bg-green-100 text-green-800" 
                                : "bg-yellow-100 text-yellow-800"
                            }`}>
                              {sale.status === "completed" ? "Pagado" : "Pendiente"}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ${sale.total.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Link href={`/ventas/detalle/${sale.id}`}>
                              <Button variant="ghost" size="sm">
                                Ver
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}