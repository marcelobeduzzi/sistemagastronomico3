"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

// Tipos
type Location = {
  id: number
  name: string
}

type Manager = {
  id: string // UUID del encargado
  name: string
  local: string
}

type ProductConfig = {
  id: number
  product_name: string
  unit_value: number
  category: string
  has_internal_consumption: boolean
}

type StockSheetData = {
  id?: number
  date: string
  location_id: number
  manager_id: string // UUID del encargado
  shift: "mañana" | "tarde"
  status: "borrador" | "parcial" | "completado"
  created_by: string
  updated_by: string
}

type ProductStockData = {
  id?: number
  stock_sheet_id?: number
  product_id: number
  product_name: string
  category: string
  unit_value: number

  // Datos que carga el encargado
  opening_quantity: number | null
  opening_locked: boolean
  incoming_quantity: number | null
  incoming_locked: boolean
  closing_quantity: number | null
  closing_locked: boolean

  // Datos que carga el administrador
  units_sold: number | null
  discarded_quantity: number | null
  internal_consumption: number | null

  // Cálculos
  difference: number | null
  has_internal_consumption: boolean
}

// Lista fija de locales
const FIXED_LOCATIONS: Location[] = [
  { id: 1, name: "BR Cabildo" },
  { id: 2, name: "BR Carranza" },
  { id: 3, name: "BR Pacífico" },
  { id: 4, name: "BR Lavalle" },
  { id: 5, name: "BR Rivadavia" },
  { id: 6, name: "BR Aguero" },
]

