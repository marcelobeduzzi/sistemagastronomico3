"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { CalendarIcon, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function LiquidationDetails({ params }) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [liquidation, setLiquidation] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [paymentData, setPaymentData] = useState({
    payment_date: undefined,
    payment_method: "",
    payment_reference: "",
    notes: "",
  })

  useEffect(() => {
    const fetchLiquidation = async () => {
      try {
        const { data, error } = await supabase.from("liquidations").select("*").eq("id", params.id).single()

        if (error) throw error
        setLiquidation(data)

        // Fetch employee data
        if (data) {
          const { data: employeeData, error: employeeError } = await supabase
            .from("employees")
            .select("*")
            .eq("id", data.employee_id)
            .single()

          if (employeeError) throw employeeError
          setEmployee(employeeData)
        }
      } catch (error) {
        console.error("Error fetching liquidation:", error)
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la liquidación",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchLiquidation()
  }, [supabase, params.id])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setPaymentData({
      ...paymentData,
      [name]: value,
    })
  }

  const handleDateChange = (date) => {
    setPaymentData({
      ...paymentData,
      payment_date: date,
    })
  }

  const handleSelectChange = (name, value) => {
    setPaymentData({
      ...paymentData,
      [name]: value,
    })
  }

  const handleMarkAsPaid = async () => {
    if (!paymentData.payment_date || !paymentData.payment_method) {
      toast({
        title: "Error",
        description: "Por favor complete la fecha y método de pago",
        variant: "destructive",
      })
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from("liquidations")
        .update({
          is_paid: true,
          payment_date: paymentData.payment_date,
          payment_method: paymentData.payment_method,
          payment_reference: paymentData.payment_reference,
          notes: paymentData.notes,
        })
        .eq("id", params.id)

      if (error) throw error

      toast({
        title: "Liquidación actualizada",
        description: "La liquidación ha sido marcada como pagada",
      })

      // Refresh liquidation data
      const { data, error: fetchError } = await supabase.from("liquidations").select("*").eq("id", params.id).single()

      if (fetchError) throw fetchError
      setLiquidation(data)
    } catch (error) {
      console.error("Error updating liquidation:", error)
      toast({
        title: "Error",
        description: "No se pudo actualizar la liquidación",
        variant: "destructive",
      })
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("liquidations").delete().eq("id", params.id)

      if (error) throw error

      toast({
        title: "Liquidación eliminada",
        description: "La liquidación ha sido eliminada exitosamente",
      })

      router.push("/dashboard/liquidations")
    } catch (error) {
      console.error("Error deleting liquidation:", error)
      toast({
        title: "Error",
        description: "No se pudo eliminar la liquidación",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 flex justify-center items-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!liquidation || !employee) {
    return (
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Liquidación no encontrada</h1>
        <Button onClick={() => router.push("/dashboard/liquidations")}>Volver a Liquidaciones</Button>
      </div>
    )
  }

  // Calcular el pago por días del último mes
  const dailySalary = liquidation.base_salary / 30
  const lastMonthPayment = dailySalary * (liquidation.days_to_pay_in_last_month || 0)

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Detalles de Liquidación</h1>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push("/dashboard/liquidations")}>
            Volver
          </Button>
          {!liquidation.is_paid && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive">Eliminar</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente la liquidación.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Información de la Liquidación</CardTitle>
            <CardDescription>Detalles del cálculo de la liquidación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Empleado</Label>
                <p className="text-lg font-medium">
                  {employee.first_name} {employee.last_name}
                </p>
              </div>
              <div>
                <Label>Fecha de Terminación</Label>
                <p className="text-lg font-medium">
                  {format(new Date(liquidation.termination_date), "PPP", { locale: es })}
                </p>
              </div>
              <div>
                <Label>Tiempo Trabajado</Label>
                <p className="text-lg font-medium">
                  {liquidation.worked_months} meses y {liquidation.worked_days} días
                </p>
              </div>
              <div>
                <Label>Salario Base</Label>
                <p className="text-lg font-medium">${liquidation.base_salary.toFixed(2)}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold text-lg mb-4">Desglose de la Liquidación</h3>
              <div className="space-y-3">
                {liquidation.include_vacation && (
                  <div className="flex justify-between">
                    <span>Vacaciones Proporcionales:</span>
                    <span>${liquidation.proportional_vacation.toFixed(2)}</span>
                  </div>
                )}
                {liquidation.include_bonus && (
                  <div className="flex justify-between">
                    <span>Aguinaldo Proporcional:</span>
                    <span>${liquidation.proportional_bonus.toFixed(2)}</span>
                  </div>
                )}
                {liquidation.days_to_pay_in_last_month > 0 && (
                  <div className="flex justify-between">
                    <span>Pago por {liquidation.days_to_pay_in_last_month} días del último mes:</span>
                    <span>${liquidation.compensation_amount.toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total:</span>
                  <span>${liquidation.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {liquidation.is_paid && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold text-lg mb-4">Información de Pago</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Fecha de Pago</Label>
                      <p className="text-lg font-medium">
                        {format(new Date(liquidation.payment_date), "PPP", { locale: es })}
                      </p>
                    </div>
                    <div>
                      <Label>Método de Pago</Label>
                      <p className="text-lg font-medium">{liquidation.payment_method}</p>
                    </div>
                    {liquidation.payment_reference && (
                      <div>
                        <Label>Referencia de Pago</Label>
                        <p className="text-lg font-medium">{liquidation.payment_reference}</p>
                      </div>
                    )}
                    {liquidation.notes && (
                      <div className="md:col-span-2">
                        <Label>Notas</Label>
                        <p className="text-lg font-medium">{liquidation.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {!liquidation.is_paid && (
          <Card>
            <CardHeader>
              <CardTitle>Registrar Pago</CardTitle>
              <CardDescription>Complete la información para registrar el pago de esta liquidación</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment_date">Fecha de Pago</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !paymentData.payment_date && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {paymentData.payment_date ? (
                        format(paymentData.payment_date, "PPP", { locale: es })
                      ) : (
                        <span>Seleccionar fecha</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={paymentData.payment_date}
                      onSelect={handleDateChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_method">Método de Pago</Label>
                <Select
                  value={paymentData.payment_method}
                  onValueChange={(value) => handleSelectChange("payment_method", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar método" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment_reference">Referencia de Pago (opcional)</Label>
                <Input
                  id="payment_reference"
                  name="payment_reference"
                  value={paymentData.payment_reference}
                  onChange={handleInputChange}
                  placeholder="Número de transferencia, cheque, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={paymentData.notes}
                  onChange={handleInputChange}
                  placeholder="Observaciones adicionales"
                />
              </div>

              <Button
                className="w-full"
                onClick={handleMarkAsPaid}
                disabled={updating || !paymentData.payment_date || !paymentData.payment_method}
              >
                {updating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Marcar como Pagado"
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}


