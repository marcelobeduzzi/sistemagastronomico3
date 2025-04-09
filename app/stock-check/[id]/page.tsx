"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Printer } from "lucide-react"
import Link from "next/link"
import { StockSheetDetail } from "@/components/stock-check/stock-sheet-detail"
import { useParams } from "next/navigation"
import { supabase } from "@/lib/supabase-client"
import { DashboardLayout } from "@/app/dashboard-layout"

export default function StockSheetDetailPage() {
  const { id } = useParams()
  const [stockSheet, setStockSheet] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStockSheet() {
      try {
        const { data, error } = await supabase
          .from("stock_sheets")
          .select("*, stock_sheet_items(*)")
          .eq("id", id)
          .single()

        if (error) throw error
        setStockSheet(data)
      } catch (error) {
        console.error("Error fetching stock sheet:", error)
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchStockSheet()
    }
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Button asChild variant="outline" className="mr-4">
              <Link href="/stock-check">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Volver
              </Link>
            </Button>
            <h1 className="text-2xl font-bold tracking-tight">Detalle de Planilla {stockSheet?.name || ""}</h1>
          </div>
          <Button onClick={handlePrint} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Planilla de Stock</CardTitle>
            <CardDescription>Detalle de la planilla de stock y sus productos</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>Cargando...</div>
            ) : stockSheet ? (
              <StockSheetDetail stockSheet={stockSheet} />
            ) : (
              <div>No se encontró la planilla de stock</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
