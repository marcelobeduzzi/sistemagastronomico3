// Archivo para implementar el servicio de reconciliación
// Este archivo debe estar en la ruta que se importa en conciliacion-content.tsx

export const ReconciliationService = {
  // Obtener discrepancias de stock
  getStockDiscrepancies: async (date: string, locationId: number | null) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de stock")
        return []
      }

      // Validar que el locationId sea un número
      if (locationId === null) {
        console.error("ID de local no proporcionado para la consulta de discrepancias de stock")
        return []
      }

      console.log(`Consultando discrepancias de stock para fecha: ${date}, local: ${locationId}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Consultar la tabla stock_discrepancies
      const { data, error } = await supabase
        .from("stock_discrepancies")
        .select("*")
        .eq("date", date)
        .eq("location_id", locationId)
        .order("product_name")

      if (error) {
        console.error("Error al obtener discrepancias de stock:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
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
  getCashDiscrepancies: async (date: string, locationId: number | null) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de discrepancias de caja")
        return []
      }

      // Validar que el locationId sea un número
      if (locationId === null) {
        console.error("ID de local no proporcionado para la consulta de discrepancias de caja")
        return []
      }

      console.log(`Consultando discrepancias de caja para fecha: ${date}, local: ${locationId}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Consultar la tabla cash_discrepancies
      const { data, error } = await supabase
        .from("cash_discrepancies")
        .select("*")
        .eq("date", date)
        .eq("location_id", locationId)
        .order("payment_method")

      if (error) {
        console.error("Error al obtener discrepancias de caja:", error)
        throw error
      }

      // Transformar los datos de snake_case a camelCase
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
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

  // Obtener conciliaciones
  getReconciliations: async (date: string, locationId: number | null) => {
    try {
      // Validar que la fecha no esté vacía
      if (!date) {
        console.error("Fecha no proporcionada para la consulta de conciliaciones")
        return []
      }

      // Validar que el locationId sea un número
      if (locationId === null) {
        console.error("ID de local no proporcionado para la consulta de conciliaciones")
        return []
      }

      console.log(`Consultando conciliaciones para fecha: ${date}, local: ${locationId}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // Consultar la tabla reconciliations
      const { data: reconciliationsData, error: reconciliationsError } = await supabase
        .from("reconciliations")
        .select("*")
        .eq("date", date)
        .eq("location_id", locationId)

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
          // Si ambos son del mismo día y local
          if (stockItem.date === cashItem.date && stockItem.localId === cashItem.localId) {
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
  saveReconciliations: async (matches, date, localId, localName) => {
    try {
      console.log(`Guardando conciliaciones para fecha: ${date}, local: ${localId}`)

      // Importar supabase
      const { createClientComponentClient } = await import("@supabase/auth-helpers-nextjs")
      const supabase = createClientComponentClient()

      // 1. Crear una nueva conciliación
      const totalStockValue = matches.reduce((sum, match) => sum + Math.abs(match.stockValue), 0)
      const totalCashValue = matches.reduce((sum, match) => sum + Math.abs(match.cashValue), 0)

      const { data: reconciliationData, error: reconciliationError } = await supabase
        .from("reconciliations")
        .insert({
          date: date,
          location_id: localId,
          total_stock_value: totalStockValue,
          total_cash_value: totalCashValue,
          difference: totalStockValue - totalCashValue,
          status: "draft",
          notes: `Conciliación automática para ${localName} del ${date}`,
          created_by: "Sistema",
        })
        .select()

      if (reconciliationError) {
        console.error("Error al crear conciliación:", reconciliationError)
        throw reconciliationError
      }

      if (!reconciliationData || reconciliationData.length === 0) {
        throw new Error("No se pudo crear la conciliación")
      }

      const reconciliationId = reconciliationData[0].id

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
