import { createClient as createSupabaseClient } from "@supabase/supabase-js"

// Verificar que las variables de entorno estén definidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Variables de entorno de Supabase no definidas:", {
    url: !!supabaseUrl ? "definida" : "no definida",
    key: !!supabaseKey ? "definida" : "no definida",
  })
}

// Crear una instancia del cliente para exportar directamente
export const supabase = supabaseUrl && supabaseKey ? createSupabaseClient(supabaseUrl, supabaseKey) : null

// Función para crear un cliente de Supabase (para mantener compatibilidad con código existente)
export function createClient() {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Variables de entorno de Supabase no definidas")
  }
  return createSupabaseClient(supabaseUrl, supabaseKey)
}

export default supabase





