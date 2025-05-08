"use client"

import { useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
} from "chart.js"
import { Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase/client"
import { format, subDays, eachDayOfInterval } from "date-fns"

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

interface DiscrepancyTrendProps {
  type: "stock" | "cash"
  dateRange: "day" | "week" | "month"
}

export function DiscrepancyTrend({ type, dateRange }: DiscrepancyTrendProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [chartData, setChartData] = useState<ChartData<"line">>({
    labels: [],
    datasets: [],
  })

  useEffect(() => {
    loadTrendData()
  }, [type, dateRange])

  const loadTrendData = async () => {
    try {
      setIsLoading(true)

      // Calcular el rango de fechas
      const endDate = new Date()
      let startDate: Date

      switch (dateRange) {
        case "day":
          startDate = subDays(endDate, 7) // Últimos 7 días
          break
        case "week":
          startDate = subDays(endDate, 30) // Últimos 30 días
          break
        case "month":
          startDate = subDays(endDate, 90) // Últimos 90 días
          break
        default:
          startDate = subDays(endDate, 7)
      }

      // Generar array de fechas para el intervalo
      const dateInterval = eachDayOfInterval({ start: startDate, end: endDate })
      const dateLabels = dateInterval.map((date) => format(date, "dd/MM"))

      // Obtener datos de la base de datos
      const tableName = type === "stock" ? "stock_discrepancies" : "cash_discrepancies"
      const { data, error } = await supabase
        .from(tableName)
        .select("date, count(*)")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .group("date")
        .order("date")

      if (error) {
        console.error(`Error al cargar tendencia de ${type}:`, error)
        throw error
      }

      // Crear mapa de fechas a conteos
      const countMap = new Map()
      data?.forEach((item) => {
        countMap.set(item.date, Number.parseInt(item.count))
      })

      // Generar datos para el gráfico
      const chartValues = dateLabels.map((label) => {
        const dbDate = format(
          new Date(`${label.split("/")[1]}/${label.split("/")[0]}/${new Date().getFullYear()}`),
          "yyyy-MM-dd",
        )
        return countMap.get(dbDate) || 0
      })

      // Configurar datos del gráfico
      setChartData({
        labels: dateLabels,
        datasets: [
          {
            label: type === "stock" ? "Discrepancias de Stock" : "Discrepancias de Caja",
            data: chartValues,
            borderColor: type === "stock" ? "rgb(53, 162, 235)" : "rgb(255, 99, 132)",
            backgroundColor: type === "stock" ? "rgba(53, 162, 235, 0.5)" : "rgba(255, 99, 132, 0.5)",
            tension: 0.3,
          },
        ],
      })
    } catch (error) {
      console.error(`Error al cargar tendencia de ${type}:`, error)

      // Generar datos de ejemplo en caso de error
      const labels = Array.from({ length: 7 }, (_, i) => format(subDays(new Date(), 6 - i), "dd/MM"))
      const data = Array.from({ length: 7 }, () => Math.floor(Math.random() * 20))

      setChartData({
        labels,
        datasets: [
          {
            label:
              type === "stock"
                ? "Discrepancias de Stock (Datos de ejemplo)"
                : "Discrepancias de Caja (Datos de ejemplo)",
            data,
            borderColor: type === "stock" ? "rgb(53, 162, 235)" : "rgb(255, 99, 132)",
            backgroundColor: type === "stock" ? "rgba(53, 162, 235, 0.5)" : "rgba(255, 99, 132, 0.5)",
            tension: 0.3,
          },
        ],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
        },
      },
    },
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return <Line data={chartData} options={options} />
}
