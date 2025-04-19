import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { objectToCamelCase, objectToSnakeCase } from "./utils"

// Tipos
export interface Product {
  id: string
  name: string
  description?: string
  category?: string
  imageUrl?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  prices?: ProductPrice[]
}

export interface ProductPrice {
  id: string
  productId: string
  channel: string
  price: number
  createdAt: string
  updatedAt: string
}

export interface Inventory {
  id: string
  productId: string
  locationId: string
  quantity: number
  minStock: number
  updatedAt: string
}

export interface InventoryMovement {
  id: string
  productId: string
  locationId: string
  movementType: string
  quantity: number
  referenceId?: string
  notes?: string
  createdBy: string
  createdAt: string
}

export interface Sale {
  id: string
  locationId: string
  shiftId?: string
  channel: string
  totalAmount: number
  paymentMethod: string
  isInvoiced: boolean
  createdBy: string
  createdAt: string
  items?: SaleItem[]
}

export interface SaleItem {
  id: string
  transactionId: string
  productId: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export interface ProductBundle {
  id: string
  name: string
  description?: string
  price: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  items?: BundleItem[]
}

export interface BundleItem {
  id: string
  bundleId: string
  productId: string
  quantity: number
  createdAt: string
}

export interface InventoryAlert {
  id: string
  productId: string
  locationId: string
  currentQuantity: number
  minQuantity: number
  status: string
  resolvedAt?: string
  resolvedBy?: string
  createdAt: string
}

class SalesService {
  private supabase = createClientComponentClient()

