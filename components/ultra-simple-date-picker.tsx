"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CalendarIcon } from "lucide-react"

interface UltraSimpleDatePickerProps {
  value: string // formato "YYYY-MM-DD"
  onChange: (value: string) => void
  className?: string
}

export function UltraSimpleDatePicker({ value, onChange, className }: UltraSimpleDatePickerProps) {
  // Convertir formato YYYY-MM-DD a DD/MM/YYYY para mostrar
  const formatForDisplay = (dateStr: string): string => {
    if (!dateStr || dateStr.length !== 10) return ""
    const parts = dateStr.split("-")
    if (parts.length !== 3) return ""
    return `${parts[2]}/${parts[1]}/${parts[0]}`
  }

  // Convertir formato DD/MM/YYYY a YYYY-MM-DD para almacenar
  const formatForStorage = (displayStr: string): string => {
    if (!displayStr || displayStr.length !== 10) return ""
    const parts = displayStr.split("/")
    if (parts.length !== 3) return ""
    return `${parts[2]}-${parts[1]}-${parts[0]}`
  }

  // Estado local para el input
  const [inputValue, setInputValue] = useState(formatForDisplay(value))

  // Actualizar el input cuando cambia el valor externo
  useEffect(() => {
    setInputValue(formatForDisplay(value))
  }, [value])

  // Manejar cambio en el input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }

  // Manejar cuando el input pierde el foco
  const handleBlur = () => {
    // Validar formato DD/MM/YYYY
    const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/
    if (regex.test(inputValue)) {
      // Validar que sea una fecha válida
      const parts = inputValue.split("/")
      const day = Number.parseInt(parts[0], 10)
      const month = Number.parseInt(parts[1], 10)
      const year = Number.parseInt(parts[2], 10)

      // Verificar que sea una fecha válida
      const isValidDate = day > 0 && day <= 31 && month > 0 && month <= 12

      if (isValidDate) {
        const newValue = formatForStorage(inputValue)
        onChange(newValue)
      } else {
        // Si la fecha es inválida, restaurar al valor anterior
        setInputValue(formatForDisplay(value))
      }
    } else {
      // Si el formato es inválido, restaurar al valor anterior
      setInputValue(formatForDisplay(value))
    }
  }

  // Manejar cuando se presiona Enter
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleBlur()
    }
  }

  // Establecer fecha a hoy
  const setToday = () => {
    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, "0")
    const day = String(today.getDate()).padStart(2, "0")

    const todayFormatted = `${year}-${month}-${day}`
    onChange(todayFormatted)
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="relative w-[140px]">
        <CalendarIcon className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="DD/MM/AAAA"
          className="pl-8"
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={setToday}>
        Hoy
      </Button>
    </div>
  )
}



