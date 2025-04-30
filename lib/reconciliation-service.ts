import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Interfaces
interface StockDiscrepancy {
  id: string
  date: string
  localId: string
  productId: string
  productName: string
  expectedQuantity: number
  actualQuantity: number
  difference: number
  unitCost: number
  totalValue: number
  status: "pending" | "reconciled" | "unreconciled"
  reconciliationId?: string
}

interface CashDiscrepancy {
  id: string
  date: string
  localId: string
  paymentMethod: "cash" | "bank" | "card" | "other"
  expectedAmount: number
  actualAmount: number
  difference: number
  status: "pending" | "reconciled" | "unreconciled"
  reconciliationId?: string
}

interface ReconciliationMatch {
  id: string
  stockDiscrepancyId: string
  cashDiscrepancyId: string
  stockValue: number
  cashValue: number
  confidence: number
}

export class ReconciliationService {
  // Obtener discrepancias de stock
  static async getStockDiscrepancies(date: string, localId: string): Promise<StockDiscrepancy[]> {
    const supabase = createClientComponentClient()

    try {
      // Obtener datos de la tabla stock_matrix_sheets para la fecha y local
      const { data: sheets, error: sheetsError } = await supabase
        .from("stock_matrix_sheets")
        .select("id, date")
        .eq("date", date)
        .eq("location_id", localId)
        .eq("status", "completado")

      if (sheetsError) throw sheetsError

      if (!sheets || sheets.length === 0) {
        return []
      }

      // Obtener los detalles de stock para las planillas encontradas
      const sheetIds = sheets.map((sheet) => sheet.id)

      const { data: details, error: detailsError } = await supabase
        .from("stock_matrix_details")
        .select("*")
        .in("stock_sheet_id", sheetIds)
        .not("difference", "is", null)
        .not("difference", "eq", 0)

      if (detailsError) throw detailsError

      if (!details || details.length === 0) {
        return []
      }

      // Transformar los datos al formato requerido
      const stockDiscrepancies: StockDiscrepancy[] = details.map((detail) => ({
        id: detail.id,
        date,
        localId,
        productId: detail.product_id,
        productName: detail.product_name,
        expectedQuantity: this.calculateExpectedQuantity(detail),
        actualQuantity: detail.closing_quantity || 0,
        difference: detail.difference,
        unitCost: detail.unit_value || 0,
        totalValue: (detail.difference || 0) * (detail.unit_value || 0),
        status: "pending",
      }))

      return stockDiscrepancies
    } catch (error) {
      console.error("Error al obtener discrepancias de stock:", error)
      throw error
    }
  }

  // Calcular cantidad esperada de stock
  private static calculateExpectedQuantity(detail: any): number {
    // Fórmula: Cierre + Venta + Consumos + Decomisados - Ingresos - Apertura
    // Por lo tanto: Esperado = Apertura + Ingresos - Consumos - Decomisados - Vendidas
    const opening = detail.opening_quantity || 0
    const incoming = detail.incoming_quantity || 0
    const sold = detail.units_sold || 0
    const discarded = detail.discarded_quantity || 0
    const consumption = detail.internal_consumption || 0

    return opening + incoming - consumption - discarded - sold
  }

  // Obtener discrepancias de caja
  static async getCashDiscrepancies(date: string, localId: string): Promise<CashDiscrepancy[]> {
    const supabase = createClientComponentClient()

    try {
      // Obtener datos de la tabla cash_register_closings para la fecha y local
      const { data: closings, error: closingsError } = await supabase
        .from("cash_register_closings")
        .select("*")
        .eq("date", date)
        .eq("local_id", localId)
        .not("status", "eq", "pendiente")

      if (closingsError) throw closingsError

      if (!closings || closings.length === 0) {
        return []
      }

      // Transformar los datos al formato requerido
      const cashDiscrepancies: CashDiscrepancy[] = []

      for (const closing of closings) {
        // Discrepancia de efectivo
        if (closing.difference !== 0) {
          cashDiscrepancies.push({
            id: `cash-${closing.id}`,
            date,
            localId,
            paymentMethod: "cash",
            expectedAmount: closing.expected_balance || 0,
            actualAmount: closing.actual_balance || 0,
            difference: closing.difference || 0,
            status: "pending",
          })
        }

        // Discrepancia de posnet
        if (closing.posnet_difference !== 0) {
          cashDiscrepancies.push({
            id: `card-${closing.id}`,
            date,
            localId,
            paymentMethod: "card",
            expectedAmount: closing.credit_card_sales || 0,
            actualAmount: closing.posnet_impreso || 0,
            difference: closing.posnet_difference || 0,
            status: "pending",
          })
        }
      }

      return cashDiscrepancies
    } catch (error) {
      console.error("Error al obtener discrepancias de caja:", error)
      throw error
    }
  }

  // Obtener conciliaciones existentes
  static async getReconciliations(date: string, localId: string) {
    const supabase = createClientComponentClient()

    try {
      // Verificar si existe la tabla de conciliaciones
      const { data: tableExists, error: tableError } = await supabase
        .from("reconciliations")
        .select("id")
        .limit(1)
        .maybeSingle()

      // Si la tabla no existe, devolver un array vacío
      if (tableError && tableError.code === "PGRST116") {
        return []
      }

      if (tableError) throw tableError

      // Obtener conciliaciones para la fecha y local
      const { data: reconciliations, error: reconciliationsError } = await supabase
        .from("reconciliations")
        .select("*, reconciliation_details(*)")
        .eq("date", date)
        .eq("local_id", localId)

      if (reconciliationsError) throw reconciliationsError

      return reconciliations || []
    } catch (error) {
      console.error("Error al obtener conciliaciones:", error)
      throw error
    }
  }

