"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { DashboardLayout } from "@/dashboard-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AuditDetail } from "@/components/auditorias/audit-detail"
import { db } from "@/lib/db"
import { toast } from "@/components/ui/use-toast"
import { ArrowLeft, Printer } from "lucide-react"

export default function AuditoriaDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [audit, setAudit] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("resumen")

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        setIsLoading(true)
        const auditData = await db.audits.findUnique({
          where: { id: params.id },
        })

        if (!auditData) {
          toast({
            title: "Error",
            description: "No se encontró la auditoría solicitada",
            variant: "destructive",
          })
          router.push("/auditorias")
          return
        }

        setAudit(auditData)
      } catch (error) {
        console.error("Error al cargar la auditoría:", error)
        toast({
          title: "Error",
          description: "Ocurrió un error al cargar la auditoría",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchAudit()
  }, [params.id, router])

  const handlePrint = () => {
    window.print()
  }

  if (isLoading) {
    return <DashboardLayout isLoading={true} />
  }

  if (!audit) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <h2 className="text-2xl font-bold mb-2">Auditoría no encontrada</h2>
            <p className="text-muted-foreground mb-4">La auditoría solicitada no existe o ha sido eliminada</p>
            <Button onClick={() => router.push("/auditorias")}>Volver a Auditorías</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  const formattedDate = format(new Date(audit.date), "dd 'de' MMMM 'de' yyyy", { locale: es })

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 print:py-2">
        <div className="flex items-center justify-between mb-6 print:mb-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => router.push("/auditorias")} className="print:hidden">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-3xl font-bold print:text-2xl">Auditoría: {audit.localName}</h1>
          </div>
          <Button onClick={handlePrint} className="print:hidden">
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:gap-2 print:grid-cols-1">
          {/* Información general */}
          <Card className="md:col-span-1">
            <CardHeader className="print:py-2">
              <CardTitle>Información General</CardTitle>
              <CardDescription>Datos básicos de la auditoría</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 print:space-y-2 print:pt-0">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Local:</p>
                  <p className="font-medium">{audit.localName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Fecha:</p>
                  <p className="font-medium">{formattedDate}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Auditor:</p>
                  <p className="font-medium">{audit.auditor}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Puntaje:</p>
                  <p className="font-medium">
                    {audit.totalScore} / {audit.maxScore} ({audit.percentage}%)
                  </p>
                </div>
              </div>

              {audit.generalObservations && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Observaciones Generales:</p>
                  <p className="text-sm mt-1">{audit.generalObservations}</p>
                </div>
              )}

              <div className="w-full mt-2">
                <div className="flex justify-between mb-1">
                  <span className="text-sm font-medium">Resultado:</span>
                  <span className="text-sm font-medium">{audit.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      audit.percentage >= 80 ? "bg-green-500" : audit.percentage >= 60 ? "bg-yellow-500" : "bg-red-500"
                    }`}
                    style={{ width: `${audit.percentage}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalles de la auditoría */}
          <Card className="md:col-span-2">
            <CardHeader className="print:py-2">
              <CardTitle>Resultados por Categoría</CardTitle>
              <CardDescription>Detalle de la evaluación</CardDescription>
            </CardHeader>
            <CardContent className="print:pt-0">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
                <TabsList className="grid grid-cols-2 md:grid-cols-6 mb-4">
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  {audit.categories.map((category: any) => (
                    <TabsTrigger key={category.id} value={category.id}>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value="resumen">
                  <AuditDetail audit={audit} showAllCategories={false} />
                </TabsContent>

                {audit.categories.map((category: any) => (
                  <TabsContent key={category.id} value={category.id}>
                    <AuditDetail audit={audit} categoryId={category.id} showAllCategories={false} />
                  </TabsContent>
                ))}
              </Tabs>

              {/* Versión para imprimir - siempre muestra todo */}
              <div className="hidden print:block">
                <AuditDetail audit={audit} showAllCategories={true} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

