import { createClient as supabaseCreateClient } from "@supabase/supabase-js"

// Crear una instancia del cliente de Supabase para el lado del cliente
export const supabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

  return supabaseCreateClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  })
}

// Exportar una instancia del cliente para uso general
export const supabase = supabaseClient()

// Alias para mantener compatibilidad con el código que usa createClient
export const createClient = supabaseClient


