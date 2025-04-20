import { supabase } from "@/lib/db"

export interface Category {
id: string
name: string
description?: string
createdAt: string
updatedAt: string
}

export interface ProductPrice {
id: string
productId: string
channel: string
price: number
createdAt: string
updatedAt: string
}

export interface Product {
id: string
name: string
description?: string
categoryId?: string
category?: Category
imageUrl?: string
isActive: boolean
parentId?: string
isVariant: boolean
variantName?: string
createdAt: string
updatedAt: string
prices?: ProductPrice[]
variants?: Product[]
}

export interface InventoryItem {
  id: string
  productId: string
  product?: Product
  quantity: number
  minQuantity: number
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  product?: Product
  quantity: number
  type: 'in' | 'out'
  reason: string
  createdBy: string
  createdAt: string
}

export interface StockAlert {
  id: string
  productId: string
  product?: Product
  currentQuantity: number
  minQuantity: number
  status: 'pending' | 'resolved'
  createdAt: string
  resolvedAt?: string
}

// Función auxiliar para convertir snake_case a camelCase
function objectToCamelCase(obj: any): any {
if (typeof obj !== "object" || obj === null) {
  return obj
}

if (Array.isArray(obj)) {
  return obj.map((item) => objectToCamelCase(item))
}

const newObj: any = {}
for (const key in obj) {
  if (obj.hasOwnProperty(key)) {
    const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase())
    newObj[camelCaseKey] = objectToCamelCase(obj[key])
  }
}
return newObj
}

// Función auxiliar para convertir camelCase a snake_case
function objectToSnakeCase(obj: any): any {
if (typeof obj !== "object" || obj === null) {
  return obj
}

if (Array.isArray(obj)) {
  return obj.map((item) => objectToSnakeCase(item))
}

const newObj: any = {}
for (const key in obj) {
  if (obj.hasOwnProperty(key)) {
    const snakeCaseKey = key.replace(/([A-Z])/g, (match) => `_${match.toLowerCase()}`)
    newObj[snakeCaseKey] = objectToSnakeCase(obj[key])
  }
}
return newObj
}

export class SalesService {
// Categorías
async getCategories() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase.from("sales_categories").select("*").order("name")

    if (error) throw error

    return (data || []).map((category) => objectToCamelCase(category))
  } catch (error) {
    console.error("Error al obtener categorías:", error)
    return []
  }
}

async getCategoryById(id: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return null
    }

    const { data, error } = await supabase.from("sales_categories").select("*").eq("id", id).single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error(`Error al obtener categoría con ID ${id}:`, error)
    return null
  }
}

// Productos
async getProducts() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase
      .from("sales_products")
      .select("*")
      .is("is_variant", false)
      .order("name")

    if (error) throw error

    return (data || []).map((product) => objectToCamelCase(product))
  } catch (error) {
    console.error("Error al obtener productos:", error)
    return []
  }
}

async getProductById(id: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return null
    }

    const { data, error } = await supabase.from("sales_products").select("*").eq("id", id).single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error(`Error al obtener producto con ID ${id}:`, error)
    return null
  }
}

async getProductWithPrices(id: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return null
    }

    const { data, error } = await supabase.from("sales_products").select("*").eq("id", id).single()

    if (error) throw error

    const product = objectToCamelCase(data)

    // Obtener precios
    const prices = await this.getProductPrices(id)
    product.prices = prices

    return product
  } catch (error) {
    console.error(`Error al obtener producto con precios para ID ${id}:`, error)
    return null
  }
}

async createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()
    const productData = objectToSnakeCase({
      ...product,
      created_at: now,
      updated_at: now,
    })

    const { data, error } = await supabase.from("sales_products").insert([productData]).select().single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error("Error al crear producto:", error)
    throw error
  }
}

async updateProduct(id: string, product: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()
    const productData = objectToSnakeCase({
      ...product,
      updated_at: now,
    })

    const { data, error } = await supabase
      .from("sales_products")
      .update(productData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error(`Error al actualizar producto con ID ${id}:`, error)
    throw error
  }
}

