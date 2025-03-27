"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"

interface DatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  // Estado local para manejar la fecha
  const [selectedDate, setSelectedDate] = useState<Date>(date)

  // Actualizar el estado local cuando cambia la prop date
  useEffect(() => {
    setSelectedDate(date)
  }, [date])

  // Función para manejar el cambio de fecha de manera segura
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Importante: Crear una nueva fecha con valores específicos para evitar problemas de zona horaria
      // Usamos el constructor de Date directamente con año, mes, día
      const year = newDate.getFullYear()
      const month = newDate.getMonth()
      const day = newDate.getDate()

      // Crear la fecha con la hora fija a mediodía
      const correctedDate = new Date(year, month, day, 12, 0, 0)

      console.log("Fecha seleccionada (original):", newDate.toISOString())
      console.log("Fecha corregida:", correctedDate.toISOString())
      console.log("Fecha local:", correctedDate.toLocaleString())

      setSelectedDate(correctedDate)
      setDate(correctedDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn("w-full justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {selectedDate ? format(selectedDate, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            locale={es}
            initialFocus
            // Importante: Deshabilitar la selección de días fuera del mes actual
            disableOutsideDays={true}
            // Forzar que se muestren semanas completas
            fixedWeeks={true}
            // Añadir clases personalizadas para mejorar la visualización
            classNames={{
              day_selected: "bg-primary text-primary-foreground font-bold",
              day_today: "bg-accent text-accent-foreground font-medium",
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}















