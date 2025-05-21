// Este archivo sirve como proxy para mantener compatibilidad con el código existente
// Importa y reexporta todo desde el nuevo sistema modular

console.log("DB-SERVICE-PROXY: Cargando proxy de servicio de base de datos")

import * as dbModule from "./db"
import { supabase as originalSupabase } from "./supabase/client" // Importar el cliente original directamente

// Reexportar todo
export const dbService = dbModule.dbService
export const getSupabase = () => {
  console.log("DB-SERVICE-PROXY: Obteniendo cliente Supabase original")
  return originalSupabase
}
export const db = dbModule.db
export const supabase = originalSupabase // Exportar el cliente original

// Exportar por defecto para mantener compatibilidad con importaciones por defecto
export default dbModule.dbService
