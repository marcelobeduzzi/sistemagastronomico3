// lib/supabase/client.ts
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

    // Verificar que la instancia se creó correctamente
    if (!instance) {
      console.error("SUPABASE/CLIENT: Error al crear instancia de Supabase - instancia nula")
    } else {
      console.log("SUPABASE/CLIENT: Instancia de Supabase creada correctamente", {
        methods: Object.keys(instance).join(", "),
        fromMethod: instance.from ? "Disponible" : "No disponible",
        authMethod: instance.auth ? "Disponible" : "No disponible",
      })
    }

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
