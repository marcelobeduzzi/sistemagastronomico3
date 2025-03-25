import { EditarEmpleadoForm } from "@/components/empleados/editar-empleado-form"
import { getEmpleadoById } from "@/lib/empleados"
import { notFound } from "next/navigation"

export default async function EditarEmpleadoPage({ params }: { params: { id: string } }) {
  const id = params.id

  // Obtener los datos del empleado
  const empleado = await getEmpleadoById(id)

  // Si no se encuentra el empleado, mostrar la página 404
  if (!empleado) {
    notFound()
  }

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Editar Empleado</h1>
      <EditarEmpleadoForm empleado={empleado} />
    </div>
  )
}



