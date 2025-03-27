"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import ReactDatePicker from "react-datepicker"
import "react-datepicker/dist/react-datepicker.css"

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
  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      // Crear una nueva fecha con la hora fija a mediodía para evitar problemas de zona horaria
      // Importante: Usar el constructor de Date con año, mes, día específicos
      const correctedDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0)

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
          <div className="p-4">
            <ReactDatePicker
              selected={selectedDate}
              onChange={handleDateChange}
              inline
              locale={es}
              fixedHeight
              showMonthDropdown
              showYearDropdown
              dropdownMode="select"
              todayButton="Hoy"
              dateFormat="dd/MM/yyyy"
              calendarClassName="border-none"
              renderCustomHeader={({
                date,
                changeYear,
                changeMonth,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex justify-between items-center px-2 py-2">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    type="button"
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    {"<"}
                  </button>

                  <div className="flex space-x-2">
                    <select
                      value={date.getMonth()}
                      onChange={({ target: { value } }) => changeMonth(Number.parseInt(value))}
                      className="p-1 text-sm border rounded"
                    >
                      {es.localize?.months("standalone").map((month, i) => (
                        <option key={month} value={i}>
                          {month}
                        </option>
                      ))}
                    </select>

                    <select
                      value={date.getFullYear()}
                      onChange={({ target: { value } }) => changeYear(Number.parseInt(value))}
                      className="p-1 text-sm border rounded"
                    >
                      {Array.from({ length: 10 }, (_, i) => date.getFullYear() - 5 + i).map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    type="button"
                    className="p-1 rounded-md border border-gray-300 hover:bg-gray-100"
                  >
                    {">"}
                  </button>
                </div>
              )}
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}













