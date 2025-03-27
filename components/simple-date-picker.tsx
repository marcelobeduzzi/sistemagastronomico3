"use client"

import type React from "react"

import { CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SimpleDatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function SimpleDatePicker({ date, setDate, className }: SimpleDatePickerProps) {
  // Formatear la fecha para el input
  const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

  // Manejar el cambio de fecha
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDate = new Date(e.target.value + "T12:00:00")
    setDate(newDate)
  }

  return (
    <div className={cn("relative", className)}>
      <Label htmlFor="date-input" className="sr-only">
        Fecha
      </Label>
      <div className="relative">
        <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input id="date-input" type="date" value={formattedDate} onChange={handleDateChange} className="pl-10" />
      </div>
    </div>
  )
}





