import { createClient as createSupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Creamos una instancia del cliente de Supabase
const supabaseInstance = createSupabaseClient(supabaseUrl, supabaseKey)

// Exportamos la función createClient para mantener compatibilidad con el código existente
export function createClient() {
  return supabaseInstance
}

// También exportamos la instancia directamente como alternativa
export default supabaseInstance

