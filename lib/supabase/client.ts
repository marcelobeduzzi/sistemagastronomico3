// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

// Verificar si estamos en el cliente
const isBrowser = typeof window !== 'undefined'

// Variable para almacenar la instancia única
let supabaseInstance: any = null

// Función para crear el cliente Supabase
function createSupabaseClient() {
  // Si ya existe una instancia, devolverla
  if (supabaseInstance) {
    return supabaseInstance
  }
  
  // Crear una nueva instancia
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  
  const instance = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
  
  // Guardar la instancia para futuras llamadas
  supabaseInstance = instance
  
  return instance
}

// Exportar el cliente Supabase
export const supabase = createSupabaseClient()

// Exportar createClient para que pueda ser importado por otros archivos
export { createClient }

// Función para reiniciar el cliente (útil para pruebas)
export function resetSupabaseClient() {
  supabaseInstance = null
}

export default supabase