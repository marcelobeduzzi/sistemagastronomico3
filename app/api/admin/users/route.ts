import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Verificar si el usuario está autenticado
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es admin
    const userRole = session.user.user_metadata?.role

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Acceso denegado: Se requieren privilegios de administrador" }, { status: 403 })
    }

    // Obtener usuarios de Supabase Auth
    // Usamos el método signUp para obtener la lista de usuarios
    // Esto funciona porque estamos en el servidor y tenemos acceso a auth.users
    const { data, error } = await supabase.from("auth.users").select("*")

    if (error) {
      console.error("Error al obtener usuarios:", error)
      return NextResponse.json({ error: "Error al obtener usuarios: " + error.message }, { status: 500 })
    }

    // Procesar los usuarios para el formato que necesitamos
    const users = data.map((user) => ({
      id: user.id,
      email: user.email,
      role: user.user_metadata?.role || "encargado",
      created_at: user.created_at,
      name: user.user_metadata?.name || user.email?.split("@")[0],
      phone: user.user_metadata?.phone || "",
      position: user.user_metadata?.position || "",
      branch: user.user_metadata?.branch || "",
      hasPin: !!user.user_metadata?.pin,
      pin: user.user_metadata?.pin || null,
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error("Error en API de usuarios:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}

// También implementamos el endpoint para actualizar usuarios
export async function PUT(request: Request) {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

  try {
    // Verificar si el usuario está autenticado
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Verificar si el usuario es admin
    const userRole = session.user.user_metadata?.role

    if (userRole !== "admin") {
      return NextResponse.json({ error: "Acceso denegado: Se requieren privilegios de administrador" }, { status: 403 })
    }

    // Obtener datos del cuerpo de la solicitud
    const { userId, userData } = await request.json()

    if (!userId || !userData) {
      return NextResponse.json({ error: "Faltan datos requeridos" }, { status: 400 })
    }

    // Actualizar el usuario en Supabase Auth
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: userData,
    })

    if (error) {
      return NextResponse.json({ error: "Error al actualizar usuario: " + error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error en API de actualización de usuarios:", error)
    return NextResponse.json({ error: "Error interno del servidor: " + error.message }, { status: 500 })
  }
}
