"use client"

import { useState, useEffect } from "react"
import DatePicker, { registerLocale } from "react-datepicker"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Registrar el idioma español
registerLocale("es", es)

interface SimpleDatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function SimpleDatePicker({ date, setDate, className }: SimpleDatePickerProps) {
  // Estado local para manejar la fecha
  const [selectedDate, setSelectedDate] = useState<Date>(date)

  // Actualizar el estado local cuando cambia la prop date
  useEffect(() => {
    setSelectedDate(date)
  }, [date])

  // Función para manejar el cambio de fecha
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Crear una nueva fecha con solo año, mes y día (sin hora)
      const newDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

      // Imprimir información de depuración
      console.log("Fecha seleccionada:", newDate.toLocaleString())
      console.log("Día:", newDate.getDate())
      console.log("Mes:", newDate.getMonth() + 1)
      console.log("Año:", newDate.getFullYear())

      setSelectedDate(newDate)
      setDate(newDate)
    }
  }

  return (
    <div className={cn("relative", className)}>
      <DatePicker
        selected={selectedDate}
        onChange={handleDateChange}
        locale="es"
        dateFormat="dd/MM/yyyy"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        customInput={
          <Button variant="outline" className="w-full justify-start text-left font-normal">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? selectedDate.toLocaleDateString("es-ES") : "Seleccionar fecha"}
          </Button>
        }
        showMonthDropdown
        showYearDropdown
        dropdownMode="select"
        todayButton="Hoy"
        isClearable={false}
        popperClassName="z-50"
        popperPlacement="bottom-start"
        popperModifiers={[
          {
            name: "offset",
            options: {
              offset: [0, 8],
            },
          },
          {
            name: "preventOverflow",
            options: {
              boundary: "viewport",
            },
          },
        ]}
      />
    </div>
  )
}











