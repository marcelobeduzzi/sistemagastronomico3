"use client"

import { useState, useEffect } from "react"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimpleDatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function SimpleDatePicker({ date, setDate, className }: SimpleDatePickerProps) {
  // Extraer año, mes y día de la fecha inicial
  const [day, setDay] = useState(date.getDate())
  const [month, setMonth] = useState(date.getMonth() + 1) // +1 porque getMonth() devuelve 0-11
  const [year, setYear] = useState(date.getFullYear())

  // Actualizar los estados locales cuando cambia la prop date
  useEffect(() => {
    setDay(date.getDate())
    setMonth(date.getMonth() + 1)
    setYear(date.getFullYear())
  }, [date])

  // Función para actualizar la fecha cuando cambia cualquier valor
  const updateDate = (newDay: number, newMonth: number, newYear: number) => {
    // Validar que los valores estén en rangos válidos
    if (newDay < 1) newDay = 1
    if (newDay > 31) newDay = 31
    if (newMonth < 1) newMonth = 1
    if (newMonth > 12) newMonth = 12
    if (newYear < 1900) newYear = 1900
    if (newYear > 2100) newYear = 2100

    // Ajustar el día si es necesario (por ejemplo, 31 de febrero no existe)
    const daysInMonth = new Date(newYear, newMonth, 0).getDate()
    if (newDay > daysInMonth) newDay = daysInMonth

    // Crear la nueva fecha con hora fija a mediodía
    const newDate = new Date(newYear, newMonth - 1, newDay, 12, 0, 0)

    // Actualizar los estados locales
    setDay(newDay)
    setMonth(newMonth)
    setYear(newYear)

    // Llamar a la función setDate del padre
    setDate(newDate)
  }

  // Función para establecer la fecha a hoy
  const setToday = () => {
    const today = new Date()
    updateDate(today.getDate(), today.getMonth() + 1, today.getFullYear())
  }

  // Obtener el nombre del mes actual
  const getMonthName = (monthNumber: number) => {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]
    return monthNames[monthNumber - 1]
  }

  // Formatear la fecha para mostrarla
  const formattedDate = `${day} de ${getMonthName(month)} de ${year}`

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-col space-y-2">
        <Button variant="outline" className="w-full justify-start text-left font-normal" onClick={() => setToday()}>
          <CalendarIcon className="mr-2 h-4 w-4" />
          {formattedDate}
        </Button>

        <div className="flex space-x-2">
          <div className="flex-1">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={day}
              onChange={(e) => updateDate(Number.parseInt(e.target.value), month, year)}
            >
              {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={month}
              onChange={(e) => updateDate(day, Number.parseInt(e.target.value), year)}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {getMonthName(m)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              value={year}
              onChange={(e) => updateDate(day, month, Number.parseInt(e.target.value))}
            >
              {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() - 10 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  )
}

