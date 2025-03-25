import { db } from "@/lib/db"
import type { Employee } from "@/types"

// Función para obtener todos los empleados
export async function getEmpleados() {
  try {
    const empleados = await db.query.empleados.findMany({
      orderBy: (empleados, { asc }) => [asc(empleados.firstName)],
    })
    return empleados
  } catch (error) {
    console.error("Error al obtener empleados:", error)
    return []
  }
}

// Función para obtener un empleado por ID
export async function getEmpleadoById(id: string): Promise<Employee | null> {
  try {
    const empleado = await db.query.empleados.findFirst({
      where: (empleados, { eq }) => eq(empleados.id, id),
    })

    return empleado
  } catch (error) {
    console.error("Error al obtener empleado por ID:", error)
    return null
  }
}

// Función para crear un nuevo empleado
export async function crearEmpleado(data: Omit<Employee, "id" | "createdAt" | "updatedAt">) {
  try {
    const now = new Date().toISOString()
    const empleadoData = {
      ...data,
      createdAt: now,
      updatedAt: now,
    }

    const [empleado] = await db.insert(db.empleados).values(empleadoData).returning()
    return empleado
  } catch (error) {
    console.error("Error al crear empleado:", error)
    throw new Error("No se pudo crear el empleado")
  }
}

// Función para actualizar un empleado
export async function actualizarEmpleado(id: string, data: Partial<Employee>) {
  try {
    const updateData = {
      ...data,
      updatedAt: new Date().toISOString(),
    }

    await db.update(db.empleados).set(updateData).where(db.eq(db.empleados.id, id))
    return true
  } catch (error) {
    console.error("Error al actualizar empleado:", error)
    throw new Error("No se pudo actualizar el empleado")
  }
}

// Función para eliminar un empleado
export async function eliminarEmpleado(id: string) {
  try {
    await db.delete(db.empleados).where(db.eq(db.empleados.id, id))
    return true
  } catch (error) {
    console.error("Error al eliminar empleado:", error)
    throw new Error("No se pudo eliminar el empleado")
  }
}



