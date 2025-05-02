"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { Loader2 } from "lucide-react"

interface DiscrepancyTrendProps {
  type: "stock" | "cash"
  dateRange: "day" | "week" | "month"
}

export function DiscrepancyTrend({ type, dateRange }: DiscrepancyTrendProps) {
  const [data, setData] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulación de carga de datos
    setIsLoading(true)

    // Generar datos de ejemplo basados en el tipo y rango de fecha
    setTimeout(() => {
      const days = dateRange === "day" ? 1 : dateRange === "week" ? 7 : 30
      const newData = Array.from({ length: days }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() - (days - i - 1))

        return {
          date: date.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }),
          cantidad: Math.floor(Math.random() * 20) + 1,
          valor: Math.floor(Math.random() * 50000) + 5000,
        }
      })

      setData(newData)
      setIsLoading(false)
    }, 1000)
  }, [type, dateRange])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart
        data={data}
        margin={{
          top: 5,
          right: 30,
          left: 20,
          bottom: 5,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis yAxisId="left" />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip />
        <Legend />
        <Line yAxisId="left" type="monotone" dataKey="cantidad" name="Cantidad" stroke="#8884d8" activeDot={{ r: 8 }} />
        <Line yAxisId="right" type="monotone" dataKey="valor" name="Valor ($)" stroke="#82ca9d" />
      </LineChart>
    </ResponsiveContainer>
  )
}