export default function StockMatrixPageContent() {
  const router = useRouter()
  const [userRole, setUserRole] = useState<"encargado" | "administrador">("encargado")
  const [isLoading, setIsLoading] = useState(true)
  const [locations] = useState<Location[]>(FIXED_LOCATIONS)
  const [allManagers, setAllManagers] = useState<Manager[]>([])
  const [filteredManagers, setFilteredManagers] = useState<Manager[]>([])
  const [productConfigs, setProductConfigs] = useState<ProductConfig[]>([])
  const [stockData, setStockData] = useState<ProductStockData[]>([])
  const [showIncomingDialog, setShowIncomingDialog] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null)
  const [incomingAmount, setIncomingAmount] = useState<number>(0)
  const [dataLoaded, setDataLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authChecking, setAuthChecking] = useState(true)
  const [sessionAttempts, setSessionAttempts] = useState(0)

  // Estado para los datos de la planilla
  const [sheetData, setSheetData] = useState<StockSheetData>({
    date: format(new Date(), "yyyy-MM-dd"),
    location_id: 0,
    manager_id: "", // UUID del encargado
    shift: "mañana",
    status: "borrador",
    created_by: "Usuario Actual",
    updated_by: "Usuario Actual",
  })

  // Reemplazar todo el useEffect de verificación de autenticación con esta versión simplificada
  useEffect(() => {
    // Cargar datos directamente sin verificación estricta de autenticación
    fetchData()
  }, [])

  // Reemplazar la función fetchData con esta versión simplificada que no verifica autenticación
  async function fetchData() {
    try {
      setIsLoading(true)
      setError(null)
      console.log("Cargando datos...")

      const supabase = createClient()

      // Fetch encargados desde la tabla de empleados
      try {
        const { data: employeesData, error: employeesError } = await supabase
          .from("employees")
          .select("id, first_name, last_name, local, position, status")
          .eq("status", "active")
          .order("last_name")

        if (employeesError) {
          console.error("Error al cargar empleados:", employeesError)
          toast({
            title: "Error",
            description: "No se pudieron cargar los empleados",
            variant: "destructive",
          })
        } else {
          // Filtrar los encargados y supervisores manualmente con más flexibilidad
          const filteredEmployees = (employeesData || []).filter((emp) => {
            if (!emp.position) return false

            const positionLower = emp.position.toLowerCase()
            return (
              positionLower.includes("encargad") || // Captura "encargado" y "encargada"
              positionLower.includes("supervisor")
            )
          })

          // Agregar un log para depuración
          console.log("Empleados filtrados:", filteredEmployees)

          // Transformar los datos de empleados al formato de Manager
          const managers: Manager[] = filteredEmployees.map((emp) => ({
            id: emp.id,
            name: `${emp.first_name} ${emp.last_name}`,
            local: emp.local,
          }))

          setAllManagers(managers)

          // Si ya hay un local seleccionado, filtrar los encargados
          if (sheetData.location_id) {
            const selectedLocation = locations.find((loc) => loc.id === sheetData.location_id)
            if (selectedLocation) {
              const filtered = managers.filter((manager) => manager.local === selectedLocation.name)
              setFilteredManagers(filtered)
            }
          } else {
            setFilteredManagers(managers)
          }
        }
      } catch (err) {
        console.error("Error al procesar empleados:", err)
        // No interrumpir el flujo, continuar con los productos
      }

      // Fetch product configs
      try {
        const { data: productConfigsData, error: productConfigsError } = await supabase
          .from("product_config")
          .select("id, product_name, unit_value, category, has_internal_consumption")
          .eq("active", true)
          .order("category", { ascending: true })
          .order("id", { ascending: true })

        if (productConfigsError) {
          console.error("Error al cargar productos:", productConfigsError)
          toast({
            title: "Error",
            description: "No se pudieron cargar los productos",
            variant: "destructive",
          })
        } else if (productConfigsData && productConfigsData.length > 0) {
          setProductConfigs(productConfigsData)

          // Inicializar datos de stock para cada producto
          const initialStockData: ProductStockData[] = productConfigsData.map((product) => ({
            product_id: product.id,
            product_name: product.product_name,
            category: product.category,
            unit_value: product.unit_value,
            has_internal_consumption: product.has_internal_consumption,

            opening_quantity: null,
            opening_locked: false,
            incoming_quantity: null,
            incoming_locked: false,
            closing_quantity: null,
            closing_locked: false,

            units_sold: null,
            discarded_quantity: null,
            internal_consumption: null,

            difference: null,
          }))

          setStockData(initialStockData)
        } else {
          toast({
            title: "Advertencia",
            description: "No hay productos configurados en el sistema",
            variant: "warning",
          })
        }
      } catch (err) {
        console.error("Error al procesar productos:", err)
        setError("Error al cargar los productos. Por favor, recargue la página.")
      }

      setDataLoaded(true)
    } catch (error: any) {
      console.error("Error fetching data:", error.message)
      setError("Error al cargar los datos. Por favor, recargue la página.")
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos necesarios",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setAuthChecking(false)
    }

    // Verificar si hay un ID en la URL para cargar una planilla existente
    const params = new URLSearchParams(window.location.search)
    const sheetId = params.get("id")
    if (sheetId) {
      loadExistingSheet(Number.parseInt(sheetId))
    }
  }

  // Filtrar encargados cuando cambia el local seleccionado
  useEffect(() => {
    try {
      if (sheetData.location_id && allManagers.length > 0) {
        const selectedLocation = locations.find((loc) => loc.id === sheetData.location_id)
        if (selectedLocation) {
          const filtered = allManagers.filter((manager) => manager.local === selectedLocation.name)
          setFilteredManagers(filtered)

          // Si el encargado actual no pertenece al local seleccionado, resetear la selección
          if (sheetData.manager_id) {
            const currentManagerStillValid = filtered.some((m) => m.id === sheetData.manager_id)
            if (!currentManagerStillValid) {
              setSheetData((prev) => ({
                ...prev,
                manager_id: "",
              }))
            }
          }
        }
      } else {
        setFilteredManagers(allManagers)
      }
    } catch (err) {
      console.error("Error al filtrar encargados:", err)
      // No mostrar error al usuario para no interrumpir la experiencia
    }
  }, [sheetData.location_id, allManagers, locations])

  // Manejar cambios en los campos del formulario principal
  const handleSheetDataChange = (name: string, value: any) => {
    try {
      console.log(`Cambiando ${name} a:`, value)

      // Solo convertir a número el location_id
      if (name === "location_id") {
        const numValue = typeof value === "string" ? Number.parseInt(value, 10) : value
        setSheetData((prev) => ({
          ...prev,
          [name]: numValue,
        }))
      } else {
        // Para manager_id y otros campos, usar el valor tal cual
        setSheetData((prev) => ({
          ...prev,
          [name]: value,
        }))
      }
    } catch (err) {
      console.error(`Error al cambiar ${name}:`, err)
    }
  }

  // Manejar cambios en los datos de stock
  const handleStockDataChange = (productId: number, field: string, value: number | null) => {
    try {
      setStockData((prev) => prev.map((item) => (item.product_id === productId ? { ...item, [field]: value } : item)))
    } catch (err) {
      console.error(`Error al cambiar ${field} para producto ${productId}:`, err)
    }
  }

  // Bloquear un campo después de guardarlo
  const handleLockField = (productId: number, field: "opening" | "incoming" | "closing") => {
    try {
      setStockData((prev) =>
        prev.map((item) => (item.product_id === productId ? { ...item, [`${field}_locked`]: true } : item)),
      )

      toast({
        title: "Campo bloqueado",
        description: `El valor ha sido guardado y bloqueado para edición`,
      })
    } catch (err) {
      console.error(`Error al bloquear ${field} para producto ${productId}:`, err)
    }
  }

  // Abrir diálogo para agregar ingreso de mercadería
  const handleAddIncoming = (productId: number) => {
    try {
      setSelectedProductId(productId)
      setIncomingAmount(0)
      setShowIncomingDialog(true)
    } catch (err) {
      console.error(`Error al abrir diálogo para producto ${productId}:`, err)
    }
  }

  // Confirmar ingreso de mercadería
  const confirmIncoming = () => {
    try {
      if (!selectedProductId || incomingAmount <= 0) {
        toast({
          title: "Error",
          description: "Ingrese una cantidad válida",
          variant: "destructive",
        })
        return
      }

      setStockData((prev) =>
        prev.map((item) => {
          if (item.product_id === selectedProductId) {
            const currentAmount = item.incoming_quantity || 0
            return {
              ...item,
              incoming_quantity: currentAmount + incomingAmount,
            }
          }
          return item
        }),
      )

      setShowIncomingDialog(false)

      toast({
        title: "Ingreso registrado",
        description: `Se agregaron ${incomingAmount} unidades al ingreso de mercadería`,
      })
    } catch (err) {
      console.error("Error al confirmar ingreso:", err)
      setShowIncomingDialog(false)
    }
  }

  // Finalizar ingreso de mercadería
  const finalizeIncoming = (productId: number) => {
    try {
      handleLockField(productId, "incoming")
    } catch (err) {
      console.error(`Error al finalizar ingreso para producto ${productId}:`, err)
    }
  }

  // Calcular diferencias
  const calculateDifference = (productId: number) => {
    try {
      const product = stockData.find((p) => p.product_id === productId)

      if (!product) return null

      const opening = product.opening_quantity || 0
      const incoming = product.incoming_quantity || 0
      const sold = product.units_sold || 0
      const discarded = product.discarded_quantity || 0
      const closing = product.closing_quantity || 0

      // Fórmula: (1 + 2 + 4 - 3 - 6)
      // Apertura + Ingreso + Decomisos - Vendidas - Cierre
      return opening + incoming + discarded - sold - closing
    } catch (err) {
      console.error(`Error al calcular diferencia para producto ${productId}:`, err)
      return null
    }
  }

  // Actualizar todas las diferencias
  const updateAllDifferences = () => {
    try {
      setStockData((prev) =>
        prev.map((item) => ({
          ...item,
          difference: calculateDifference(item.product_id),
        })),
      )
    } catch (err) {
      console.error("Error al actualizar diferencias:", err)
    }
  }

  // Validar datos antes de guardar
  const validateData = () => {
    try {
      console.log("Validando datos...")
      console.log("Datos completos de la planilla:", sheetData)
      console.log("Location ID:", sheetData.location_id, "tipo:", typeof sheetData.location_id)
      console.log("Manager ID:", sheetData.manager_id, "tipo:", typeof sheetData.manager_id)
      console.log("Managers disponibles:", filteredManagers)

      if (!sheetData.location_id) {
        console.error("Error de validación: No se ha seleccionado un local")
        toast({
          title: "Error",
          description: "Debe seleccionar un local",
          variant: "destructive",
        })
        return false
      }

      if (!sheetData.manager_id) {
        console.error("Error de validación: No se ha seleccionado un encargado")
        toast({
          title: "Error",
          description: "Debe seleccionar un encargado",
          variant: "destructive",
        })
        return false
      }

      console.log("Validación exitosa")
      return true
    } catch (err) {
      console.error("Error en validación:", err)
      return false
    }
  }

  // Simplificar la función handleSaveSheet para no verificar autenticación
  const handleSaveSheet = async () => {
    if (!validateData()) return

    try {
      setIsLoading(true)
      console.log("Iniciando guardado de planilla...")
      const supabase = createClient()

      // Verificar si las tablas existen
      try {
        console.log("Verificando tablas en la base de datos...")
        const { error: tableCheckError } = await supabase.from("stock_matrix_sheets").select("id").limit(1)

        if (tableCheckError) {
          console.error("Error al verificar tabla stock_matrix_sheets:", tableCheckError)
          toast({
            title: "Error de base de datos",
            description: "La tabla stock_matrix_sheets no existe. Por favor, ejecute el script de migración.",
            variant: "destructive",
          })
          setIsLoading(false)
          return
        }
      } catch (checkError) {
        console.error("Error al verificar tablas:", checkError)
        throw new Error("No se pudo verificar la existencia de las tablas necesarias")
      }

      // 1. Guardar la planilla principal
      let sheetId = sheetData.id

      if (sheetId) {
        // Actualizar planilla existente
        const { error: updateError } = await supabase
          .from("stock_matrix_sheets")
          .update({
            date: sheetData.date,
            location_id: sheetData.location_id,
            manager_id: sheetData.manager_id, // Usar directamente el UUID
            shift: sheetData.shift,
            status: "parcial",
            updated_by: sheetData.updated_by,
          })
          .eq("id", sheetId)

        if (updateError) {
          console.error("Error al actualizar la planilla:", updateError)
          throw new Error("No se pudo actualizar la planilla")
        }
      } else {
        // Crear nueva planilla
        const { data: insertData, error: insertError } = await supabase
          .from("stock_matrix_sheets")
          .insert({
            date: sheetData.date,
            location_id: sheetData.location_id,
            manager_id: sheetData.manager_id, // Usar directamente el UUID
            shift: sheetData.shift,
            status: "parcial",
            created_by: sheetData.created_by,
            updated_by: sheetData.updated_by,
          })
          .select()

        if (insertError) {
          console.error("Error al crear la planilla:", insertError)
          throw new Error("No se pudo crear la planilla")
        }

        if (!insertData || insertData.length === 0) {
          throw new Error("No se pudo obtener el ID de la planilla creada")
        }

        sheetId = insertData[0].id

        // Actualizar el ID en el estado
        setSheetData((prev) => ({
          ...prev,
          id: sheetId,
        }))
      }

      // 2. Guardar los detalles de stock
      for (const product of stockData) {
        const detailData = {
          stock_sheet_id: sheetId,
          product_id: product.product_id,
          product_name: product.product_name,
          category: product.category,
          unit_value: product.unit_value,
          opening_quantity: product.opening_quantity,
          opening_locked: product.opening_locked,
          incoming_quantity: product.incoming_quantity,
          incoming_locked: product.incoming_locked,
          closing_quantity: product.closing_quantity,
          closing_locked: product.closing_locked,
          units_sold: product.units_sold,
          discarded_quantity: product.discarded_quantity,
          internal_consumption: product.internal_consumption,
          difference: product.difference,
          has_internal_consumption: product.has_internal_consumption,
        }

        // Verificar si ya existe un detalle para este producto
        const { data: existingDetail, error: checkError } = await supabase
          .from("stock_matrix_details")
          .select("id")
          .eq("stock_sheet_id", sheetId)
          .eq("product_id", product.product_id)
          .maybeSingle()

        if (checkError) {
          console.error("Error al verificar detalle existente:", checkError)
          continue
        }

        if (existingDetail) {
          // Actualizar detalle existente
          const { error: updateError } = await supabase
            .from("stock_matrix_details")
            .update(detailData)
            .eq("id", existingDetail.id)

          if (updateError) {
            console.error("Error al actualizar detalle:", updateError)
          }
        } else {
          // Insertar nuevo detalle
          const { error: insertError } = await supabase.from("stock_matrix_details").insert(detailData)

          if (insertError) {
            console.error("Error al insertar detalle:", insertError)
          }
        }
      }
    }

    // Actualizar estado a parcial
    setSheetData((prev) => ({\
      ...prev,
      status: "parcial",
    }));

    toast({
      title: "Planilla guardada",
      description: "Los datos han sido guardados correctamente",
    })
  }
  catch (error: any)
  console.error("Error saving data:", error.message)
  toast({
    title: "Error",
    description: error.message || "No se pudieron guardar los datos",
    variant: "destructive",
  })
  finally
  setIsLoading(false)
}

