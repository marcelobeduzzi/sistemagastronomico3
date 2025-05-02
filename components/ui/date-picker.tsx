"use client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Interfaz para el DatePicker de rango (existente)
interface DateRangePickerProps {
  className?: string
  date: DateRange | undefined
  setDate: (date: DateRange | undefined) => void
  align?: "center" | "start" | "end"
  numberOfMonths?: number
}

// Interfaz para el DatePicker de fecha única (nuevo)
interface SingleDatePickerProps {
  className?: string
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  align?: "center" | "start" | "end"
  placeholder?: string
  format?: string
}

// Tipo unión para soportar ambos casos
type DatePickerProps = DateRangePickerProps | SingleDatePickerProps

// Función para determinar si es un DatePicker de rango o de fecha única
function isSingleDatePicker(props: DatePickerProps): props is SingleDatePickerProps {
  return "onDateChange" in props
}

export function DatePicker(props: DatePickerProps) {
  // Si es un DatePicker de fecha única
  if (isSingleDatePicker(props)) {
    const {
      className,
      date,
      onDateChange,
      align = "start",
      placeholder = "Seleccionar fecha",
      format: dateFormat = "PPP",
    } = props

    return (
      <div className={cn("grid gap-2", className)}>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className={cn("w-[240px] justify-start text-left font-normal", !date && "text-muted-foreground")}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, dateFormat, { locale: es }) : <span>{placeholder}</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align={align}>
            <Calendar
              initialFocus
              mode="single"
              defaultMonth={date}
              selected={date}
              onSelect={onDateChange}
              locale={es}
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  // Si es un DatePicker de rango (comportamiento existente)
  const { className, date, setDate, align = "start", numberOfMonths = 2 } = props

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-[300px] justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd/MM/yyyy", { locale: es })} - {format(date.to, "dd/MM/yyyy", { locale: es })}
                </>
              ) : (
                format(date.from, "dd/MM/yyyy", { locale: es })
              )
            ) : (
              <span>Seleccionar rango de fechas</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={numberOfMonths}
            locale={es}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
