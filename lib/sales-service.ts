import { supabase, objectToCamelCase, objectToSnakeCase } from "@/lib/sales-db"

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

      // Obtener productos principales (no variantes)
      const { data, error } = await supabase
        .from("sales_products")
        .select(`
          *,
          category:sales_categories(*)
        `)
        .is("is_variant", false)
        .order("name")

      if (error) throw error

      console.log("Productos obtenidos de la base de datos:", data)

      // Para cada producto, obtener sus variantes
      const productsWithVariants = await Promise.all((data || []).map(async (product) => {
        const productData = objectToCamelCase(product)
        
        if (productData.category) {
          productData.category = objectToCamelCase(productData.category)
        }
        
        // Obtener variantes para este producto
        const { data: variantsData, error: variantsError } = await supabase
          .from("sales_products")
          .select("*")
          .eq("parent_id", product.id)
          .eq("is_variant", true)
          .order("variant_name")
        
        if (!variantsError && variantsData) {
          productData.variants = variantsData.map(variant => objectToCamelCase(variant))
        } else {
          productData.variants = []
        }
        
        return productData
      }))

      return productsWithVariants
    } catch (error) {
      console.error("Error al obtener productos con variantes:", error)
      return []
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

  // Alertas de stock
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
}

// Exportar una instancia del servicio
export const salesService = new SalesService()