async deleteProduct(id: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const { error } = await supabase.from("sales_products").delete().eq("id", id)

    if (error) throw error

    return true
  } catch (error) {
    console.error(`Error al eliminar producto con ID ${id}:`, error)
    throw error
  }
}

// Productos con variantes
async getProductsWithVariants() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    // Primero obtenemos todos los productos principales (no variantes)
    const { data: mainProducts, error: mainError } = await supabase
      .from("sales_products")
      .select(`
        *,
        category:sales_categories(*)
      `)
      .is("is_variant", false)
      .order("name");

    if (mainError) throw mainError;

    // Ahora obtenemos todas las variantes en una sola consulta
    const { data: allVariants, error: variantsError } = await supabase
      .from("sales_products")
      .select("*")
      .eq("is_variant", true);

    if (variantsError) throw variantsError;

    // Agrupamos las variantes por parent_id
    const variantsByParent: Record<string, any[]> = {};
    if (allVariants) {
      allVariants.forEach(variant => {
        if (variant.parent_id) {
          if (!variantsByParent[variant.parent_id]) {
            variantsByParent[variant.parent_id] = [];
          }
          variantsByParent[variant.parent_id].push(variant);
        }
      });
    }

    // Asignamos las variantes a cada producto principal
    const productsWithVariants = mainProducts.map(product => {
      const productData = objectToCamelCase(product);
      if (productData.category) {
        productData.category = objectToCamelCase(productData.category);
      }
      
      // Asignamos las variantes correspondientes
      productData.variants = (variantsByParent[product.id] || []).map(
        variant => objectToCamelCase(variant)
      );
      
      return productData;
    });

    return productsWithVariants;
  } catch (error) {
    console.error("Error al obtener productos con variantes:", error);
    return [];
  }
}

async getProductVariants(productId: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase
      .from("sales_products")
      .select("*")
      .eq("parent_id", productId)
      .eq("is_variant", true)
      .order("variant_name")

    if (error) throw error

    return (data || []).map((variant) => objectToCamelCase(variant))
  } catch (error) {
    console.error(`Error al obtener variantes para producto ${productId}:`, error)
    return []
  }
}

async createProductVariant(
  parentId: string,
  variant: Omit<Product, "id" | "createdAt" | "updatedAt" | "isVariant" | "parentId">,
) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()
    const variantData = objectToSnakeCase({
      ...variant,
      parent_id: parentId,
      is_variant: true,
      created_at: now,
      updated_at: now,
    })

    const { data, error } = await supabase.from("sales_products").insert([variantData]).select().single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error(`Error al crear variante para producto ${parentId}:`, error)
    throw error
  }
}

// Precios
async getProductPrices(productId: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase.from("sales_product_prices").select("*").eq("product_id", productId)

    if (error) throw error

    return (data || []).map((price) => objectToCamelCase(price))
  } catch (error) {
    console.error(`Error al obtener precios para producto ${productId}:`, error)
    return []
  }
}

async setProductPrice(productId: string, channel: string, price: number) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()

    // Verificar si ya existe un precio para este canal
    const { data: existingPrice, error: queryError } = await supabase
      .from("sales_product_prices")
      .select("*")
      .eq("product_id", productId)
      .eq("channel", channel)
      .maybeSingle()

    if (queryError) throw queryError

    if (existingPrice) {
      // Actualizar precio existente
      const { data, error } = await supabase
        .from("sales_product_prices")
        .update({
          price,
          updated_at: now,
        })
        .eq("id", existingPrice.id)
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    } else {
      // Crear nuevo precio
      const { data, error } = await supabase
        .from("sales_product_prices")
        .insert([
          {
            product_id: productId,
            channel,
            price,
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    }
  } catch (error) {
    console.error(`Error al establecer precio para producto ${productId} en canal ${channel}:`, error)
    throw error
  }
}

// INVENTARIO
  
// Obtener inventario de todos los productos
async getInventory() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase
      .from("sales_inventory")
      .select(`
        *,
        product:sales_products(*)
      `)
      .order("updated_at", { ascending: false })

    if (error) throw error

    return (data || []).map((item) => {
      const inventoryItem = objectToCamelCase(item)
      if (inventoryItem.product) {
        inventoryItem.product = objectToCamelCase(inventoryItem.product)
      }
      return inventoryItem
    })
  } catch (error) {
    console.error("Error al obtener inventario:", error)
    return []
  }
}

