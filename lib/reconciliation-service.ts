import { supabase } from "@/lib/supabase/client"

export const ReconciliationService = {
  // Obtener la última fecha con discrepancias para un local
  async getLastDiscrepancyDate(localId: number) {
    return await supabase
      .from("stock_discrepancies")
      .select("date, shift")
      .eq("location_id", localId)
      .order("date", { ascending: false })
      .limit(1)
  },

  // Obtener discrepancias de stock para un local y fecha específicos
  async getStockDiscrepancies(date: string, localId: number, shift?: string) {
    try {
      if (!date || !localId) {
        console.error("Fecha o ID de local no proporcionados")
        return []
      }

      let query = supabase
        .from("stock_discrepancies")
        .select(`
        id,
        date,
        location_id,
        shift,
        product_id,
        product_name,
        category,
        expected_quantity,
        actual_quantity,
        difference,
        unit_cost,
        total_value,
        status,
        reconciliation_id
      `)
        .eq("date", date)
        .eq("location_id", localId)

      if (shift) {
        query = query.eq("shift", shift)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error en getStockDiscrepancies:", error)
        return []
      }

      // Mapear los datos a un formato más amigable
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        productId: item.product_id,
        productName: item.product_name || "Producto sin nombre",
        category: item.category || "Sin categoría",
        expectedQuantity: item.expected_quantity || 0,
        actualQuantity: item.actual_quantity || 0,
        difference: item.difference || 0,
        unitCost: item.unit_cost || 0,
        totalValue: item.total_value || 0,
        status: item.status || "pending",
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error en getStockDiscrepancies:", error)
      return []
    }
  },

  // Obtener discrepancias de stock para todos los locales
  async getStockDiscrepanciesAllLocations(date: string, shift?: string) {
    try {
      let query = supabase
        .from("stock_discrepancies")
        .select(`
          id,
          date,
          location_id,
          shift,
          product_id,
          product_name,
          category,
          expected_quantity,
          actual_quantity,
          difference,
          unit_cost,
          total_value,
          status,
          reconciliation_id
        `)
        .eq("date", date)

      if (shift) {
        query = query.eq("shift", shift)
      }

      const { data, error } = await query

      if (error) throw error

      // Mapear los datos a un formato más amigable
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        productId: item.product_id,
        productName: item.product_name,
        category: item.category,
        expectedQuantity: item.expected_quantity,
        actualQuantity: item.actual_quantity,
        difference: item.difference,
        unitCost: item.unit_cost,
        totalValue: item.total_value,
        status: item.status,
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error en getStockDiscrepanciesAllLocations:", error)
      return []
    }
  },

  // Obtener discrepancias de caja para un local y fecha específicos
  async getCashDiscrepancies(date: string, localId: number, shift?: string) {
    try {
      if (!date || !localId) {
        console.error("Fecha o ID de local no proporcionados")
        return []
      }

      let query = supabase
        .from("cash_discrepancies")
        .select(`
        id,
        date,
        location_id,
        shift,
        payment_method,
        expected_amount,
        actual_amount,
        difference,
        status,
        reconciliation_id
      `)
        .eq("date", date)
        .eq("location_id", localId)

      if (shift) {
        query = query.eq("shift", shift)
      }

      const { data, error } = await query

      if (error) {
        console.error("Error en getCashDiscrepancies:", error)
        return []
      }

      // Mapear los datos a un formato más amigable
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        paymentMethod: item.payment_method || "unknown",
        expectedAmount: item.expected_amount || 0,
        actualAmount: item.actual_amount || 0,
        difference: item.difference || 0,
        status: item.status || "pending",
        reconciliationId: item.reconciliation_id,
      }))
    } catch (error) {
      console.error("Error en getCashDiscrepancies:", error)
      return []
    }
  },

  // Obtener discrepancias de caja para todos los locales
  async getCashDiscrepanciesAllLocations(date: string, shift?: string) {
    try {
      let query = supabase
        .from("cash_discrepancies")
        .select(`
          id,
          date,
          location_id,
          shift,
          payment_method,
          expected_amount,
          actual_amount,
          difference,
          status,
          reconciliation_id
        `)
        .eq("date", date)

      if (shift) {
        query = query.eq("shift", shift)
      }

      const { data, error } = await query

      if (error) throw error

      // Mapear los datos a un formato más amigable
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
      console.error("Error en getCashDiscrepanciesAllLocations:", error)
      return []
    }
  },

  // Obtener conciliaciones existentes
  async getReconciliations(date: string, localId?: number, shift?: string) {
    try {
      let query = supabase
        .from("reconciliations")
        .select(`
          id,
          date,
          location_id,
          shift,
          total_stock_value,
          total_cash_value,
          difference,
          status,
          notes,
          created_by,
          created_at,
          reconciliation_details (*)
        `)
        .eq("date", date)

      if (localId) {
        query = query.eq("location_id", localId)
      }

      if (shift) {
        query = query.eq("shift", shift)
      }

      const { data, error } = await query

      if (error) throw error

      // Mapear los datos a un formato más amigable
      return (data || []).map((item) => ({
        id: item.id,
        date: item.date,
        localId: item.location_id,
        shift: item.shift,
        totalStockValue: item.total_stock_value,
        totalCashValue: item.total_cash_value,
        difference: item.difference,
        status: item.status,
        notes: item.notes,
        createdBy: item.created_by,
        createdAt: item.created_at,
        details: item.reconciliation_details,
      }))
    } catch (error) {
      console.error("Error en getReconciliations:", error)
      return []
    }
  },

  // Ejecutar conciliación automática
  async autoReconcile(stockDiscrepancies: any[], cashDiscrepancies: any[]) {
    try {
      // Algoritmo simple de conciliación automática
      const matches = []
      const usedStockIds = new Set()
      const usedCashIds = new Set()

      // Ordenar discrepancias por valor absoluto (de mayor a menor)
      const sortedStock = [...stockDiscrepancies].sort((a, b) => Math.abs(b.totalValue) - Math.abs(a.totalValue))

      const sortedCash = [...cashDiscrepancies].sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))

      // Intentar emparejar discrepancias con valores similares
      for (const stockItem of sortedStock) {
        if (usedStockIds.has(stockItem.id)) continue

        const stockValue = stockItem.totalValue

        for (const cashItem of sortedCash) {
          if (usedCashIds.has(cashItem.id)) continue

          const cashValue = cashItem.difference

          // Calcular la diferencia porcentual entre los valores
          const maxValue = Math.max(Math.abs(stockValue), Math.abs(cashValue))
          const difference = Math.abs(Math.abs(stockValue) - Math.abs(cashValue))
          const percentDifference = maxValue > 0 ? (difference / maxValue) * 100 : 0

          // Si la diferencia es menor al 20%, considerar como una coincidencia
          if (percentDifference <= 20) {
            const confidence = 100 - percentDifference

            matches.push({
              id: `match-${stockItem.id}-${cashItem.id}`,
              stockDiscrepancyId: stockItem.id,
              cashDiscrepancyId: cashItem.id,
              stockValue: stockValue,
              cashValue: cashValue,
              confidence: Math.round(confidence),
              selected: confidence >= 90, // Preseleccionar coincidencias con alta confianza
            })

            usedStockIds.add(stockItem.id)
            usedCashIds.add(cashItem.id)
            break
          }
        }
      }

      return {
        matches,
        unmatchedStock: stockDiscrepancies.filter((item) => !usedStockIds.has(item.id)),
        unmatchedCash: cashDiscrepancies.filter((item) => !usedCashIds.has(item.id)),
      }
    } catch (error) {
      console.error("Error en autoReconcile:", error)
      throw error
    }
  },

  // Guardar conciliaciones
  async saveReconciliations(matches: any[], date: string, localId: number | null, localName: string, shift: string) {
    try {
      // Crear una nueva conciliación
      const { data: reconciliation, error: reconciliationError } = await supabase
        .from("reconciliations")
        .insert({
          date,
          location_id: localId,
          location_name: localName,
          shift,
          total_stock_value: matches.reduce((sum, match) => sum + Math.abs(match.stockValue), 0),
          total_cash_value: matches.reduce((sum, match) => sum + Math.abs(match.cashValue), 0),
          difference: 0, // Calcular la diferencia
          status: "completed",
          notes: `Conciliación automática generada el ${new Date().toLocaleString()}`,
        })
        .select("id")
        .single()

      if (reconciliationError) throw reconciliationError

      const reconciliationId = reconciliation.id

      // Crear detalles de conciliación para cada coincidencia
      for (const match of matches) {
        // Actualizar el estado de la discrepancia de stock
        await supabase
          .from("stock_discrepancies")
          .update({
            status: "reconciled",
            reconciliation_id: reconciliationId,
          })
          .eq("id", match.stockDiscrepancyId)

        // Actualizar el estado de la discrepancia de caja
        await supabase
          .from("cash_discrepancies")
          .update({
            status: "reconciled",
            reconciliation_id: reconciliationId,
          })
          .eq("id", match.cashDiscrepancyId)

        // Crear detalle de conciliación
        await supabase.from("reconciliation_details").insert({
          reconciliation_id: reconciliationId,
          stock_discrepancy_id: match.stockDiscrepancyId,
          cash_discrepancy_id: match.cashDiscrepancyId,
          matched_value: Math.min(Math.abs(match.stockValue), Math.abs(match.cashValue)),
          notes: `Coincidencia automática con confianza del ${match.confidence}%`,
        })
      }

      return { success: true, reconciliationId }
    } catch (error) {
      console.error("Error en saveReconciliations:", error)
      throw error
    }
  },
}
