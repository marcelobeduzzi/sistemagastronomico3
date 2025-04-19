'use client'

import { useState } from "react"
import { useRouter } from "next/navigation"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { salesService } from "@/lib/sales-service"
import type { Product } from "@/lib/sales-service"

const productSchema = z.object({
  name: z.string().min(2, { message: "El nombre debe tener al menos 2 caracteres" }),
  description: z.string().optional(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  localPrice: z.coerce.number().min(0, { message: "El precio debe ser mayor o igual a 0" }),
  pedidosYaPrice: z.coerce.number().min(0, { message: "El precio debe ser mayor o igual a 0" }).optional(),
  rappiPrice: z.coerce.number().min(0, { message: "El precio debe ser mayor o igual a 0" }).optional(),
  mercadoPagoPrice: z.coerce.number().min(0, { message: "El precio debe ser mayor o igual a 0" }).optional(),
})

type ProductFormValues = z.infer<typeof productSchema>

interface ProductFormProps {
  product?: Product
}

export default function ProductForm({ product }: ProductFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: Partial<ProductFormValues> = {
    name: product?.name || "",
    description: product?.description || "",
    category: product?.category || "",
    imageUrl: product?.imageUrl || "",
    isActive: product?.isActive ?? true,
    localPrice: 0,
    pedidosYaPrice: undefined,
    rappiPrice: undefined,
    mercadoPagoPrice: undefined,
  }

  // Si hay un producto, cargar los precios
  if (product?.prices) {
    product.prices.forEach((price) => {
      if (price.channel === "local") {
        defaultValues.localPrice = price.price
      } else if (price.channel === "pedidosya") {
        defaultValues.pedidosYaPrice = price.price
      } else if (price.channel === "rappi") {
        defaultValues.rappiPrice = price.price
      } else if (price.channel === "mercadopago") {
        defaultValues.mercadoPagoPrice = price.price
      }
    })
  }

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues,
  })

  async function onSubmit(data: ProductFormValues) {
    try {
      setIsSubmitting(true)

      // Extraer los precios del formulario
      const { localPrice, pedidosYaPrice, rappiPrice, mercadoPagoPrice, ...productData } = data

      if (product) {
        // Actualizar producto existente
        await salesService.updateProduct(product.id, productData)

        // Actualizar precios
        await salesService.setProductPrice(product.id, "local", localPrice)
        if (pedidosYaPrice !== undefined) {
          await salesService.setProductPrice(product.id, "pedidosya", pedidosYaPrice)
        }
        if (rappiPrice !== undefined) {
          await salesService.setProductPrice(product.id, "rappi", rappiPrice)
        }
        if (mercadoPagoPrice !== undefined) {
          await salesService.setProductPrice(product.id, "mercadopago", mercadoPagoPrice)
        }
      } else {
        // Crear nuevo producto
        const newProduct = await salesService.createProduct(productData)

        // Establecer precios
        await salesService.setProductPrice(newProduct.id, "local", localPrice)
        if (pedidosYaPrice !== undefined) {
          await salesService.setProductPrice(newProduct.id, "pedidosya", pedidosYaPrice)
        }
        if (rappiPrice !== undefined) {
          await salesService.setProductPrice(newProduct.id, "rappi", rappiPrice)
        }
        if (mercadoPagoPrice !== undefined) {
          await salesService.setProductPrice(newProduct.id, "mercadopago", mercadoPagoPrice)
        }
      }

      router.push("/ventas/productos")
      router.refresh()
    } catch (error) {
      console.error("Error al guardar producto:", error)
      alert("Error al guardar el producto. Por favor, intenta de nuevo.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nombre del Producto</FormLabel>
                <FormControl>
                  <Input placeholder="Hamburguesa Clásica" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input placeholder="Hamburguesas" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea placeholder="Descripción del producto..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>URL de la Imagen</FormLabel>
              <FormControl>
                <Input placeholder="https://ejemplo.com/imagen.jpg" {...field} />
              </FormControl>
              <FormDescription>URL de la imagen del producto (opcional)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isActive"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Producto Activo</FormLabel>
                <FormDescription>
                  Los productos inactivos no aparecerán en el sistema de ventas
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="local">Local</TabsTrigger>
            <TabsTrigger value="pedidosya">PedidosYa</TabsTrigger>
            <TabsTrigger value="rappi">Rappi</TabsTrigger>
            <TabsTrigger value="mercadopago">MercadoPago</TabsTrigger>
          </TabsList>
          <TabsContent value="local">
            <FormField
              control={form.control}
              name="localPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Local</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Precio para ventas en el local</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="pedidosya">
            <FormField
              control={form.control}
              name="pedidosYaPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio PedidosYa</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Precio para ventas a través de PedidosYa</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="rappi">
            <FormField
              control={form.control}
              name="rappiPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio Rappi</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Precio para ventas a través de Rappi</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          <TabsContent value="mercadopago">
            <FormField
              control={form.control}
              name="mercadoPagoPrice"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Precio MercadoPago</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormDescription>Precio para ventas a través de MercadoPago</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/ventas/productos")}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando..." : product ? "Actualizar Producto" : "Crear Producto"}
          </Button>
        </div>
      </form>
    </Form>
  )
}