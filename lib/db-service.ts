// Importar desde el nuevo archivo db.ts para mantener compatibilidad
import { dbService } from "./db"

// Re-exportar el servicio para mantener todas las importaciones existentes funcionando
export { dbService }

// Si hay alguna exportación adicional en el archivo original, también la re-exportamos
export default dbService





























