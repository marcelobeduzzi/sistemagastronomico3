import type { SupabaseClient } from "@supabase/supabase-js"
import { objectToCamelCase, objectToSnakeCase } from "./utils"

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

export interface Inventory {
  id: string
  productId: string
  quantity: number
  minQuantity: number
  createdAt: string
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  quantity: number
  type: "in" | "out"
  reason: string
  createdBy: string
  createdAt: string
}

export interface Sale {
  id: string
  channel: string
  total: number
  status: string
  createdBy: string
  createdAt: string
  updatedAt: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  price: number
  subtotal: number
  createdAt: string
}

export interface Combo {
  id: string
  name: string
  description?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  items?: ComboItem[]
  prices?: ProductPrice[]
}

export interface ComboItem {
  id: string
  comboId: string
  productId: string
  quantity: number
  createdAt: string
}

export interface StockAlert {
  id: string
  productId: string
  product?: Product
  currentQuantity: number
  minQuantity: number
  status: "pending" | "resolved"
  createdAt: string
  resolvedAt?: string
}

export class SalesService {
  supabase: SupabaseClient

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient
  }

  // Categorías
  async getCategories() {
    try {
      const { data, error } = await this.supabase.from("sales_categories").select("*").order("name")

      if (error) throw error

      return (data || []).map((category) => objectToCamelCase(category))
    } catch (error) {
      console.error("Error al obtener categorías:", error)
      throw error
    }
  }

  async getCategoryById(id: string) {
    try {
      const { data, error } = await this.supabase.from("sales_categories").select("*").eq("id", id).single()

      if (error) throw error

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al obtener categoría con ID ${id}:`, error)
      throw error
    }
  }

  // Productos
  async getProducts() {
    try {
      const { data, error } = await this.supabase
        .from("sales_products")
        .select("*")
        .is("is_variant", false)
        .order("name")

      if (error) throw error

      return (data || []).map((product) => objectToCamelCase(product))
    } catch (error) {
      console.error("Error al obtener productos:", error)
      throw error
    }
  }

  async getProductById(id: string) {
    try {
      const { data, error } = await this.supabase.from("sales_products").select("*").eq("id", id).single()

      if (error) throw error

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al obtener producto con ID ${id}:`, error)
      throw error
    }
  }

  async getProductWithPrices(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_products")
        .select("*")
        .eq("id", id)
        .single()

      if (error) throw error

      const product = objectToCamelCase(data)

      // Obtener precios
      const prices = await this.getProductPrices(id)
      product.prices = prices

      return product
    } catch (error) {
      console.error(`Error al obtener producto con precios para ID ${id}:`, error)
      throw error
    }
  }

  async createProduct(product: Omit<Product, "id" | "createdAt" | "updatedAt">) {
    try {
      const now = new Date().toISOString()
      const productData = objectToSnakeCase({
        ...product,
        created_at: now,
        updated_at: now,
      })

      const { data, error } = await this.supabase.from("sales_products").insert([productData]).select().single()

      if (error) throw error

      return objectToCamelCase(data)
    } catch (error) {
      console.error("Error al crear producto:", error)
      throw error
    }
  }

  async updateProduct(id: string, product: Partial<Omit<Product, "id" | "createdAt" | "updatedAt">>) {
    try {
      const now = new Date().toISOString()
      const productData = objectToSnakeCase({
        ...product,
        updated_at: now,
      })

      const { data, error } = await this.supabase
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
      const { error } = await this.supabase.from("sales_products").delete().eq("id", id)

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
      // Obtener productos principales (no variantes)
      const { data, error } = await this.supabase
        .from("sales_products")
        .select(`
          *,
          category:sales_categories(*),
          variants:sales_products(*)
        `)
        .is("parent_id", null)
        .order("name")

      if (error) throw error

      return (data || []).map((product) => {
        const productData = objectToCamelCase(product)
        if (productData.category) {
          productData.category = objectToCamelCase(productData.category)
        }
        if (productData.variants) {
          productData.variants = productData.variants.map((variant: any) => objectToCamelCase(variant))
        }
        return productData
      })
    } catch (error) {
      console.error("Error al obtener productos con variantes:", error)
      throw error
    }
  }

  async getProductVariants(productId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_products")
        .select("*")
        .eq("parent_id", productId)
        .order("variant_name")

      if (error) throw error

      return (data || []).map((variant) => objectToCamelCase(variant))
    } catch (error) {
      console.error(`Error al obtener variantes para producto ${productId}:`, error)
      throw error
    }
  }

  async createProductVariant(
    parentId: string,
    variant: Omit<Product, "id" | "createdAt" | "updatedAt" | "isVariant" | "parentId">
  ) {
    try {
      const now = new Date().toISOString()
      const variantData = objectToSnakeCase({
        ...variant,
        parent_id: parentId,
        is_variant: true,
        created_at: now,
        updated_at: now,
      })

      const { data, error } = await this.supabase.from("sales_products").insert([variantData]).select().single()

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
      const { data, error } = await this.supabase
        .from("sales_product_prices")
        .select("*")
        .eq("product_id", productId)

      if (error) throw error

      return (data || []).map((price) => objectToCamelCase(price))
    } catch (error) {
      console.error(`Error al obtener precios para producto ${productId}:`, error)
      throw error
    }
  }

  async setProductPrice(productId: string, channel: string, price: number) {
    try {
      const now = new Date().toISOString()

      // Verificar si ya existe un precio para este canal
      const { data: existingPrice, error: queryError } = await this.supabase
        .from("sales_product_prices")
        .select("*")
        .eq("product_id", productId)
        .eq("channel", channel)
        .maybeSingle()

      if (queryError) throw queryError

      if (existingPrice) {
        // Actualizar precio existente
        const { data, error } = await this.supabase
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
        const { data, error } = await this.supabase
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

  // Inventario
  async getInventory() {
    try {
      const { data, error } = await this.supabase
        .from("sales_inventory")
        .select(`
          *,
          product:sales_products(*)
        `)
        .order("created_at", { ascending: false })

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
      throw error
    }
  }

  async getProductInventory(productId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_inventory")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle()

      if (error) throw error

      return data ? objectToCamelCase(data) : null
    } catch (error) {
      console.error(`Error al obtener inventario para producto ${productId}:`, error)
      throw error
    }
  }

  async updateInventory(productId: string, quantity: number, minQuantity: number) {
    try {
      const now = new Date().toISOString()

      // Verificar si ya existe un registro de inventario para este producto
      const { data: existingInventory, error: queryError } = await this.supabase
        .from("sales_inventory")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle()

      if (queryError) throw queryError

      if (existingInventory) {
        // Actualizar inventario existente
        const { data, error } = await this.supabase
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
        const { data, error } = await this.supabase
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
      console.error(`Error al actualizar inventario para producto ${productId}:`, error)
      throw error
    }
  }

  async addInventoryMovement(
    productId: string,
    quantity: number,
    type: "in" | "out",
    reason: string,
    createdBy: string
  ) {
    try {
      const now = new Date().toISOString()

      // Registrar movimiento
      const { data: movementData, error: movementError } = await this.supabase
        .from("sales_inventory_movements")
        .insert([
          {
            product_id: productId,
            quantity: Math.abs(quantity),
            type,
            reason,
            created_by: createdBy,
            created_at: now,
          },
        ])
        .select()
        .single()

      if (movementError) throw movementError

      // Actualizar cantidad en inventario
      const { data: inventoryData, error: inventoryError } = await this.supabase
        .from("sales_inventory")
        .select("*")
        .eq("product_id", productId)
        .maybeSingle()

      if (inventoryError) throw inventoryError

      const inventoryQuantity = inventoryData ? inventoryData.quantity : 0
      const newQuantity = type === "in" ? inventoryQuantity + quantity : inventoryQuantity - quantity

      await this.updateInventory(productId, newQuantity, inventoryData?.min_quantity || 0)

      return objectToCamelCase(movementData)
    } catch (error) {
      console.error(`Error al registrar movimiento de inventario para producto ${productId}:`, error)
      throw error
    }
  }

  // Ventas
  async getSales() {
    try {
      const { data, error } = await this.supabase
        .from("sales_sales")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((sale) => objectToCamelCase(sale))
    } catch (error) {
      console.error("Error al obtener ventas:", error)
      throw error
    }
  }

  async getSaleById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_sales")
        .select(`
          *,
          items:sales_sale_items(
            *,
            product:sales_products(*)
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      const sale = objectToCamelCase(data)
      if (sale.items) {
        sale.items = sale.items.map((item: any) => {
          const saleItem = objectToCamelCase(item)
          if (saleItem.product) {
            saleItem.product = objectToCamelCase(saleItem.product)
          }
          return saleItem
        })
      }

      return sale
    } catch (error) {
      console.error(`Error al obtener venta con ID ${id}:`, error)
      throw error
    }
  }

  async createSale(
    channel: string,
    items: Array<{ productId: string; quantity: number; price: number }>,
    createdBy: string
  ) {
    try {
      const now = new Date().toISOString()

      // Calcular total
      const total = items.reduce((sum, item) => sum + item.quantity * item.price, 0)

      // Crear venta
      const { data: saleData, error: saleError } = await this.supabase
        .from("sales_sales")
        .insert([
          {
            channel,
            total,
            status: "completed",
            created_by: createdBy,
            created_at: now,
            updated_at: now,
          },
        ])
        .select()
        .single()

      if (saleError) throw saleError

      const saleId = saleData.id

      // Crear items de venta
      const saleItems = items.map((item) => ({
        sale_id: saleId,
        product_id: item.productId,
        quantity: item.quantity,
        price: item.price,
        subtotal: item.quantity * item.price,
        created_at: now,
      }))

      const { data: itemsData, error: itemsError } = await this.supabase
        .from("sales_sale_items")
        .insert(saleItems)
        .select()

      if (itemsError) throw itemsError

      // Actualizar inventario
      for (const item of items) {
        await this.addInventoryMovement(
          item.productId,
          item.quantity,
          "out",
          `Venta #${saleId}`,
          createdBy
        )
      }

      return objectToCamelCase(saleData)
    } catch (error) {
      console.error("Error al crear venta:", error)
      throw error
    }
  }

  // Combos
  async getCombos() {
    try {
      const { data, error } = await this.supabase.from("sales_combos").select("*").order("name")

      if (error) throw error

      return (data || []).map((combo) => objectToCamelCase(combo))
    } catch (error) {
      console.error("Error al obtener combos:", error)
      throw error
    }
  }

  async getComboById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_combos")
        .select(`
          *,
          items:sales_combo_items(
            *,
            product:sales_products(*)
          )
        `)
        .eq("id", id)
        .single()

      if (error) throw error

      const combo = objectToCamelCase(data)
      if (combo.items) {
        combo.items = combo.items.map((item: any) => {
          const comboItem = objectToCamelCase(item)
          if (comboItem.product) {
            comboItem.product = objectToCamelCase(comboItem.product)
          }
          return comboItem
        })
      }

      // Obtener precios
      const prices = await this.getComboPrices(id)
      combo.prices = prices

      return combo
    } catch (error) {
      console.error(`Error al obtener combo con ID ${id}:`, error)
      throw error
    }
  }

  async createCombo(combo: Omit<Combo, "id" | "createdAt" | "updatedAt">) {
    try {
      const now = new Date().toISOString()
      const comboData = objectToSnakeCase({
        ...combo,
        created_at: now,
        updated_at: now,
      })

      // Eliminar items si existen
      const { items, ...comboWithoutItems } = comboData

      const { data, error } = await this.supabase
        .from("sales_combos")
        .insert([comboWithoutItems])
        .select()
        .single()

      if (error) throw error

      const comboId = data.id

      // Crear items si existen
      if (items && items.length > 0) {
        const comboItems = items.map((item: any) => ({
          combo_id: comboId,
          product_id: item.product_id,
          quantity: item.quantity,
          created_at: now,
        }))

        await this.supabase.from("sales_combo_items").insert(comboItems)
      }

      return objectToCamelCase(data)
    } catch (error) {
      console.error("Error al crear combo:", error)
      throw error
    }
  }

  async updateCombo(id: string, combo: Partial<Omit<Combo, "id" | "createdAt" | "updatedAt">>) {
    try {
      const now = new Date().toISOString()
      const comboData = objectToSnakeCase({
        ...combo,
        updated_at: now,
      })

      // Eliminar items si existen
      const { items, ...comboWithoutItems } = comboData

      const { data, error } = await this.supabase
        .from("sales_combos")
        .update(comboWithoutItems)
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      // Actualizar items si existen
      if (items) {
        // Eliminar items existentes
        await this.supabase.from("sales_combo_items").delete().eq("combo_id", id)

        // Crear nuevos items
        if (items.length > 0) {
          const comboItems = items.map((item: any) => ({
            combo_id: id,
            product_id: item.product_id,
            quantity: item.quantity,
            created_at: now,
          }))

          await this.supabase.from("sales_combo_items").insert(comboItems)
        }
      }

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al actualizar combo con ID ${id}:`, error)
      throw error
    }
  }

  async deleteCombo(id: string) {
    try {
      const { error } = await this.supabase.from("sales_combos").delete().eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error(`Error al eliminar combo con ID ${id}:`, error)
      throw error
    }
  }

  async getComboPrices(comboId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_combo_prices")
        .select("*")
        .eq("combo_id", comboId)

      if (error) throw error

      return (data || []).map((price) => objectToCamelCase(price))
    } catch (error) {
      console.error(`Error al obtener precios para combo ${comboId}:`, error)
      throw error
    }
  }

  async setComboPrice(comboId: string, channel: string, price: number) {
    try {
      const now = new Date().toISOString()

      // Verificar si ya existe un precio para este canal
      const { data: existingPrice, error: queryError } = await this.supabase
        .from("sales_combo_prices")
        .select("*")
        .eq("combo_id", comboId)
        .eq("channel", channel)
        .maybeSingle()

      if (queryError) throw queryError

      if (existingPrice) {
        // Actualizar precio existente
        const { data, error } = await this.supabase
          .from("sales_combo_prices")
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
        const { data, error } = await this.supabase
          .from("sales_combo_prices")
          .insert([
            {
              combo_id: comboId,
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
      console.error(`Error al establecer precio para combo ${comboId} en canal ${channel}:`, error)
      throw error
    }
  }

  // Alertas de stock
  async getStockAlerts(status?: "pending" | "resolved") {
    try {
      let query = this.supabase
        .from("sales_stock_alerts")
        .select(`
          *,
          product:sales_products(*)
        `)
        .order("created_at", { ascending: false })

      if (status) {
        query = query.eq("status", status)
      }

      const { data, error } = await query

      if (error) throw error

      return (data || []).map((alert) => {
        const stockAlert = objectToCamelCase(alert)
        if (stockAlert.product) {
          stockAlert.product = objectToCamelCase(stockAlert.product)
        }
        return stockAlert
      })
    } catch (error) {
      console.error("Error al obtener alertas de stock:", error)
      throw error
    }
  }

  async createStockAlert(productId: string, currentQuantity: number, minQuantity: number) {
    try {
      const now = new Date().toISOString()

      // Verificar si ya existe una alerta pendiente para este producto
      const { data: existingAlert, error: queryError } = await this.supabase
        .from("sales_stock_alerts")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "pending")
        .maybeSingle()

      if (queryError) throw queryError

      if (existingAlert) {
        // Actualizar alerta existente
        const { data, error } = await this.supabase
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
        const { data, error } = await this.supabase
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

  async resolveStockAlert(id: string) {
    try {
      const now = new Date().toISOString()

      const { data, error } = await this.supabase
        .from("sales_stock_alerts")
        .update({
          status: "resolved",
          resolved_at: now,
        })
        .eq("id", id)
        .select()
        .single()

      if (error) throw error

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al resolver alerta de stock con ID ${id}:`, error)
      throw error
    }
  }

  // Utilidades
  async checkLowStock() {
    try {
      // Obtener todos los productos con inventario
      const { data, error } = await this.supabase
        .from("sales_inventory")
        .select(`
          *,
          product:sales_products(*)
        `)
        .order("quantity")

      if (error) throw error

      const lowStockItems = []

      for (const item of data) {
        if (item.quantity <= item.min_quantity) {
          lowStockItems.push(item)

          // Crear alerta de stock si es necesario
          await this.createStockAlert(item.product_id, item.quantity, item.min_quantity)
        }
      }

      return lowStockItems.map((item) => {
        const inventoryItem = objectToCamelCase(item)
        if (inventoryItem.product) {
          inventoryItem.product = objectToCamelCase(inventoryItem.product)
        }
        return inventoryItem
      })
    } catch (error) {
      console.error("Error al verificar stock bajo:", error)
      throw error
    }
  }
}

// Instancia del servicio
import { supabase } from "./supabase"
export const salesService = new SalesService(supabase)