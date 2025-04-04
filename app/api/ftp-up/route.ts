import type { NextRequest } from "next/server"
import { put } from "@vercel/blob"
import { createClient } from "@supabase/supabase-js"

// Configuración de Supabase (ya configurada)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Credenciales para autenticación básica (ya configuradas)
const FTP_USERNAME = process.env.FTP_USERNAME || "quadrifoglio"
const FTP_PASSWORD = process.env.FTP_PASSWORD || "secure_password"

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación básica
    const authHeader = request.headers.get("authorization")
    if (!authHeader || !verifyAuth(authHeader)) {
      return new Response("Unauthorized", { status: 401 })
    }

    // Obtener el tipo de datos y el archivo
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return new Response("Missing file", { status: 400 })
    }

    // Identificar el local (asumimos BR Pacifico por defecto)
    const locationId = "local-3"
    const locationName = "BR Pacifico"

    // Guardar archivo en Vercel Blob Storage
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${locationId}_${timestamp}_${file.name}`
    const blob = await put(filename, file, { access: "private" })

    // Registrar la sincronización en la base de datos
    try {
      await supabase.from("sync_logs").insert({
        location_id: locationId,
        location_name: locationName,
        data_type: "ventas", // Asumimos ventas por defecto
        rows_processed: 1,
        sync_date: new Date().toISOString(),
        file_name: file.name,
      })
      console.log("Registro de sincronización guardado en la base de datos")
    } catch (error) {
      console.error("Error al guardar registro de sincronización:", error)
    }

    return Response.json({
      success: true,
      message: `File uploaded successfully as ${filename}`,
      url: blob.url,
    })
  } catch (error) {
    console.error("Error processing upload:", error)
    return new Response("Error processing upload", { status: 500 })
  }
}

// Función para verificar autenticación básica
function verifyAuth(authHeader: string): boolean {
  if (!authHeader.startsWith("Basic ")) return false

  const base64Credentials = authHeader.split(" ")[1]
  const credentials = Buffer.from(base64Credentials, "base64").toString("utf-8")
  const [username, password] = credentials.split(":")

  return username === FTP_USERNAME && password === FTP_PASSWORD
}