// Obtener inventario de un producto específico
async getProductInventory(productId: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return null
    }

    const { data, error } = await supabase
      .from("sales_inventory")
      .select(`
        *,
        product:sales_products(*)
      `)
      .eq("product_id", productId)
      .single()

    if (error) {
      if (error.code === "PGRST116") {
        // No se encontró inventario para este producto
        return null
      }
      throw error
    }

    const inventoryItem = objectToCamelCase(data)
    if (inventoryItem.product) {
      inventoryItem.product = objectToCamelCase(inventoryItem.product)
    }
    
    return inventoryItem
  } catch (error) {
    console.error(`Error al obtener inventario para producto ${productId}:`, error)
    return null
  }
}

// Establecer o actualizar el inventario de un producto
async setProductInventory(productId: string, quantity: number, minQuantity: number) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()

    // Verificar si ya existe un registro de inventario para este producto
    const { data: existingInventory, error: queryError } = await supabase
      .from("sales_inventory")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle()

    if (queryError) throw queryError

    if (existingInventory) {
      // Actualizar inventario existente
      const { data, error } = await supabase
        .from("sales_inventory")
        .update({
          quantity,
          min_quantity: minQuantity,
          updated_at: now,
        })
        .eq("id", existingInventory.id)
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    } else {
      // Crear nuevo registro de inventario
      const { data, error } = await supabase
        .from("sales_inventory")
        .insert([
          {
            product_id: productId,
            quantity,
            min_quantity: minQuantity,
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    }
  } catch (error) {
    console.error(`Error al establecer inventario para producto ${productId}:`, error)
    throw error
  }
}

// Registrar un movimiento de inventario (entrada o salida)
async registerInventoryMovement(
  productId: string, 
  quantity: number, 
  type: 'in' | 'out', 
  reason: string, 
  createdBy: string
) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()

    // 1. Registrar el movimiento
    const { data: movementData, error: movementError } = await supabase
      .from("sales_inventory_movements")
      .insert([
        {
          product_id: productId,
          quantity: Math.abs(quantity), // Siempre almacenar como positivo
          type,
          reason,
          created_by: createdBy,
          created_at: now,
        },
      ])
      .select()
      .single()

    if (movementError) throw movementError

    // 2. Actualizar el inventario
    // Primero obtener el inventario actual
    const { data: currentInventory, error: inventoryError } = await supabase
      .from("sales_inventory")
      .select("*")
      .eq("product_id", productId)
      .maybeSingle()

    if (inventoryError) throw inventoryError

    let newQuantity = 0
    
    if (currentInventory) {
      // Calcular nueva cantidad
      newQuantity = type === 'in' 
        ? currentInventory.quantity + Math.abs(quantity)
        : currentInventory.quantity - Math.abs(quantity)
      
      // Asegurar que no sea negativo
      newQuantity = Math.max(0, newQuantity)
      
      // Actualizar inventario
      const { error: updateError } = await supabase
        .from("sales_inventory")
        .update({
          quantity: newQuantity,
          updated_at: now,
        })
        .eq("id", currentInventory.id)

      if (updateError) throw updateError
    } else {
      // Si no existe inventario, crearlo
      newQuantity = type === 'in' ? Math.abs(quantity) : 0
      
      const { error: createError } = await supabase
        .from("sales_inventory")
        .insert([
          {
            product_id: productId,
            quantity: newQuantity,
            min_quantity: 0, // Valor por defecto
            created_at: now,
            updated_at: now,
          },
        ])

      if (createError) throw createError
    }

    // 3. Verificar si se debe crear una alerta de stock bajo
    if (currentInventory && newQuantity < currentInventory.min_quantity) {
      await this.createStockAlert(productId, newQuantity, currentInventory.min_quantity)
    }

    return {
      movement: objectToCamelCase(movementData),
      newQuantity,
    }
  } catch (error) {
    console.error(`Error al registrar movimiento de inventario para producto ${productId}:`, error)
    throw error
  }
}

