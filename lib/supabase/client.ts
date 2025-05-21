import { createClient } from "@supabase/supabase-js"

// Verificar si estamos en el cliente
const isBrowser = typeof window !== "undefined"

// Variable para almacenar la instancia única
let supabaseInstance: any = null

// Función para crear el cliente Supabase
function createSupabaseClient() {
  // Si ya existe una instancia, devolverla
  if (supabaseInstance) {
    console.log("SUPABASE/CLIENT: Devolviendo instancia existente de Supabase")
    return supabaseInstance
  }

  console.log("SUPABASE/CLIENT: Creando nueva instancia de Supabase")

  // Crear una nueva instancia
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("SUPABASE/CLIENT: URL o clave anónima no definidas", {
      url: supabaseUrl ? "Definida" : "No definida",
      key: supabaseAnonKey ? "Definida" : "No definida",
    })
  }

  try {
    const instance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })

    // SOLUCIÓN PARA EL ERROR DE HEADERS: Extender el cliente de Supabase
    // Interceptar y modificar los métodos que podrían estar causando el error
    const originalFrom = instance.from.bind(instance)
    instance.from = (table) => {
      const result = originalFrom(table)

      // Guardar la implementación original de select
      const originalSelect = result.select.bind(result)
      result.select = (...args) => {
        const selectResult = originalSelect(...args)

        // Añadir el método headers si no existe
        if (selectResult && typeof selectResult.headers !== "function") {
          selectResult.headers = (headers) => {
            console.log("SUPABASE/CLIENT: Llamada a método headers() interceptada", headers)
            // Simplemente devolver el mismo objeto para permitir encadenamiento
            return selectResult
          }
        }

        return selectResult
      }

      return result
    }

    // Interceptar el método rpc
    const originalRpc = instance.rpc.bind(instance)
    instance.rpc = (...args) => {
      const rpcResult = originalRpc(...args)

      // Añadir el método headers si no existe
      if (rpcResult && typeof rpcResult.headers !== "function") {
        rpcResult.headers = (headers) => {
          console.log("SUPABASE/CLIENT: Llamada a método headers() interceptada en rpc", headers)
          // Simplemente devolver el mismo objeto para permitir encadenamiento
          return rpcResult
        }
      }

      return rpcResult
    }

    // Verificar que la instancia se creó correctamente
    console.log("SUPABASE/CLIENT: Instancia de Supabase creada y extendida correctamente")

    // Guardar la instancia para futuras llamadas
    supabaseInstance = instance

    return instance
  } catch (error) {
    console.error("SUPABASE/CLIENT: Error al crear instancia de Supabase", error)
    throw error
  }
}

// Exportar el cliente Supabase
export const supabase = createSupabaseClient()

// Exportar createClient para que pueda ser importado por otros archivos
export { createClient }

// Función para reiniciar el cliente (útil para pruebas)
export function resetSupabaseClient() {
  console.log("SUPABASE/CLIENT: Reiniciando cliente Supabase")
  supabaseInstance = null
}

export default supabase
