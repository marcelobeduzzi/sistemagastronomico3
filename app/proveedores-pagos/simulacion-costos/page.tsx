import SimulacionCostos from "@/components/simulacion-costos"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function SimulacionCostosPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center mb-6">
        <Link href="/proveedores-pagos">
          <Button variant="outline" size="sm" className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver a Proveedores y Pagos
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">Simulación de Precios y Rentabilidad</h1>
      </div>
      <SimulacionCostos />
    </div>
  )
}

