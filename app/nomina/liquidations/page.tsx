"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DataTable } from "@/components/data-table"
import { toast } from "@/components/ui/use-toast"
import { formatCurrency, formatDate } from "@/lib/export-utils"
import { Plus, FileText, CheckCircle, Loader2 } from "lucide-react"
import { StatusBadge } from "@/components/status-badge"
import type { ColumnDef } from "@tanstack/react-table"
import type { Liquidation } from "@/types"

export default function LiquidationsPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [liquidations, setLiquidations] = useState<Liquidation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLiquidations()
  }, [])

  const fetchLiquidations = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from("liquidations")
        .select("*")
        .order("termination_date", { ascending: false })

      if (error) throw error
      setLiquidations(data || [])
    } catch (error) {
      console.error("Error fetching liquidations:", error)
      toast({
        title: "Error",
        description: "No se pudieron cargar las liquidaciones",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePayLiquidation = async (liquidation: Liquidation) => {
    try {
      const { error } = await supabase
        .from("liquidations")
        .update({
          is_paid: true,
          payment_date: new Date().toISOString(),
        })
        .eq("id", liquidation.id)

      if (error) throw error

      toast({
        title: "Liquidación pagada",
        description: "La liquidación ha sido marcada como pagada",
      })

      fetchLiquidations()
    } catch (error) {
      console.error("Error paying liquidation:", error)
      toast({
        title: "Error",
        description: "No se pudo procesar el pago",
        variant: "destructive",
      })
    }
  }

  const columns: ColumnDef<Liquidation>[] = [
    {
      accessorKey: "employee_id",
      header: "Empleado",
      cell: ({ row }) => {
        // En un caso real, aquí buscarías el nombre del empleado
        return "Empleado " + row.original.employee_id
      },
    },
    {
      accessorKey: "termination_date",
      header: "Fecha de Egreso",
      cell: ({ row }) => formatDate(row.original.termination_date),
    },
    {
      accessorKey: "worked_days",
      header: "Días Trabajados",
      cell: ({ row }) => `${row.original.worked_months} meses, ${row.original.worked_days} días`,
    },
    {
      accessorKey: "total_amount",
      header: "Total a Pagar",
      cell: ({ row }) => formatCurrency(row.original.total_amount),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ row }) => {
        if (row.original.is_paid) {
          return <StatusBadge status="Pagado" className="bg-green-100 text-green-800" />
        } else {
          return <StatusBadge status="Pendiente" className="bg-red-100 text-red-800" />
        }
      },
    },
    {
      id: "actions",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => router.push(`/nomina/liquidations/${row.original.id}`)}>
            <FileText className="mr-1 h-4 w-4" />
            Detalles
          </Button>
          {!row.original.is_paid && (
            <Button variant="outline" size="sm" onClick={() => handlePayLiquidation(row.original)}>
              <CheckCircle className="mr-1 h-4 w-4" />
              Marcar Pagado
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Liquidaciones</h1>
        <Button onClick={() => router.push("/nomina/liquidations/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Nueva Liquidación
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de Liquidaciones</CardTitle>
          <CardDescription>Gestione las liquidaciones de los empleados</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={liquidations}
              searchColumn="employee_id"
              searchPlaceholder="Buscar empleado..."
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