// Simplificar la función handleFinalizeSheet para no verificar autenticación
const handleFinalizeSheet = async () => {
  if (!validateData()) return

  try {
    setIsLoading(true)
    console.log("Iniciando finalización de planilla...")
    const supabase = createClient()

    // Actualizar todas las diferencias antes de finalizar
    updateAllDifferences()

    // Verificar si las tablas existen
    try {
      console.log("Verificando tablas en la base de datos...")
      const { error: tableCheckError } = await supabase.from("stock_matrix_sheets").select("id").limit(1)

      if (tableCheckError) {
        console.error("Error al verificar tabla stock_matrix_sheets:", tableCheckError)
        toast({
          title: "Error de base de datos",
          description: "La tabla stock_matrix_sheets no existe. Por favor, ejecute el script de migración.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
    } catch (checkError) {
      console.error("Error al verificar tablas:", checkError)
      throw new Error("No se pudo verificar la existencia de las tablas necesarias")
    }

    // 1. Guardar o actualizar la planilla principal
    let sheetId = sheetData.id

    if (sheetId) {
      // Actualizar planilla existente
      const { error: updateError } = await supabase
        .from("stock_matrix_sheets")
        .update({
          date: sheetData.date,
          location_id: sheetData.location_id,
          manager_id: sheetData.manager_id, // Usar directamente el UUID
          shift: sheetData.shift,
          status: "completado",
          updated_by: sheetData.updated_by,
        })
        .eq("id", sheetId)

      if (updateError) {
        console.error("Error al actualizar la planilla:", updateError)
        throw new Error("No se pudo actualizar la planilla")
      }
    } else {
      // Crear nueva planilla
      const { data: insertData, error: insertError } = await supabase
        .from("stock_matrix_sheets")
        .insert({
          date: sheetData.date,
          location_id: sheetData.location_id,
          manager_id: sheetData.manager_id, // Usar directamente el UUID
          shift: sheetData.shift,
          status: "completado",
          created_by: sheetData.created_by,
          updated_by: sheetData.updated_by,
        })
        .select()

      if (insertError) {
        console.error("Error al crear la planilla:", insertError)
        throw new Error("No se pudo crear la planilla")
      }

      if (!insertData || insertData.length === 0) {
        throw new Error("No se pudo obtener el ID de la planilla creada")
      }

      sheetId = insertData[0].id

      // Actualizar el ID en el estado
      setSheetData((prev) => ({
        ...prev,
        id: sheetId,
      }))
    }

    // 2. Guardar los detalles de stock con todos los campos bloqueados
    for (const product of stockData) {
      const detailData = {
        stock_sheet_id: sheetId,
        product_id: product.product_id,
        product_name: product.product_name,
        category: product.category,
        unit_value: product.unit_value,
        opening_quantity: product.opening_quantity,
        opening_locked: true,
        incoming_quantity: product.incoming_quantity,
        incoming_locked: true,
        closing_quantity: product.closing_quantity,
        closing_locked: true,
        units_sold: product.units_sold,
        discarded_quantity: product.discarded_quantity,
        internal_consumption: product.internal_consumption,
        difference: product.difference,
        has_internal_consumption: product.has_internal_consumption,
      }

      // Verificar si ya existe un detalle para este producto
      const { data: existingDetail, error: checkError } = await supabase
        .from("stock_matrix_details")
        .select("id")
        .eq("stock_sheet_id", sheetId)
        .eq("product_id", product.product_id)
        .maybeSingle()

      if (checkError) {
        console.error("Error al verificar detalle existente:", checkError)
        continue
      }

      if (existingDetail) {
        // Actualizar detalle existente
        const { error: updateError } = await supabase
          .from("stock_matrix_details")
          .update(detailData)
          .eq("id", existingDetail.id)

        if (updateError) {
          console.error("Error al actualizar detalle:", updateError)
        }
      } else {
        // Insertar nuevo detalle
        const { error: insertError } = await supabase.from("stock_matrix_details").insert(detailData)

        if (insertError) {
          console.error("Error al insertar detalle:", insertError)
        }
      }
    }

    // Actualizar estado a completado
    setSheetData((prev) => ({
      ...prev,
      status: "completado",
    }))

    toast({
      title: "Planilla finalizada",
      description: "La planilla ha sido finalizada correctamente",
    })

    // Redirigir a la lista de planillas después de un breve retraso
    setTimeout(() => {
      router.push("/stock-matrix/list")
    }, 1500)
  } catch (error: any) {
    console.error("Error finalizing data:", error.message)
    toast({
      title: "Error",
      description: error.message || "No se pudo finalizar la planilla",
      variant: "destructive",
    })
  } finally {
    setIsLoading(false)
  }
}

// Exportar a Excel
const handleExportToExcel = () => {
  try {
    toast({
      title: "Exportando",
      description: "Exportando datos a Excel...",
    })
    // Aquí iría la lógica para exportar a Excel
  } catch (err) {
    console.error("Error al exportar a Excel:", err)
  }
}

// Ver lista de planillas
const handleViewSheetList = () => {
  try {
    router.push("/stock-matrix/list")
  } catch (err) {
    console.error("Error al navegar a la lista de planillas:", err)
  }
}

// Simplificar la función loadExistingSheet para no verificar autenticación
const loadExistingSheet = async (sheetId: number) => {
  try {
    setIsLoading(true)
    const supabase = createClient()

    // Cargar datos de la planilla
    const { data: sheetData, error: sheetError } = await supabase
      .from("stock_matrix_sheets")
      .select("*")
      .eq("id", sheetId)
      .single()

    if (sheetError) {
      console.error("Error al cargar la planilla:", sheetError)

      // Si el error es 'no se encontró el registro', manejarlo de forma amigable
      if (sheetError.code === "PGRST116") {
        toast({
          title: "Planilla no encontrada",
          description: "La planilla que intentas ver no existe o ha sido eliminada",
          variant: "destructive",
        })
        // Redirigir a la lista de planillas después de un breve retraso
        setTimeout(() => {
          router.push("/stock-matrix/list")
        }, 1500)
        return
      }

      throw new Error("No se pudo cargar la planilla")
    }

    // Verificar si la planilla está completada
    if (sheetData.status === "completado") {
      toast({
        title: "Planilla finalizada",
        description: "Esta planilla ya ha sido finalizada y no puede ser editada",
      })
    }

    // Actualizar el estado con los datos de la planilla
    setSheetData({
      id: sheetData.id,
      date: sheetData.date,
      location_id: sheetData.location_id,
      manager_id: sheetData.manager_id,
      shift: sheetData.shift,
      status: sheetData.status,
      created_by: sheetData.created_by || "Usuario Actual",
      updated_by: sheetData.updated_by || "Usuario Actual",
    })

    // Cargar los detalles de la planilla
    const { data: detailsData, error: detailsError } = await supabase
      .from("stock_matrix_details")
      .select("*")
      .eq("stock_sheet_id", sheetId)

    if (detailsError) {
      console.error("Error al cargar los detalles:", detailsError)
      throw new Error("No se pudieron cargar los detalles de la planilla")
    }

    // Actualizar el estado de los productos con los datos cargados
    if (detailsData && detailsData.length > 0) {
      setStockData((prev) => {
        return prev.map((product) => {
          // Buscar si existe un detalle para este producto
          const detail = detailsData.find((d) => d.product_id === product.product_id)
          if (detail) {
            return {
              ...product,
              id: detail.id,
              stock_sheet_id: detail.stock_sheet_id,
              opening_quantity: detail.opening_quantity,
              opening_locked: detail.opening_locked,
              incoming_quantity: detail.incoming_quantity,
              incoming_locked: detail.incoming_locked,
              closing_quantity: detail.closing_quantity,
              closing_locked: detail.closing_locked,
              units_sold: detail.units_sold,
              discarded_quantity: detail.discarded_quantity,
              internal_consumption: detail.internal_consumption,
              difference: detail.difference,
            }
          }
          return product
        })
      })
    }

    toast({
      title: "Planilla cargada",
      description: "Los datos de la planilla se han cargado correctamente",
    })
  } catch (error: any) {
    console.error("Error loading sheet:", error.message)
    toast({
      title: "Error",
      description: error.message || "No se pudo cargar la planilla",
      variant: "destructive",
    })

    // En caso de error, redirigir a la lista de planillas
    setTimeout(() => {
      router.push("/stock-matrix/list")
    }, 1500)
  } finally {
    setIsLoading(false)
  }
}

// Eliminar la función handleRetryAuth ya que no la necesitamos

// Simplificar la función handleLogin
const handleLogin = () => {
  router.push("/login")
}

// Modificar la sección de renderizado condicional para errores de autenticación
// Eliminar completamente esta sección:
/*
if (authError) {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <Card className="border-amber-300">
          <CardHeader>
            <CardTitle className="text-amber-600">Advertencia de autenticación</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-10 space-y-6">
            <p>{authError}</p>
            <div className="flex gap-4">
              <Button onClick={handleRetryAuth} variant="outline">
                Reintentar
              </Button>
              <Button onClick={handleLogin}>Iniciar sesión</Button>
              <Button onClick={() => setAuthError(null)}>Continuar de todos modos