  // Productos
  async getProducts() {
    try {
      const { data, error } = await this.supabase.from("sales_products").select("*").order("name")

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
        .select(`*, prices:sales_product_prices(*)`)
        .eq("id", id)
        .single()

      if (error) throw error

      const product = objectToCamelCase(data)
      if (product.prices) {
        product.prices = product.prices.map((price: any) => objectToCamelCase(price))
      }

      return product
    } catch (error) {
      console.error(`Error al obtener producto con precios, ID ${id}:`, error)
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

  async updateProduct(id: string, product: Partial<Product>) {
    try {
      const updateData = objectToSnakeCase({
        ...product,
        updated_at: new Date().toISOString(),
      })

      const { data, error } = await this.supabase
        .from("sales_products")
        .update(updateData)
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

  // Precios de productos
  async getProductPrices(productId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_product_prices")
        .select("*")
        .eq("product_id", productId)
        .order("channel")

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
      const priceData = {
        product_id: productId,
        channel,
        price,
        updated_at: now,
      }

      // Verificar si ya existe un precio para este producto y canal
      const { data: existingPrice, error: checkError } = await this.supabase
        .from("sales_product_prices")
        .select("id")
        .eq("product_id", productId)
        .eq("channel", channel)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingPrice) {
        // Actualizar precio existente
        const { data, error } = await this.supabase
          .from("sales_product_prices")
          .update({ price, updated_at: now })
          .eq("id", existingPrice.id)
          .select()
          .single()

        if (error) throw error

        return objectToCamelCase(data)
      } else {
        // Crear nuevo precio
        const { data, error } = await this.supabase
          .from("sales_product_prices")
          .insert([{ ...priceData, created_at: now }])
          .select()
          .single()

        if (error) throw error

        return objectToCamelCase(data)
      }
    } catch (error) {
      console.error(`Error al establecer precio para producto ${productId}, canal ${channel}:`, error)
      throw error
    }
  }

  // Inventario
  async getInventory(locationId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_inventory")
        .select(`*, product:sales_products(*)`)
        .eq("location_id", locationId)
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
      console.error(`Error al obtener inventario para local ${locationId}:`, error)
      throw error
    }
  }

  async getProductInventory(productId: string, locationId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_inventory")
        .select("*")
        .eq("product_id", productId)
        .eq("location_id", locationId)
        .single()

      if (error) {
        if (error.code === "PGRST116") {
          // No se encontró inventario para este producto en este local
          return null
        }
        throw error
      }

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al obtener inventario para producto ${productId} en local ${locationId}:`, error)
      throw error
    }
  }

  async updateInventory(productId: string, locationId: string, quantity: number, minStock?: number) {
    try {
      const now = new Date().toISOString()

      // Verificar si ya existe un registro de inventario para este producto y local
      const { data: existingInventory, error: checkError } = await this.supabase
        .from("sales_inventory")
        .select("id, quantity")
        .eq("product_id", productId)
        .eq("location_id", locationId)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingInventory) {
        // Actualizar inventario existente
        const updateData: any = {
          quantity,
          updated_at: now,
        }

        if (minStock !== undefined) {
          updateData.min_stock = minStock
        }

        const { data, error } = await this.supabase
          .from("sales_inventory")
          .update(updateData)
          .eq("id", existingInventory.id)
          .select()
          .single()

        if (error) throw error

        // Verificar si se debe crear una alerta de stock bajo
        await this.checkStockAlert(productId, locationId, quantity, minStock || 5)

        return objectToCamelCase(data)
      } else {
        // Crear nuevo registro de inventario
        const inventoryData = {
          product_id: productId,
          location_id: locationId,
          quantity,
          min_stock: minStock || 5,
          updated_at: now,
        }

        const { data, error } = await this.supabase
          .from("sales_inventory")
          .insert([inventoryData])
          .select()
          .single()

        if (error) throw error

        // Verificar si se debe crear una alerta de stock bajo
        await this.checkStockAlert(productId, locationId, quantity, minStock || 5)

        return objectToCamelCase(data)
      }
    } catch (error) {
      console.error(`Error al actualizar inventario para producto ${productId} en local ${locationId}:`, error)
      throw error
    }
  }

  async registerInventoryMovement(
    productId: string,
    locationId: string,
    movementType: string,
    quantity: number,
    referenceId?: string,
    notes?: string,
    createdBy?: string
  ) {
    try {
      const now = new Date().toISOString()
      const movementData = {
        product_id: productId,
        location_id: locationId,
        movement_type: movementType,
        quantity,
        reference_id: referenceId,
        notes,
        created_by: createdBy || "system",
        created_at: now,
      }

      // Registrar el movimiento
      const { data, error } = await this.supabase
        .from("sales_inventory_movements")
        .insert([movementData])
        .select()
        .single()

      if (error) throw error

      // Actualizar el inventario según el tipo de movimiento
      let inventoryChange = 0
      if (
        movementType === "ingreso" ||
        movementType === "traslado_entrada" ||
        movementType === "ajuste_positivo"
      ) {
        inventoryChange = quantity
      } else if (
        movementType === "venta" ||
        movementType === "decomiso" ||
        movementType === "consumo_personal" ||
        movementType === "traslado_salida" ||
        movementType === "ajuste_negativo"
      ) {
        inventoryChange = -quantity
      }

      if (inventoryChange !== 0) {
        // Obtener inventario actual
        const { data: currentInventory, error: inventoryError } = await this.supabase
          .from("sales_inventory")
          .select("quantity, min_stock")
          .eq("product_id", productId)
          .eq("location_id", locationId)
          .single()

        if (inventoryError && inventoryError.code !== "PGRST116") {
          throw inventoryError
        }

        const currentQuantity = currentInventory ? currentInventory.quantity : 0
        const minStock = currentInventory ? currentInventory.min_stock : 5
        const newQuantity = currentQuantity + inventoryChange

        // Actualizar inventario
        await this.updateInventory(productId, locationId, newQuantity, minStock)
      }

      return objectToCamelCase(data)
    } catch (error) {
      console.error(
        `Error al registrar movimiento de inventario para producto ${productId} en local ${locationId}:`,
        error
      )
      throw error
    }
  }

  // Alertas de stock
  async checkStockAlert(productId: string, locationId: string, currentQuantity: number, minQuantity: number) {
    try {
      // Si la cantidad actual es menor o igual al mínimo, crear una alerta
      if (currentQuantity <= minQuantity) {
        // Verificar si ya existe una alerta activa para este producto y local
        const { data: existingAlert, error: checkError } = await this.supabase
          .from("sales_inventory_alerts")
          .select("id")
          .eq("product_id", productId)
          .eq("location_id", locationId)
          .eq("status", "active")
          .single()

        if (checkError && checkError.code !== "PGRST116") {
          throw checkError
        }

        if (!existingAlert) {
          // Crear nueva alerta
          const alertData = {
            product_id: productId,
            location_id: locationId,
            current_quantity: currentQuantity,
            min_quantity: minQuantity,
            status: "active",
            created_at: new Date().toISOString(),
          }

          const { error } = await this.supabase.from("sales_inventory_alerts").insert([alertData])

          if (error) throw error

          console.log(`Alerta de stock bajo creada para producto ${productId} en local ${locationId}`)
          return true
        }
      } else {
        // Si la cantidad actual es mayor al mínimo, resolver alertas activas
        const { data: existingAlerts, error: checkError } = await this.supabase
          .from("sales_inventory_alerts")
          .select("id")
          .eq("product_id", productId)
          .eq("location_id", locationId)
          .eq("status", "active")

        if (checkError) throw checkError

        if (existingAlerts && existingAlerts.length > 0) {
          const now = new Date().toISOString()
          const updateData = {
            status: "resolved",
            resolved_at: now,
            resolved_by: "system",
          }

          for (const alert of existingAlerts) {
            const { error } = await this.supabase
              .from("sales_inventory_alerts")
              .update(updateData)
              .eq("id", alert.id)

            if (error) throw error
          }

          console.log(`Alertas de stock resueltas para producto ${productId} en local ${locationId}`)
          return true
        }
      }

      return false
    } catch (error) {
      console.error(`Error al verificar alerta de stock para producto ${productId} en local ${locationId}:`, error)
      throw error
    }
  }

  async getActiveStockAlerts(locationId?: string) {
    try {
      let query = this.supabase
        .from("sales_inventory_alerts")
        .select(`*, product:sales_products(*)`)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (locationId) {
        query = query.eq("location_id", locationId)
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
      console.error("Error al obtener alertas de stock activas:", error)
      throw error
    }
  }

  // Ventas
  async createSale(sale: Omit<Sale, "id" | "createdAt">, items: Omit<SaleItem, "id" | "transactionId" | "createdAt">[]) {
    try {
      // Iniciar transacción
      const now = new Date().toISOString()
      const saleData = objectToSnakeCase({
        ...sale,
        created_at: now,
      })

      // Crear la venta
      const { data: newSale, error: saleError } = await this.supabase
        .from("sales_transactions")
        .insert([saleData])
        .select()
        .single()

      if (saleError) throw saleError

      // Crear los items de la venta
      const saleItems = items.map((item) => ({
        transaction_id: newSale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        created_at: now,
      }))

      const { error: itemsError } = await this.supabase.from("sales_transaction_items").insert(saleItems)

      if (itemsError) throw itemsError

      // Registrar movimientos de inventario para cada item
      for (const item of items) {
        await this.registerInventoryMovement(
          item.product_id,
          sale.location_id,
          "venta",
          item.quantity,
          newSale.id,
          `Venta ${newSale.id}`,
          sale.created_by
        )
      }

      return objectToCamelCase(newSale)
    } catch (error) {
      console.error("Error al crear venta:", error)
      throw error
    }
  }

  async getSaleById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_transactions")
        .select(`*, items:sales_transaction_items(*)`)
        .eq("id", id)
        .single()

      if (error) throw error

      const sale = objectToCamelCase(data)
      if (sale.items) {
        sale.items = sale.items.map((item: any) => objectToCamelCase(item))
      }

      return sale
    } catch (error) {
      console.error(`Error al obtener venta con ID ${id}:`, error)
      throw error
    }
  }

  async getSalesByShift(shiftId: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_transactions")
        .select(`*, items:sales_transaction_items(*)`)
        .eq("shift_id", shiftId)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((sale) => {
        const saleData = objectToCamelCase(sale)
        if (saleData.items) {
          saleData.items = saleData.items.map((item: any) => objectToCamelCase(item))
        }
        return saleData
      })
    } catch (error) {
      console.error(`Error al obtener ventas para turno ${shiftId}:`, error)
      throw error
    }
  }

  async getSalesByDateRange(locationId: string, startDate: string, endDate: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_transactions")
        .select(`*, items:sales_transaction_items(*)`)
        .eq("location_id", locationId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .order("created_at", { ascending: false })

      if (error) throw error

      return (data || []).map((sale) => {
        const saleData = objectToCamelCase(sale)
        if (saleData.items) {
          saleData.items = saleData.items.map((item: any) => objectToCamelCase(item))
        }
        return saleData
      })
    } catch (error) {
      console.error(
        `Error al obtener ventas para local ${locationId} entre ${startDate} y ${endDate}:`,
        error
      )
      throw error
    }
  }

  // Combos
  async getProductBundles() {
    try {
      const { data, error } = await this.supabase.from("sales_product_bundles").select("*").order("name")

      if (error) throw error

      return (data || []).map((bundle) => objectToCamelCase(bundle))
    } catch (error) {
      console.error("Error al obtener combos:", error)
      throw error
    }
  }

  async getProductBundleById(id: string) {
    try {
      const { data, error } = await this.supabase
        .from("sales_product_bundles")
        .select(`*, items:sales_bundle_items(*, product:sales_products(*))`)
        .eq("id", id)
        .single()

      if (error) throw error

      const bundle = objectToCamelCase(data)
      if (bundle.items) {
        bundle.items = bundle.items.map((item: any) => {
          const bundleItem = objectToCamelCase(item)
          if (bundleItem.product) {
            bundleItem.product = objectToCamelCase(bundleItem.product)
          }
          return bundleItem
        })
      }

      return bundle
    } catch (error) {
      console.error(`Error al obtener combo con ID ${id}:`, error)
      throw error
    }
  }

  async createProductBundle(bundle: Omit<ProductBundle, "id" | "createdAt" | "updatedAt">, items: { productId: string; quantity: number }[]) {
    try {
      const now = new Date().toISOString()
      const bundleData = objectToSnakeCase({
        ...bundle,
        created_at: now,
        updated_at: now,
      })

      // Crear el combo
      const { data: newBundle, error: bundleError } = await this.supabase
        .from("sales_product_bundles")
        .insert([bundleData])
        .select()
        .single()

      if (bundleError) throw bundleError

      // Crear los items del combo
      const bundleItems = items.map((item) => ({
        bundle_id: newBundle.id,
        product_id: item.productId,
        quantity: item.quantity,
        created_at: now,
      }))

      const { error: itemsError } = await this.supabase.from("sales_bundle_items").insert(bundleItems)

      if (itemsError) throw itemsError

      return objectToCamelCase(newBundle)
    } catch (error) {
      console.error("Error al crear combo:", error)
      throw error
    }
  }

  async updateProductBundle(id: string, bundle: Partial<ProductBundle>, items?: { productId: string; quantity: number }[]) {
    try {
      const now = new Date().toISOString()
      const updateData = objectToSnakeCase({
        ...bundle,
        updated_at: now,
      })

      // Actualizar el combo
      const { data, error: bundleError } = await this.supabase
        .from("sales_product_bundles")
        .update(updateData)
        .eq("id", id)
        .select()
        .single()

      if (bundleError) throw bundleError

      // Si se proporcionaron items, actualizar los items del combo
      if (items) {
        // Eliminar items existentes
        const { error: deleteError } = await this.supabase.from("sales_bundle_items").delete().eq("bundle_id", id)

        if (deleteError) throw deleteError

        // Crear nuevos items
        const bundleItems = items.map((item) => ({
          bundle_id: id,
          product_id: item.productId,
          quantity: item.quantity,
          created_at: now,
        }))

        const { error: itemsError } = await this.supabase.from("sales_bundle_items").insert(bundleItems)

        if (itemsError) throw itemsError
      }

      return objectToCamelCase(data)
    } catch (error) {
      console.error(`Error al actualizar combo con ID ${id}:`, error)
      throw error
    }
  }

  async deleteProductBundle(id: string) {
    try {
      const { error } = await this.supabase.from("sales_product_bundles").delete().eq("id", id)

      if (error) throw error

      return true
    } catch (error) {
      console.error(`Error al eliminar combo con ID ${id}:`, error)
      throw error
    }
  }
}

// Crear una instancia del servicio
const salesService = new SalesService()

export { salesService }