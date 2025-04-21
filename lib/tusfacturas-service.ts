/**
 * Servicio para integración con TusFacturasAPP (AFIP/ARCA)
 */

// Tipos para la API de TusFacturasAPP
export interface TusFacturasCredentials {
  apitoken: string
  apikey: string
  usertoken: string
}

export interface TusFacturasCliente {
  documento_tipo: string // DNI, CUIT, etc.
  condicion_iva: string // CF (Consumidor Final), RI (Responsable Inscripto), etc.
  domicilio: string
  condicion_pago: string // Código de condición de pago
  documento_nro: string
  razon_social: string
  provincia: string // Código de provincia
  email: string
  envia_por_mail: "S" | "N"
  rg5329: "S" | "N"
}

export interface TusFacturasProducto {
  descripcion: string
  codigo: number | string
  lista_precios: string
  leyenda: string
  unidad_bulto: number
  alicuota: number // Porcentaje de IVA (21, 10.5, etc.)
  actualiza_precio: "S" | "N"
  rg5329: "S" | "N"
  precio_unitario_sin_iva: number
}

export interface TusFacturasDetalle {
  cantidad: number
  afecta_stock: "S" | "N"
  actualiza_precio: "S" | "N"
  bonificacion_porcentaje: number
  producto: TusFacturasProducto
}

export interface TusFacturasTributo {
  id: number
  importe: number
  base_imponible: number
  alicuota: number
  descripcion: string
}

export interface TusFacturasComprobante {
  rubro: string
  tipo: string // "FACTURA A", "FACTURA B", etc.
  numero: number
  operacion: "V" // V para venta
  detalle: TusFacturasDetalle[]
  fecha: string // Formato DD/MM/YYYY
  vencimiento: string // Formato DD/MM/YYYY
  rubro_grupo_contable: string
  total: number
  cotizacion: number
  moneda: string // "PES" para pesos argentinos
  punto_venta: number
  tributos: TusFacturasTributo[]
}

export interface TusFacturasRequest {
  apitoken: string
  apikey: string
  usertoken: string
  cliente: TusFacturasCliente
  comprobante: TusFacturasComprobante
}

export interface TusFacturasResponse {
  error: boolean
  errores?: string[]
  cae?: string
  vencimiento_cae?: string
  comprobante_nro?: string
  resultado?: string
  observaciones?: string[]
}

class TusFacturasService {
  // Credenciales precargadas con los datos proporcionados
  private credentials: TusFacturasCredentials = {
    apitoken: "915b4a37bf2f23d66a28f90b04f695c0",
    apikey: "67223",
    usertoken: "3835ddfd15adf0df7b4af6153400613a40ca1091e0c7059166672395afbf2884",
  }

  private apiUrl = "https://www.tusfacturas.app/app/api/v2/facturacion/nuevo"
  private puntoVenta = 1 // Será formateado como "00001"

  constructor() {
    // Intentar cargar credenciales desde localStorage al inicializar
    this.loadCredentials()
  }

  /**
   * Establece las credenciales para la API
   */
  setCredentials(credentials: TusFacturasCredentials): void {
    this.credentials = credentials

    // Guardar credenciales en localStorage para uso futuro
    if (typeof window !== "undefined") {
      localStorage.setItem("tusfacturas_credentials", JSON.stringify(credentials))
    }
  }

