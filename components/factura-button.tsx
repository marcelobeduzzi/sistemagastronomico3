"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { tusFacturasService } from "@/lib/tusfacturas-service"
import { Receipt, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { CheckCircle, AlertCircle } from "lucide-react"

interface FacturaButtonProps {
  venta: any // Tipo de la venta
  onSuccess?: (facturaData: any) => void
  className?: string
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
}

export function FacturaButton({ venta, onSuccess, className, variant = "outline" }: FacturaButtonProps) {
  const { toast } = useToast()
  const [isGenerating, setIsGenerating] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [result, setResult] = useState<{
    success: boolean
    message: string
    data?: any
  } | null>(null)

  const handleGenerarFactura = async () => {
    if (!tusFacturasService.hasCredentials()) {
      toast({
        title: "Error",
        description: "No se han configurado las credenciales para TusFacturasAPP. Vaya a Configuración > Facturación.",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)
    setResult(null)

    try {
      // Convertir la venta al formato de TusFacturas
      const { cliente, comprobante } = tusFacturasService.convertirVentaAFactura(venta)

      // Mostrar los datos que se enviarán
      console.log("Datos que se enviarán a TusFacturasAPP:", { cliente, comprobante })

      // Generar la factura
      const response = await tusFacturasService.generarFactura(cliente, comprobante)

      // Mostrar la respuesta completa
      console.log("Respuesta completa de TusFacturasAPP:", response)

      if (response.error) {
        setResult({
          success: false,
          message: `Error al generar factura: ${response.errores?.join(", ") || "Error desconocido"}`,
        })

        toast({
          title: "Error al generar factura",
          description: response.errores?.join(", ") || "Error desconocido",
          variant: "destructive",
        })
      } else {
        setResult({
          success: true,
          message: `Factura generada correctamente. ${
            response.cae ? `CAE: ${response.cae}` : "Comprobante de prueba (sin CAE)"
          }`,
          data: response,
        })

        toast({
          title: "Factura generada correctamente",
          description: response.cae ? `CAE: ${response.cae}` : "Comprobante de prueba generado con éxito",
        })

        // Llamar al callback de éxito si existe
        if (onSuccess) {
          onSuccess(response)
        }
      }
    } catch (error) {
      console.error("Error al generar factura:", error)
      setResult({
        success: false,
        message: `Error: ${error instanceof Error ? error.message : "Error desconocido"}`,
      })

      toast({
        title: "Error",
        description: `Error al generar factura: ${error instanceof Error ? error.message : "Error desconocido"}`,
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant={variant} className={className} onClick={() => setResult(null)}>
            <Receipt className="mr-2 h-4 w-4" />
            Generar Factura
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generar Factura Electrónica</DialogTitle>
            <DialogDescription>
              Se generará una factura electrónica para esta venta a través de TusFacturasAPP.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Cliente</p>
                  <p className="text-sm">
                    {venta.customerName || venta.cliente?.nombre || "Consumidor Final"} -{" "}
                    {venta.customerDocument || venta.cliente?.documento || ""}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Total</p>
                  <p className="text-sm font-bold">${(venta.totalAmount || venta.total || 0).toFixed(2)}</p>
                </div>
              </div>

              {result && (
                <Alert variant={result.success ? "default" : "destructive"}>
                  {result.success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                  <AlertTitle>{result.success ? "Éxito" : "Error"}</AlertTitle>
                  <AlertDescription>{result.message}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cerrar
            </Button>
            <Button onClick={handleGenerarFactura} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                "Generar Factura"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
