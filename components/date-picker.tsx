"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { DayPicker } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  // Estado local para manejar la fecha
  const [selectedDate, setSelectedDate] = useState<Date>(date)
  const [month, setMonth] = useState<Date>(date)

  // Actualizar el estado local cuando cambia la prop date
  useEffect(() => {
    setSelectedDate(date)
    setMonth(date)
  }, [date])

  // Función para manejar el cambio de fecha de manera segura
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Importante: Crear una nueva fecha en UTC para evitar problemas de zona horaria
      // Usamos UTC para asegurarnos de que la fecha sea exactamente la que el usuario seleccionó
      const year = newDate.getUTCFullYear()
      const month = newDate.getUTCMonth()
      const day = newDate.getUTCDate()

      // Crear la fecha con la hora fija a mediodía en UTC
      const correctedDate = new Date(Date.UTC(year, month, day, 12, 0, 0))

      console.log("Fecha seleccionada (original):", newDate.toISOString())
      console.log("Fecha corregida (UTC):", correctedDate.toISOString())
      console.log("Fecha local:", new Date(correctedDate).toLocaleString())

      setSelectedDate(correctedDate)
      setDate(correctedDate)
    }
  }

  // Obtener el año y mes actual para el selector
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
  const months = [
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
          <div className="p-3 border-b">
            <div className="flex justify-between items-center gap-2">
              <select
                value={month.getMonth()}
                onChange={(e) => {
                  const newMonth = new Date(month)
                  newMonth.setMonth(Number.parseInt(e.target.value))
                  setMonth(newMonth)
                }}
                className="p-1 border rounded text-sm"
              >
                {months.map((monthName, index) => (
                  <option key={monthName} value={index}>
                    {monthName}
                  </option>
                ))}
              </select>
              <select
                value={month.getFullYear()}
                onChange={(e) => {
                  const newMonth = new Date(month)
                  newMonth.setFullYear(Number.parseInt(e.target.value))
                  setMonth(newMonth)
                }}
                className="p-1 border rounded text-sm"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            month={month}
            onMonthChange={setMonth}
            locale={es}
            showOutsideDays={true}
            fixedWeeks={true}
            className="p-3"
            // Importante: Usar UTC para evitar problemas de zona horaria
            fromDate={new Date(Date.UTC(currentYear - 5, 0, 1))}
            toDate={new Date(Date.UTC(currentYear + 5, 11, 31))}
            // Deshabilitar la selección de días fuera del mes actual para evitar confusiones
            disabled={{ before: undefined, after: undefined }}
            modifiersClassNames={{
              selected: "bg-primary text-primary-foreground",
              today: "bg-accent text-accent-foreground",
            }}
            classNames={{
              months: "flex flex-col",
              month: "space-y-4",
              caption: "flex justify-center pt-1 relative items-center",
              caption_label: "hidden", // Ocultar el título del mes/año ya que tenemos selectores
              nav: "space-x-1 flex items-center",
              nav_button: cn("h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 border rounded"),
              table: "w-full border-collapse space-y-1",
              head_row: "flex",
              head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
              row: "flex w-full mt-2",
              cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
              day: cn(
                "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground rounded-md",
              ),
              day_selected:
                "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
              day_today: "bg-accent text-accent-foreground",
              day_outside: "text-muted-foreground opacity-50",
              day_disabled: "text-muted-foreground opacity-50",
              day_hidden: "invisible",
            }}
          />
          <div className="p-3 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                const today = new Date()
                const utcToday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0))
                handleDateSelect(utcToday)
                setMonth(utcToday)
              }}
            >
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}












