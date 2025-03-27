"use client"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function DatePicker({ date, setDate, className }: DatePickerProps) {
  // Función para manejar el cambio de fecha de manera segura
  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Crear una nueva fecha con la hora fija a mediodía para evitar problemas de zona horaria
      const correctedDate = new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), 12, 0, 0)
      setDate(correctedDate)
    }
  }

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "PPP", { locale: es }) : <span>Seleccionar fecha</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
            locale={es}
            className="border rounded-md"
            fixedWeeks
            styles={{
              caption: { textAlign: "center" },
              caption_label: { fontSize: "1rem", fontWeight: 500 },
              table: { width: "100%", borderCollapse: "separate", borderSpacing: "0" },
              head_row: { marginBottom: "0.5rem" },
              row: { width: "100%", display: "flex", justifyContent: "space-between" },
              cell: { textAlign: "center", padding: "0.25rem 0", margin: "0 0.125rem" },
              day: { width: "2rem", height: "2rem", display: "flex", alignItems: "center", justifyContent: "center" },
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}




