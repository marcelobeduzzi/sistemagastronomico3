import { NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    
    const supabase = createRouteHandlerClient({ cookies })
    
    if (id) {
      // Obtener una auditoría específica por ID
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single()
      
      if (error) {
        console.error('Error al obtener auditoría:', error)
        return NextResponse.json({ error: 'Error al obtener auditoría' }, { status: 500 })
      }
      
      return NextResponse.json(data)
    } else {
      // Obtener todas las auditorías
      const { data, error } = await supabase
        .from('audits')
        .select('*')
        .order('date', { ascending: false })
      
      if (error) {
        console.error('Error al obtener auditorías:', error)
        return NextResponse.json({ error: 'Error al obtener auditorías' }, { status: 500 })
      }
      
      return NextResponse.json(data)
    }
  } catch (error) {
    console.error('Error en API de auditorías:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const auditData = await request.json()
    
    // Asegurarse de que los campos requeridos estén presentes
    if (!auditData.localId || !auditData.date) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos (localId, date)' },
        { status: 400 }
      )
    }
    
    // Calcular puntajes para cada categoría
    let totalScore = 0
    let maxScore = 0
    
    if (auditData.categories && Array.isArray(auditData.categories)) {
      auditData.categories = auditData.categories.map((category: any) => {
        let categoryScore = 0
        const categoryMaxScore = category.maxScore || 0
        
        // Calcular puntaje de la categoría basado en los ítems
        if (category.items && Array.isArray(category.items)) {
          category.items = category.items.map((item: any) => {
            // Asegurarse de que el puntaje no exceda el máximo del ítem
            if (item.score > item.maxScore) {
              item.score = item.maxScore
            }
            categoryScore += item.score || 0
            return item
          })
        }
        
        // Asegurarse de que el puntaje de la categoría no exceda el máximo
        if (categoryScore > categoryMaxScore) {
          categoryScore = categoryMaxScore
        }
        
        // Actualizar el puntaje de la categoría
        category.score = categoryScore
        
        // Acumular para el total
        totalScore += categoryScore
        maxScore += categoryMaxScore
        
        return category
      })
    }
    
    // Actualizar puntajes totales
    auditData.totalScore = totalScore
    auditData.maxScore = maxScore
    auditData.percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0
    
    // Añadir timestamps si no existen
    if (!auditData.createdAt) {
      auditData.createdAt = new Date().toISOString()
    }
    if (!auditData.updatedAt) {
      auditData.updatedAt = new Date().toISOString()
    }
    
    // Depurar los datos antes de insertar
    console.log('Datos a insertar:', JSON.stringify(auditData, null, 2))
    
    // Crear un objeto limpio para la inserción
    const cleanAuditData = {
      local_id: auditData.localId,
      local_name: auditData.localName,
      auditor: auditData.auditor,
      date: auditData.date,
      general_observations: auditData.generalObservations || '',
      categories: auditData.categories,
      total_score: auditData.totalScore,
      max_score: auditData.maxScore,
      percentage: auditData.percentage,
      created_at: auditData.createdAt,
      updated_at: auditData.updatedAt
    }
    
    // Insertar la auditoría
    const { data, error } = await supabase
      .from('audits')
      .insert([cleanAuditData])
      .select()
    
    if (error) {
      console.error('Error al crear auditoría:', error)
      return NextResponse.json({ error: `Error al crear auditoría: ${error.message}` }, { status: 500 })
    }
    
    return NextResponse.json(data[0] || {})
  } catch (error) {
    console.error('Error en API de auditorías:', error)
    return NextResponse.json({ error: `Error interno del servidor: ${error.message}` }, { status: 500 })
  }
}