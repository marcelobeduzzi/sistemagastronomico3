

"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { mockAlerts } from "@/lib/mock-data"

export function AlertsDisplay() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [resolution, setResolution] = useState("")

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(amount)
  }

  const handleResolveAlert = (id) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id ? { ...alert, status: "resuelta", resolution, resolvedAt: new Date().toISOString() } : alert,
      ),
    )
    setSelectedAlert(null)
    setResolution("")
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "alta":
        return "destructive"
      case "media":
        return "warning"
      case "baja":
        return "secondary"
      default:
        return "secondary"
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "pendiente":
        return "destructive"
      case "revisada":
        return "warning"
      case "resuelta":
        return "success"
      default:
        return "secondary"
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Alertas Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">No hay alertas recientes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Local</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>{new Date(alert.date).toLocaleDateString()}</TableCell>
                    <TableCell>{alert.localName}</TableCell>
                    <TableCell>
                      {alert.type === "stock"
                        ? "Stock"
                        : alert.type === "caja"
                          ? "Caja"
                          : alert.type === "decomiso"
                            ? "Decomiso"
                            : alert.type}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>
                      {alert.description}
                      {alert.monetaryValue && (
                        <div className="text-sm text-red-500 mt-1">
                          Impacto financiero estimado: {formatCurrency(alert.monetaryValue)}
                        </div>
                      )}
                      {alert.context && (
                        <details className="text-xs text-muted-foreground mt-1">
                          <summary>Ver detalles</summary>
                          <p className="mt-1">{alert.context}</p>
                        </details>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(alert.status)}>
                        {alert.status === "pendiente"
                          ? "Pendiente"
                          : alert.status === "revisada"
                            ? "Revisada"
                            : alert.status === "resuelta"
                              ? "Resuelta"
                              : alert.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {alert.status !== "resuelta" && (
                        <Button variant="outline" size="sm" onClick={() => setSelectedAlert(alert)}>
                          Resolver
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Diálogo para resolver alerta */}
      <Dialog open={selectedAlert !== null} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Ingresa la resolución para esta alerta. Una vez resuelta, se marcará como completada en el sistema.
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <>
              <div className="space-y-2 mb-4">
                <p>
                  <strong>Tipo:</strong>{" "}
                  {selectedAlert.type === "stock"
                    ? "Stock"
                    : selectedAlert.type === "caja"
                      ? "Caja"
                      : selectedAlert.type === "decomiso"
                        ? "Decomiso"
                        : selectedAlert.type}
                </p>
                <p>
                  <strong>Descripción:</strong> {selectedAlert.description}
                </p>
                <p>
                  <strong>Fecha:</strong> {new Date(selectedAlert.date).toLocaleDateString()}
                </p>
                <p>
                  <strong>Local:</strong> {selectedAlert.localName}
                </p>
              </div>

              <Textarea
                placeholder="Ingresa la resolución de esta alerta..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  Cancelar
                </Button>
                <Button onClick={() => handleResolveAlert(selectedAlert.id)} disabled={!resolution.trim()}>
                  Resolver Alerta
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

