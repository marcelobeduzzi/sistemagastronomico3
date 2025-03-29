"use client"

import { useState } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Search } from "lucide-react"

interface Audit {
  id: string
  localId: string
  localName: string
  auditor?: string
  auditorName?: string
  date: string
  totalScore: number
  maxScore: number
  percentage: number
  categories?: any[]
}

interface AuditListProps {
  audits: Audit[]
}

export function AuditList({ audits }: AuditListProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [filterLocal, setFilterLocal] = useState("all")

  // Verificar que audits sea un array antes de continuar
  if (!audits || !Array.isArray(audits)) {
    console.error("Error: audits no es un array", audits)
    return (
      <div className="space-y-4">
        <div className="text-center p-4">
          <p>No hay auditorías disponibles o hay un error en los datos.</p>
        </div>
      </div>
    )
  }

  // Obtener lista única de locales para el filtro
  const uniqueLocals = Array.from(
    new Set(audits.filter((audit) => audit && audit.localId).map((audit) => audit.localId)),
  ).map((localId) => {
    const audit = audits.find((a) => a && a.localId === localId)
    return {
      id: localId,
      name: audit?.localName || localId,
    }
  })

  // Filtrar auditorías
  const filteredAudits = audits.filter((audit) => {
    if (!audit) return false

    const matchesSearch =
      (audit.localName && audit.localName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (audit.auditor && audit.auditor.toLowerCase().includes(searchTerm.toLowerCase()))

    const matchesLocal = filterLocal === "all" || audit.localId === filterLocal

    return matchesSearch && matchesLocal
  })

  // Ordenar por fecha (más reciente primero)
  const sortedAudits = [...filteredAudits].sort((a, b) => {
    if (!a.date || !b.date) return 0
    return new Date(b.date).getTime() - new Date(a.date).getTime()
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por local o auditor..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Select value={filterLocal} onValueChange={setFilterLocal}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filtrar por local" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los locales</SelectItem>
            {uniqueLocals.map((local) => (
              <SelectItem key={local.id} value={local.id}>
                {local.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Local</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Auditor</TableHead>
              <TableHead className="text-right">Puntaje</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAudits.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No se encontraron auditorías
                </TableCell>
              </TableRow>
            ) : (
              sortedAudits.map((audit) => {
                if (!audit || !audit.id) return null

                const formattedDate = audit.date
                  ? format(new Date(audit.date), "dd/MM/yyyy", { locale: es })
                  : "Fecha desconocida"

                return (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.localName || "Local sin nombre"}</TableCell>
                    <TableCell>{formattedDate}</TableCell>
                    <TableCell>{audit.auditorName || audit.auditor || "Auditor no especificado"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-sm">{audit.percentage || 0}%</span>
                        <div className="w-16 bg-gray-200 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              (audit.percentage || 0) >= 80
                                ? "bg-green-500"
                                : (audit.percentage || 0) >= 60
                                  ? "bg-yellow-500"
                                  : "bg-red-500"
                            }`}
                            style={{ width: `${audit.percentage || 0}%` }}
                          ></div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/auditorias/${audit.id}`}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Ver detalles</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}





