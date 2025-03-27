"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SimpleDatePickerProps {
  date: Date
  setDate: (date: Date) => void
  className?: string
}

export function SimpleDatePicker({ date, setDate, className }: SimpleDatePickerProps) {
  // Estados para día, mes y año
  const [day, setDay] = useState(date.getDate().toString().padStart(2, "0"))
  const [month, setMonth] = useState((date.getMonth() + 1).toString().padStart(2, "0"))
  const [year, setYear] = useState(date.getFullYear().toString())

  // Actualizar estados cuando cambia la fecha externa
  useEffect(() => {
    setDay(date.getDate().toString().padStart(2, "0"))
    setMonth((date.getMonth() + 1).toString().padStart(2, "0"))
    setYear(date.getFullYear().toString())
  }, [date])

  // Actualizar la fecha cuando cambia alguno de los inputs
  const updateDate = () => {
    try {
      // Validar valores
      const dayNum = Number.parseInt(day)
      const monthNum = Number.parseInt(month)
      const yearNum = Number.parseInt(year)

      if (isNaN(dayNum) || isNaN(monthNum) || isNaN(yearNum)) {
        return
      }

      // Crear nueva fecha (con hora fija a mediodía)
      const newDate = new Date(yearNum, monthNum - 1, dayNum, 12, 0, 0)

      // Verificar si la fecha es válida
      if (newDate.getDate() !== dayNum || newDate.getMonth() !== monthNum - 1 || newDate.getFullYear() !== yearNum) {
        return // Fecha inválida (como 31 de febrero)
      }

      setDate(newDate)
    } catch (error) {
      console.error("Error al actualizar fecha:", error)
    }
  }

  // Establecer fecha a hoy
  const setToday = () => {
    const today = new Date()
    setDay(today.getDate().toString().padStart(2, "0"))
    setMonth((today.getMonth() + 1).toString().padStart(2, "0"))
    setYear(today.getFullYear().toString())
    setDate(new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12, 0, 0))
  }

  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <div className="flex space-x-1">
        <Input
          type="text"
          value={day}
          onChange={(e) => {
            setDay(e.target.value.replace(/\D/g, "").slice(0, 2))
          }}
          onBlur={updateDate}
          className="w-12 px-2 text-center"
          placeholder="DD"
          maxLength={2}
        />
        <span className="flex items-center">/</span>
        <Input
          type="text"
          value={month}
          onChange={(e) => {
            setMonth(e.target.value.replace(/\D/g, "").slice(0, 2))
          }}
          onBlur={updateDate}
          className="w-12 px-2 text-center"
          placeholder="MM"
          maxLength={2}
        />
        <span className="flex items-center">/</span>
        <Input
          type="text"
          value={year}
          onChange={(e) => {
            setYear(e.target.value.replace(/\D/g, "").slice(0, 4))
          }}
          onBlur={updateDate}
          className="w-20 px-2 text-center"
          placeholder="AAAA"
          maxLength={4}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={setToday} className="text-xs">
        Hoy
      </Button>
    </div>
  )
}







