import { DashboardLayout } from "@/app/dashboard-layout"
import GenerateDiscrepancies from "@/components/conciliacion/generate-discrepancies"

export default function GenerarDiscrepanciasPage() {
  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Generación de Discrepancias</h1>
        <GenerateDiscrepancies />
      </div>
    </DashboardLayout>
  )
}