  /**
   * Establece el punto de venta
   */
  setPuntoVenta(puntoVenta: number): void {
    this.puntoVenta = puntoVenta

    // Guardar punto de venta en localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("tusfacturas_punto_venta", puntoVenta.toString())
    }
  }

  /**
   * Carga las credenciales desde localStorage
   */
  loadCredentials(): void {
    if (typeof window !== "undefined") {
      // Cargar punto de venta
      const savedPuntoVenta = localStorage.getItem("tusfacturas_punto_venta")
      if (savedPuntoVenta) {
        try {
          this.puntoVenta = Number.parseInt(savedPuntoVenta, 10)
        } catch (error) {
          console.error("Error al cargar punto de venta de TusFacturas:", error)
        }
      }

      // Cargar credenciales (solo si no están ya configuradas)
      const savedCredentials = localStorage.getItem("tusfacturas_credentials")
      if (savedCredentials) {
        try {
          this.credentials = JSON.parse(savedCredentials)
        } catch (error) {
          console.error("Error al cargar credenciales de TusFacturas:", error)
        }
      }
    }
  }

  /**
   * Verifica si las credenciales están configuradas
   */
  hasCredentials(): boolean {
    return (
      this.credentials !== null &&
      this.credentials.apitoken !== "" &&
      this.credentials.apikey !== "" &&
      this.credentials.usertoken !== ""
    )
  }

  /**
   * Obtiene las credenciales actuales
   */
  getCredentials(): TusFacturasCredentials {
    return this.credentials
  }

  /**
   * Obtiene el punto de venta formateado como "00001"
   */
  getPuntoVentaFormateado(): string {
    return this.puntoVenta.toString().padStart(5, "0")
  }

  /**
   * Genera una factura electrónica
   */
  async generarFactura(cliente: TusFacturasCliente, comprobante: TusFacturasComprobante): Promise<TusFacturasResponse> {
    if (!this.hasCredentials()) {
      throw new Error("No se han configurado las credenciales para TusFacturasAPP")
    }

    // Asegurarse de que el punto de venta esté correctamente configurado
    comprobante.punto_venta = this.puntoVenta

    const requestData: TusFacturasRequest = {
      ...this.credentials,
      cliente,
      comprobante,
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`)
      }

      const data: TusFacturasResponse = await response.json()
      return data
    } catch (error) {
      console.error("Error al generar factura:", error)
      return {
        error: true,
        errores: [error instanceof Error ? error.message : "Error desconocido"],
      }
    }
  }

  /**
   * Convierte una venta del sistema a formato TusFacturas
   */
  convertirVentaAFactura(venta: any): { cliente: TusFacturasCliente; comprobante: TusFacturasComprobante } {
    // Obtener la fecha actual en formato DD/MM/YYYY
    const hoy = new Date()
    const fechaFormateada = `${String(hoy.getDate()).padStart(2, "0")}/${String(hoy.getMonth() + 1).padStart(2, "0")}/${hoy.getFullYear()}`

    // Fecha de vencimiento (30 días después)
    const vencimiento = new Date(hoy)
    vencimiento.setDate(vencimiento.getDate() + 30)
    const vencimientoFormateado = `${String(vencimiento.getDate()).padStart(2, "0")}/${String(vencimiento.getMonth() + 1).padStart(2, "0")}/${vencimiento.getFullYear()}`

    // Datos del cliente (por defecto consumidor final)
    const cliente: TusFacturasCliente = {
      documento_tipo: "DNI",
      condicion_iva: "CF", // Consumidor Final
      domicilio: venta.cliente?.direccion || "Sin dirección",
      condicion_pago: "201", // Contado
      documento_nro: venta.cliente?.documento || "0",
      razon_social: venta.cliente?.nombre || "Consumidor Final",
      provincia: "2", // Buenos Aires por defecto
      email: venta.cliente?.email || "",
      envia_por_mail: "N",
      rg5329: "N",
    }

    // Detalles de los productos
    const detalle: TusFacturasDetalle[] = venta.items.map((item: any) => ({
      cantidad: item.quantity || item.cantidad,
      afecta_stock: "S",
      actualiza_precio: "N",
      bonificacion_porcentaje: 0,
      producto: {
        descripcion: item.producto?.name || item.producto?.nombre || "Producto sin nombre",
        codigo: item.producto?.id || item.product_id || "0",
        lista_precios: "standard",
        leyenda: "",
        unidad_bulto: 1,
        alicuota: 21, // IVA 21% por defecto
        actualiza_precio: "N",
        rg5329: "N",
        precio_unitario_sin_iva: Number.parseFloat(((item.price || item.precio) / 1.21).toFixed(2)), // Precio sin IVA
      },
    }))

    // Datos del comprobante
    const comprobante: TusFacturasComprobante = {
      rubro: "Gastronomía",
      tipo: "FACTURA B", // Por defecto Factura B
      numero: 0, // El número lo asigna TusFacturas
      operacion: "V", // Venta
      detalle,
      fecha: fechaFormateada,
      vencimiento: vencimientoFormateado,
      rubro_grupo_contable: "Gastronomía",
      total: venta.total_amount || venta.total,
      cotizacion: 1,
      moneda: "PES", // Pesos argentinos
      punto_venta: this.puntoVenta, // Usar el punto de venta configurado
      tributos: [], // Sin tributos adicionales
    }

    return { cliente, comprobante }
  }
}

// Exportar una instancia única del servicio
export const tusFacturasService = new TusFacturasService()
