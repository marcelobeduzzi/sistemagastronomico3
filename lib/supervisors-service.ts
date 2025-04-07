import { createClient } from "@/lib/supabase-client"

export async function getAllSupervisors() {
  try {
    const supabase = createClient()

    const { data, error } = await supabase.from("employees").select("*").eq("role", "Supervisor").order("lastName")

    if (error) {
      console.error("Error al obtener supervisores:", error)
      throw error
    }

    return data || []
  } catch (err) {
    console.error("Error en getAllSupervisors:", err)
    return []
  }
}

