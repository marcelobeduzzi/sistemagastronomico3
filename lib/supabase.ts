import { createClient } from "@supabase/supabase-js"

// Make sure these environment variables are properly set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase environment variables")
}

export const supabase = createClient(supabaseUrl!, supabaseKey!, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
})

// Test function to verify connection
export async function testConnection() {
  try {
    const { data, error } = await supabase.from("users").select("count").single()
    if (error) {
      console.error("Connection error:", error.message)
      return false
    }
    console.log("Successfully connected to Supabase!")
    return true
  } catch (err) {
    console.error("Error testing connection:", err)
    return false
  }
}

