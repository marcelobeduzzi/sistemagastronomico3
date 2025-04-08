 import { createBrowserClient } from "@supabase/ssr"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Crear una única instancia del cliente
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
 if (!supabaseClient) {
   supabaseClient = createBrowserClient(supabaseUrl, supabaseKey)
 }
 return supabaseClient
}
