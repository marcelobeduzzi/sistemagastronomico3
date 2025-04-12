// Si no existe este archivo, necesitamos crearlo para ver una planilla específica

"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

export default function StockMatrixDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id

  useEffect(() => {
    // Redirigir a la página principal con el ID como parámetro de consulta
    if (id) {
      router.push(`/stock-matrix?id=${id}`)
    }
  }, [id, router])

  return null
}
