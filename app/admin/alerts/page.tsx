"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { mockAlerts, mockUsers } from "@/lib/mock-data"

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(mockAlerts)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [resolution, setResolution] = useState("")
  const [activeTab, setActiveTab] = useState("all")

  const handleResolveAlert = (id) => {
    setAlerts(
      alerts.map((alert) =>
        alert.id === id
          ? { ...alert, status: "resuelta", resolution, resolvedBy: "user-5", resolvedAt: new Date().toISOString() }
          : alert,
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

  const filteredAlerts = alerts.filter((alert) => {
    if (activeTab === "all") return true
    if (activeTab === "pending") return alert.status === "pendiente"
    if (activeTab === "reviewed") return alert.status === "revisada"
    if (activeTab === "resolved") return alert.status === "resuelta"
    if (activeTab === "stock") return alert.type === "stock"
    if (activeTab === "cash") return alert.type === "caja"
    if (activeTab === "decomiso") return alert.type === "decomiso"
    return true
  })

  return (
    <div className="container mx-auto py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Alertas del Sistema</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
          <TabsTrigger value="reviewed">Revisadas</TabsTrigger>
          <TabsTrigger value="resolved">Resueltas</TabsTrigger>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="cash">Caja</TabsTrigger>
          <TabsTrigger value="decomiso">Decomisos</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab}>
          <Card>
            <CardHeader>
              <CardTitle>Alertas {activeTab !== "all" ? `(${activeTab})` : ""}</CardTitle>
              <CardDescription>Gestiona las alertas generadas por el sistema de control anti-robo</CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAlerts.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No hay alertas que coincidan con los filtros</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Turno</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Severidad</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAlerts.map((alert) => (
                      <TableRow key={alert.id}>
                        <TableCell>{new Date(alert.date).toLocaleDateString()}</TableCell>
                        <TableCell>{alert.localName}</TableCell>
                        <TableCell>{alert.shift}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {alert.type === "stock"
                              ? "Stock"
                              : alert.type === "caja"
                                ? "Caja"
                                : alert.type === "decomiso"
                                  ? "Decomiso"
                                  : alert.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getSeverityColor(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
                        </TableCell>
                        <TableCell>{alert.description}</TableCell>
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
                          {alert.status !== "resuelta" ? (
                            <Button variant="outline" size="sm" onClick={() => setSelectedAlert(alert)}>
                              Resolver
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" onClick={() => setSelectedAlert(alert)}>
                              Ver detalles
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
        </TabsContent>
      </Tabs>

      {/* Diálogo para resolver alerta */}
      <Dialog open={selectedAlert !== null} onOpenChange={(open) => !open && setSelectedAlert(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedAlert?.status !== "resuelta" ? "Resolver Alerta" : "Detalles de Alerta"}</DialogTitle>
            <DialogDescription>
              {selectedAlert?.status !== "resuelta"
                ? "Ingresa la resolución para esta alerta. Una vez resuelta, se marcará como completada en el sistema."
                : "Información detallada de la alerta y su resolución."}
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
                <p>
                  <strong>Turno:</strong> {selectedAlert.shift}
                </p>
                <p>
                  <strong>Severidad:</strong> {selectedAlert.severity.toUpperCase()}
                </p>

                {selectedAlert.status === "resuelta" && (
                  <>
                    <p>
                      <strong>Resolución:</strong> {selectedAlert.resolution}
                    </p>
                    <p>
                      <strong>Resuelto por:</strong>{" "}
                      {mockUsers.find((user) => user.id === selectedAlert.resolvedBy)?.name || selectedAlert.resolvedBy}
                    </p>
                    <p>
                      <strong>Fecha de resolución:</strong> {new Date(selectedAlert.resolvedAt).toLocaleString()}
                    </p>
                  </>
                )}
              </div>

              {selectedAlert.status !== "resuelta" && (
                <Textarea
                  placeholder="Ingresa la resolución de esta alerta..."
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  rows={4}
                />
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                  {selectedAlert.status !== "resuelta" ? "Cancelar" : "Cerrar"}
                </Button>

                {selectedAlert.status !== "resuelta" && (
                  <Button onClick={() => handleResolveAlert(selectedAlert.id)} disabled={!resolution.trim()}>
                    Resolver Alerta
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

