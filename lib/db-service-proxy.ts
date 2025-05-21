// Log distintivo para verificar que se está cargando el proxy
console.log('🔄 CARGANDO: Proxy de servicio de base de datos (lib/db-service-proxy.ts)');

// Este archivo sirve como proxy para mantener compatibilidad con el código existente
// Importa y reexporta todo desde el nuevo sistema modular

import * as dbModule from "./db"

// Reexportar todo
export const dbService = dbModule.dbService
export const getSupabase = dbModule.getSupabase
export const db = dbModule.db
export const supabase = dbModule.supabase

// Exportar por defecto para mantener compatibilidad con importaciones por defecto
export default dbModule.dbService