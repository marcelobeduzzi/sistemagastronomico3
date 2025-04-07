import supabase from "@/lib/supabase-client"

export async function getAllSupervisors() {
  try {
    // Verificamos que supabase esté definido antes de usarlo
    if (!supabase) {
      console.error("Cliente de Supabase no inicializado")
      return []
    }

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

