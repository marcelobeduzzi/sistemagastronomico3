// Archivo para implementar el servicio de reconciliación
// Este archivo debe estar en la ruta que se importa en conciliacion-content.tsx

export const ReconciliationService = {
  // Obtener discrepancias de stock
  getStockDiscrepancies: async (date: string, locationId: number | null, shift?: string) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de stock")
        return []
      }

      console.log(`Consultando discrepancias de stock para fecha: ${date}, local: ${locationId}, turno: ${shift || 'todos'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Construir la consulta base
      let query = supabase
        .from("stock_discrepancies")
        .select("*")
        .eq("date", date)
        .order("product_name")

      // Añadir filtro de local si se proporciona
      if (locationId !== null) {
        query = query.eq("location_id", locationId)
      }

      // Añadir filtro de turno si se proporciona
      if (shift) {
        query = query.eq("shift", shift)
      }

      // Ejecutar la consulta
      const { data, error } = await query

      if (error) {
        console.error("Error al obtener discrepancias de stock:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        productId: item.product_id,
        productName: item.product_name,
        expectedQuantity: item.expected_quantity,
        actualQuantity: item.actual_quantity,
        difference: item.difference,
        unitCost: item.unit_cost,
        totalValue: item.total_value,
        status: item.status,
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error al obtener discrepancias de stock:", error)
      // Si hay un error, devolver un array vacío para no romper la aplicación
      return []
    }
  },

  // Obtener discrepancias de caja
  getCashDiscrepancies: async (date: string, locationId: number | null, shift?: string) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de caja")
        return []
      }

      console.log(`Consultando discrepancias de caja para fecha: ${date}, local: ${locationId}, turno: ${shift || 'todos'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Construir la consulta base
      let query = supabase
        .from("cash_discrepancies")
        .select("*")
        .eq("date", date)
        .order("payment_method")

      // Añadir filtro de local si se proporciona
      if (locationId !== null) {
        query = query.eq("location_id", locationId)
      }

      // Añadir filtro de turno si se proporciona
      if (shift) {
        query = query.eq("shift", shift)
      }

      // Ejecutar la consulta
      const { data, error } = await query

      if (error) {
        console.error("Error al obtener discrepancias de caja:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        paymentMethod: item.payment_method,
        expectedAmount: item.expected_amount,
        actualAmount: item.actual_amount,
        difference: item.difference,
        status: item.status,
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error al obtener discrepancias de caja:", error)
      // Si hay un error, devolver un array vacío para no romper la aplicación
      return []
    }
  },

  // Obtener discrepancias de stock para todos los locales
  getStockDiscrepanciesAllLocations: async (date: string, shift?: string) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de stock")
        return []
      }

      console.log(`Consultando discrepancias de stock para todos los locales, fecha: ${date}, turno: ${shift || 'todos'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Construir la consulta base
      let query = supabase
        .from("stock_discrepancies")
        .select("*")
        .eq("date", date)
        .order("location_id")
        .order("product_name")

      // Añadir filtro de turno si se proporciona
      if (shift) {
        query = query.eq("shift", shift)
      }

      // Ejecutar la consulta
      const { data, error } = await query

      if (error) {
        console.error("Error al obtener discrepancias de stock para todos los locales:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        productId: item.product_id,
        productName: item.product_name,
        expectedQuantity: item.expected_quantity,
        actualQuantity: item.actual_quantity,
        difference: item.difference,
        unitCost: item.unit_cost,
        totalValue: item.total_value,
        status: item.status,
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error al obtener discrepancias de stock para todos los locales:", error)
      return []
    }
  },

  // Obtener discrepancias de caja para todos los locales
  getCashDiscrepanciesAllLocations: async (date: string, shift?: string) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de caja")
        return []
      }

      console.log(`Consultando discrepancias de caja para todos los locales, fecha: ${date}, turno: ${shift || 'todos'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Construir la consulta base
      let query = supabase
        .from("cash_discrepancies")
        .select("*")
        .eq("date", date)
        .order("location_id")
        .order("payment_method")

      // Añadir filtro de turno si se proporciona
      if (shift) {
        query = query.eq("shift", shift)
      }

      // Ejecutar la consulta
      const { data, error } = await query

      if (error) {
        console.error("Error al obtener discrepancias de caja para todos los locales:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        paymentMethod: item.payment_method,
        expectedAmount: item.expected_amount,
        actualAmount: item.actual_amount,
        difference: item.difference,
        status: item.status,
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error al obtener discrepancias de caja para todos los locales:", error)
      return []
    }
  },

  // Obtener conciliaciones
  getReconciliations: async (date: string, locationId: number | null, shift?: string) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de conciliaciones")
        return []
      }

      console.log(`Consultando conciliaciones para fecha: ${date}, local: ${locationId}, turno: ${shift || 'todos'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Construir la consulta base
      let query = supabase
        .from("reconciliations")
        .select("*")
        .eq("date", date)

      // Añadir filtro de local si se proporciona
      if (locationId !== null) {
        query = query.eq("location_id", locationId)
      }

      // Añadir filtro de turno si se proporciona
      if (shift) {
        query = query.eq("shift", shift)
      }

      // Ejecutar la consulta
      const { data: reconciliationsData, error: reconciliationsError } = await query

      if (reconciliationsError) {
        console.error("Error al obtener conciliaciones:", reconciliationsError)
        throw reconciliationsError
      }

      // Si no hay conciliaciones, devolver un array vacío
      if (!reconciliationsData || reconciliationsData.length === 0) {
        return []
      }

      // Para cada conciliación, obtener sus detalles
      const result = []
      for (const reconciliation of reconciliationsData) {
        const { data: detailsData, error: detailsError } = await supabase
          .from("reconciliation_details")
          .select("*")
          .eq("reconciliation_id", reconciliation.id)

        if (detailsError) {
          console.error("Error al obtener detalles de conciliación:", detailsError)
          continue
        }

        // Transformar los datos de snake_case a camelCase
        result.push({
          id: reconciliation.id,
          date: reconciliation.date,
          localId: reconciliation.location_id,
          shift: reconciliation.shift,
          totalStockValue: reconciliation.total_stock_value,
          totalCashValue: reconciliation.total_cash_value,
          difference: reconciliation.difference,
          status: reconciliation.status,
          notes: reconciliation.notes,
          createdBy: reconciliation.created_by,
          createdAt: reconciliation.created_at,
          details: (detailsData || []).map((detail) => ({
            id: detail.id,
            reconciliationId: detail.reconciliation_id,
            stockDiscrepancyId: detail.stock_discrepancy_id,
            cashDiscrepancyId: detail.cash_discrepancy_id,
            matchedValue: detail.matched_value,
            notes: detail.notes,
          })),
        })
      }

      return result
    } catch (error) {
      console.error("Error al obtener conciliaciones:", error)
      // Si hay un error, devolver un array vacío para no romper la aplicación
      return []
    }
  },

  // Conciliación automática
  autoReconcile: async (stockDiscrepancies, cashDiscrepancies) => {
    try {
      console.log("Ejecutando conciliación automática")

      // Algoritmo simple de conciliación:
      // Buscar discrepancias de stock y caja con valores similares
      const matches = []

      for (const stockItem of stockDiscrepancies) {
        for (const cashItem of cashDiscrepancies) {
          // Si ambos son del mismo día, local y turno
          if (stockItem.date === cashItem.date && 
              stockItem.localId === cashItem.localId &&
              stockItem.shift === cashItem.shift) {
            // Calcular la similitud entre los valores (valor absoluto de la diferencia)
            const stockValue = Math.abs(stockItem.totalValue)
            const cashValue = Math.abs(cashItem.difference)
            const valueDiff = Math.abs(stockValue - cashValue)

            // Si la diferencia es menor al 20% del valor mayor, considerarlo una coincidencia
            const maxValue = Math.max(stockValue, cashValue)
            const threshold = maxValue * 0.2

            if (valueDiff <= threshold) {
              // Calcular un porcentaje de confianza
              const confidence = 100 - (valueDiff / maxValue) * 100

              matches.push({
                id: `match-${stockItem.id}-${cashItem.id}`,
                stockDiscrepancyId: stockItem.id,
                cashDiscrepancyId: cashItem.id,
                stockValue: stockItem.totalValue,
                cashValue: cashItem.difference,
                confidence: Math.round(confidence),
                shift: stockItem.shift,
              })
            }
          }
        }
      }

      return {
        matches: matches.sort((a, b) => b.confidence - a.confidence), // Ordenar por confianza descendente
      }
    } catch (error) {
      console.error("Error en conciliación automática:", error)
      throw error
    }
  },

  // Guardar conciliaciones
  saveReconciliations: async (matches, date, localId, localName, shift) => {
    try {
      console.log(`Guardando conciliaciones para fecha: ${date}, local: ${localId}, turno: ${shift || 'no especificado'}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // 1. Crear una nueva conciliación
      const totalStockValue = matches.reduce((sum, match) => sum + Math.abs(match.stockValue), 0)
      const totalCashValue = matches.reduce((sum, match) => sum + Math.abs(match.cashValue), 0)

      const reconciliationData = {
        date: date,
        location_id: localId,
        shift: shift || matches[0]?.shift || 'mañana', // Usar el turno proporcionado o el del primer match
        total_stock_value: totalStockValue,
        total_cash_value: totalCashValue,
        difference: totalStockValue - totalCashValue,
        status: "draft",
        notes: `Conciliación automática para ${localName} del ${date}${shift ? ` (turno ${shift})` : ''}`,
        created_by: "Sistema",
      }

      const { data: insertedReconciliation, error: reconciliationError } = await supabase
        .from("reconciliations")
        .insert(reconciliationData)
        .select()

      if (reconciliationError) {
        console.error("Error al crear conciliación:", reconciliationError)
        throw reconciliationError
      }

      if (!insertedReconciliation || insertedReconciliation.length === 0) {
        throw new Error("No se pudo crear la conciliación")
      }

      const reconciliationId = insertedReconciliation[0].id

      // 2. Crear los detalles de la conciliación
      for (const match of matches) {
        const { error: detailError } = await supabase.from("reconciliation_details").insert({
          reconciliation_id: reconciliationId,
          stock_discrepancy_id: match.stockDiscrepancyId,
          cash_discrepancy_id: match.cashDiscrepancyId,
          matched_value: Math.min(Math.abs(match.stockValue), Math.abs(match.cashValue)),
          notes: `Coincidencia con confianza del ${match.confidence}%`,
        })

        if (detailError) {
          console.error("Error al crear detalle de conciliación:", detailError)
          // Continuar con los demás detalles
        }
      }

      // 3. Actualizar el estado de las discrepancias
      for (const match of matches) {
        // Actualizar discrepancia de stock
        const { error: stockError } = await supabase
          .from("stock_discrepancies")
          .update({
            status: "reconciled",
            reconciliation_id: reconciliationId,
          })
          .eq("id", match.stockDiscrepancyId)

        if (stockError) {
          console.error("Error al actualizar discrepancia de stock:", stockError)
        }

        // Actualizar discrepancia de caja
        const { error: cashError } = await supabase
          .from("cash_discrepancies")
          .update({
            status: "reconciled",
            reconciliation_id: reconciliationId,
          })
          .eq("id", match.cashDiscrepancyId)

        if (cashError) {
          console.error("Error al actualizar discrepancia de caja:", cashError)
        }
      }

      return reconciliationId
    } catch (error) {
      console.error("Error al guardar conciliaciones:", error)
      throw error
    }
  },

  // Generar discrepancias a partir de datos reales
  generateDiscrepancies: async (date: string, locationId: number, shift: string) => {
    try {
      // Validar parámetros
      if (!date || !locationId || !shift) {
        throw new Error("Fecha, ID de local y turno son obligatorios")
      }

      console.log(`Generando discrepancias para fecha: ${date}, local: ${locationId}, turno: ${shift}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Llamar al procedimiento almacenado
      const { error } = await supabase.rpc("generate_discrepancies", {
        p_date: date,
        p_location_id: locationId,
        p_shift: shift,
      })

      if (error) {
        console.error("Error al generar discrepancias:", error)
        throw error
      }

      return true
    } catch (error) {
      console.error("Error al generar discrepancias:", error)
      throw error
    }
  },
}