  // Ejecutar conciliación automática
  static async autoReconcile(stockDiscrepancies: StockDiscrepancy[], cashDiscrepancies: CashDiscrepancy[]) {
    try {
      // Algoritmo de conciliación automática
      const matches: ReconciliationMatch[] = []
      let matchId = 1

      // 1. Buscar coincidencias exactas (mismo valor absoluto)
      for (const stockItem of stockDiscrepancies) {
        for (const cashItem of cashDiscrepancies) {
          // Si el valor absoluto de ambas discrepancias es igual, es una coincidencia perfecta
          if (Math.abs(stockItem.totalValue) === Math.abs(cashItem.difference)) {
            matches.push({
              id: `match-${matchId++}`,
              stockDiscrepancyId: stockItem.id,
              cashDiscrepancyId: cashItem.id,
              stockValue: stockItem.totalValue,
              cashValue: cashItem.difference,
              confidence: 100,
            })

            // Marcar como procesados para no usarlos en otras coincidencias
            stockItem.status = "reconciled"
            cashItem.status = "reconciled"
          }
        }
      }

      // 2. Buscar coincidencias aproximadas (dentro de un margen de error del 5%)
      const unprocessedStock = stockDiscrepancies.filter((item) => item.status === "pending")
      const unprocessedCash = cashDiscrepancies.filter((item) => item.status === "pending")

      for (const stockItem of unprocessedStock) {
        for (const cashItem of unprocessedCash) {
          const stockValue = Math.abs(stockItem.totalValue)
          const cashValue = Math.abs(cashItem.difference)

          // Calcular la diferencia porcentual
          const maxValue = Math.max(stockValue, cashValue)
          const minValue = Math.min(stockValue, cashValue)

          if (maxValue === 0) continue

          const percentageDiff = ((maxValue - minValue) / maxValue) * 100

          // Si la diferencia es menor al 5%, considerar como coincidencia
          if (percentageDiff <= 5) {
            const confidence = 100 - percentageDiff

            matches.push({
              id: `match-${matchId++}`,
              stockDiscrepancyId: stockItem.id,
              cashDiscrepancyId: cashItem.id,
              stockValue: stockItem.totalValue,
              cashValue: cashItem.difference,
              confidence,
            })

            // Marcar como procesados
            stockItem.status = "reconciled"
            cashItem.status = "reconciled"
          }
        }
      }

      // 3. Buscar combinaciones de discrepancias que puedan coincidir
      // (Esta parte es más compleja y se implementaría en una versión futura)

      return {
        matches,
        unprocessedStock: stockDiscrepancies.filter((item) => item.status === "pending"),
        unprocessedCash: cashDiscrepancies.filter((item) => item.status === "pending"),
      }
    } catch (error) {
      console.error("Error en conciliación automática:", error)
      throw error
    }
  }

  // Guardar conciliaciones
  static async saveReconciliations(matches: ReconciliationMatch[], date: string, localId: string, localName: string) {
    const supabase = createClientComponentClient()

    try {
      // 1. Verificar si existen las tablas necesarias
      try {
        const { error: tableCheckError } = await supabase.from("reconciliations").select("id").limit(1)

        // Si la tabla no existe, crearla
        if (tableCheckError && tableCheckError.code === "PGRST116") {
          await this.createReconciliationTables()
        } else if (tableCheckError) {
          throw tableCheckError
        }
      } catch (checkError) {
        console.error("Error al verificar tablas:", checkError)
        throw new Error("No se pudo verificar la existencia de las tablas necesarias")
      }

      // 2. Crear una nueva conciliación
      const totalStockValue = matches.reduce((sum, match) => sum + Math.abs(match.stockValue), 0)
      const totalCashValue = matches.reduce((sum, match) => sum + Math.abs(match.cashValue), 0)

      const { data: reconciliation, error: reconciliationError } = await supabase
        .from("reconciliations")
        .insert({
          date,
          local_id: localId,
          local_name: localName,
          total_stock_value: totalStockValue,
          total_cash_value: totalCashValue,
          difference: totalStockValue - totalCashValue,
          status: "approved",
          notes: "Conciliación automática",
          created_by: "Sistema",
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (reconciliationError) throw reconciliationError

      // 3. Crear los detalles de la conciliación
      const reconciliationId = reconciliation.id

      for (const match of matches) {
        const { error: detailError } = await supabase.from("reconciliation_details").insert({
          reconciliation_id: reconciliationId,
          stock_discrepancy_id: match.stockDiscrepancyId,
          cash_discrepancy_id: match.cashDiscrepancyId,
          matched_value: Math.abs(match.stockValue),
          notes: `Confianza: ${match.confidence.toFixed(1)}%`,
        })

        if (detailError) {
          console.error("Error al insertar detalle:", detailError)
        }
      }

      return reconciliation
    } catch (error) {
      console.error("Error al guardar conciliaciones:", error)
      throw error
    }
  }

  // Crear tablas de conciliación si no existen
  private static async createReconciliationTables() {
    const supabase = createClientComponentClient()

    try {
      // Crear tabla de conciliaciones
      await supabase.rpc("create_reconciliation_tables")

      console.log("Tablas de conciliación creadas correctamente")
    } catch (error) {
      console.error("Error al crear tablas de conciliación:", error)
      throw error
    }
  }
}