// Obtener movimientos de inventario
async getInventoryMovements(productId?: string, limit = 100) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    let query = supabase
      .from("sales_inventory_movements")
      .select(`
        *,
        product:sales_products(*)
      `)
      .order("created_at", { ascending: false })
      .limit(limit)

    if (productId) {
      query = query.eq("product_id", productId)
    }

    const { data, error } = await query

    if (error) throw error

    return (data || []).map((movement) => {
      const movementData = objectToCamelCase(movement)
      if (movementData.product) {
        movementData.product = objectToCamelCase(movementData.product)
      }
      return movementData
    })
  } catch (error) {
    console.error("Error al obtener movimientos de inventario:", error)
    return []
  }
}

// Alertas de stock
async createStockAlert(productId: string, currentQuantity: number, minQuantity: number) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()

    // Verificar si ya existe una alerta pendiente para este producto
    const { data: existingAlert, error: queryError } = await supabase
      .from("sales_stock_alerts")
      .select("*")
      .eq("product_id", productId)
      .eq("status", "pending")
      .maybeSingle()

    if (queryError) throw queryError

    if (existingAlert) {
      // Actualizar alerta existente
      const { data, error } = await supabase
        .from("sales_stock_alerts")
        .update({
          current_quantity: currentQuantity,
          updated_at: now,
        })
        .eq("id", existingAlert.id)
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    } else {
      // Crear nueva alerta
      const { data, error } = await supabase
        .from("sales_stock_alerts")
        .insert([
          {
            product_id: productId,
            current_quantity: currentQuantity,
            min_quantity: minQuantity,
            status: "pending",
            created_at: now,
          },
        ])
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    }
  } catch (error) {
    console.error(`Error al crear alerta de stock para producto ${productId}:`, error)
    throw error
  }
}

async getActiveStockAlerts() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    const { data, error } = await supabase
      .from("sales_stock_alerts")
      .select(`
        *,
        product:sales_products(*)
      `)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error) throw error

    return (data || []).map((alert) => {
      const stockAlert = objectToCamelCase(alert)
      if (stockAlert.product) {
        stockAlert.product = objectToCamelCase(stockAlert.product)
      }
      return stockAlert
    })
  } catch (error) {
    console.error("Error al obtener alertas de stock activas:", error)
    return []
  }
}

async resolveStockAlert(alertId: string) {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      throw new Error("No se puede conectar a la base de datos")
    }

    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from("sales_stock_alerts")
      .update({
        status: "resolved",
        resolved_at: now,
      })
      .eq("id", alertId)
      .select()
      .single()

    if (error) throw error

    return objectToCamelCase(data)
  } catch (error) {
    console.error(`Error al resolver alerta de stock ${alertId}:`, error)
    throw error
  }
}

// Productos sin inventario registrado
async getProductsWithoutInventory() {
  try {
    if (!supabase) {
      console.error("El cliente de Supabase no está disponible")
      return []
    }

    // Obtener todos los productos
    const { data: products, error: productsError } = await supabase
      .from("sales_products")
      .select("*")
      .is("is_variant", false)
      .order("name")

    if (productsError) throw productsError

    // Obtener todos los productos que ya tienen inventario
    const { data: inventory, error: inventoryError } = await supabase
      .from("sales_inventory")
      .select("product_id")

    if (inventoryError) throw inventoryError

    // Crear un conjunto de IDs de productos con inventario
    const productsWithInventory = new Set(inventory?.map(item => item.product_id) || [])

    // Filtrar productos sin inventario
    const productsWithoutInventory = products?.filter(product => !productsWithInventory.has(product.id)) || []

    return productsWithoutInventory.map(product => objectToCamelCase(product))
  } catch (error) {
    console.error("Error al obtener productos sin inventario:", error)
    return []
  }
}
}

// Exportar una instancia del servicio
export const salesService = new SalesService()