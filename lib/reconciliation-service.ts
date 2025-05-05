// lib/reconciliation-service.tsx
import { createClient } from '@/utils/supabase/server';
import { format } from 'date-fns';

// Tipos para las discrepancias
export interface StockDiscrepancy {
  id: number;
  date: string;
  location_id: number;
  shift: string;
  product_id: number;
  product_name: string;
  category: string;
  expected_quantity: number;
  actual_quantity: number;
  difference: number;
  unit_cost: number;
  total_value: number;
  status: string;
  created_at?: string;
}

export interface CashDiscrepancy {
  id: number;
  date: string;
  location_id: number;
  shift: string;
  payment_method: string;
  expected_amount: number;
  actual_amount: number;
  difference: number;
  status: string;
  created_at?: string;
}

// Función para generar discrepancias
export async function generateDiscrepancies(
  locationId: number, 
  date: string, 
  shift: string, 
  overwrite: boolean = false
) {
  const supabase = createClient();
  
  try {
    // Formatear la fecha si es necesario
    const formattedDate = date.includes('T') 
      ? date.split('T')[0] 
      : date;
    
    // Llamar al procedimiento almacenado
    const { data, error } = await supabase.rpc('generate_discrepancies', {
      p_location_id: locationId,
      p_date: formattedDate,
      p_shift: shift,
      p_overwrite: overwrite
    });
    
    if (error) {
      console.error('Error al generar discrepancias:', error);
      return { 
        success: false, 
        error: error.message || 'Error al generar discrepancias' 
      };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en generateDiscrepancies:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al generar discrepancias' 
    };
  }
}

// Función para obtener discrepancias de stock
export async function getStockDiscrepancies(
  locationId: number, 
  date: string, 
  shift: string
): Promise<StockDiscrepancy[]> {
  const supabase = createClient();
  
  try {
    // Formatear la fecha si es necesario
    const formattedDate = date.includes('T') 
      ? date.split('T')[0] 
      : date;
    
    const { data, error } = await supabase
      .from('stock_discrepancies')
      .select('*')
      .eq('location_id', locationId)
      .eq('date', formattedDate)
      .eq('shift', shift)
      .order('total_value', { ascending: false });
    
    if (error) {
      console.error('Error al obtener discrepancias de stock:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getStockDiscrepancies:', error);
    return [];
  }
}

// Función para obtener discrepancias de caja
export async function getCashDiscrepancies(
  locationId: number, 
  date: string, 
  shift: string
): Promise<CashDiscrepancy[]> {
  const supabase = createClient();
  
  try {
    // Formatear la fecha si es necesario
    const formattedDate = date.includes('T') 
      ? date.split('T')[0] 
      : date;
    
    const { data, error } = await supabase
      .from('cash_discrepancies')
      .select('*')
      .eq('location_id', locationId)
      .eq('date', formattedDate)
      .eq('shift', shift)
      .order('payment_method', { ascending: true });
    
    if (error) {
      console.error('Error al obtener discrepancias de caja:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error en getCashDiscrepancies:', error);
    return [];
  }
}

// Función para actualizar el estado de una discrepancia de stock
export async function updateStockDiscrepancyStatus(
  id: number, 
  status: string
) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('stock_discrepancies')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      console.error('Error al actualizar estado de discrepancia de stock:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en updateStockDiscrepancyStatus:', error);
    return { success: false, error: error.message };
  }
}

// Función para actualizar el estado de una discrepancia de caja
export async function updateCashDiscrepancyStatus(
  id: number, 
  status: string
) {
  const supabase = createClient();
  
  try {
    const { data, error } = await supabase
      .from('cash_discrepancies')
      .update({ status })
      .eq('id', id);
    
    if (error) {
      console.error('Error al actualizar estado de discrepancia de caja:', error);
      return { success: false, error: error.message };
    }
    
    return { success: true, data };
  } catch (error: any) {
    console.error('Error en updateCashDiscrepancyStatus:', error);
    return { success: false, error: error.message };
  }
}

// Función para obtener resumen de discrepancias por local
export async function getDiscrepancySummaryByLocation(
  startDate: string, 
  endDate: string
) {
  const supabase = createClient();
  
  try {
    // Formatear las fechas si es necesario
    const formattedStartDate = startDate.includes('T') 
      ? startDate.split('T')[0] 
      : startDate;
    
    const formattedEndDate = endDate.includes('T') 
      ? endDate.split('T')[0] 
      : endDate;
    
    // Obtener resumen de discrepancias de stock
    const { data: stockData, error: stockError } = await supabase
      .from('stock_discrepancies')
      .select(`
        location_id,
        locations(name),
        count(*),
        sum(total_value)
      `)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate)
      .group('location_id, locations(name)');
    
    if (stockError) {
      console.error('Error al obtener resumen de discrepancias de stock:', stockError);
      return { success: false, error: stockError.message };
    }
    
    // Obtener resumen de discrepancias de caja
    const { data: cashData, error: cashError } = await supabase
      .from('cash_discrepancies')
      .select(`
        location_id,
        locations(name),
        count(*),
        sum(difference)
      `)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate)
      .group('location_id, locations(name)');
    
    if (cashError) {
      console.error('Error al obtener resumen de discrepancias de caja:', cashError);
      return { success: false, error: cashError.message };
    }
    
    // Combinar los resultados
    const locations = new Map();
    
    stockData?.forEach((item: any) => {
      locations.set(item.location_id, {
        location_id: item.location_id,
        location_name: item.locations?.name || `Local ${item.location_id}`,
        stock_discrepancies_count: parseInt(item.count, 10) || 0,
        stock_discrepancies_value: parseFloat(item.sum) || 0,
        cash_discrepancies_count: 0,
        cash_discrepancies_value: 0
      });
    });
    
    cashData?.forEach((item: any) => {
      if (locations.has(item.location_id)) {
        const location = locations.get(item.location_id);
        location.cash_discrepancies_count = parseInt(item.count, 10) || 0;
        location.cash_discrepancies_value = parseFloat(item.sum) || 0;
      } else {
        locations.set(item.location_id, {
          location_id: item.location_id,
          location_name: item.locations?.name || `Local ${item.location_id}`,
          stock_discrepancies_count: 0,
          stock_discrepancies_value: 0,
          cash_discrepancies_count: parseInt(item.count, 10) || 0,
          cash_discrepancies_value: parseFloat(item.sum) || 0
        });
      }
    });
    
    return { 
      success: true, 
      data: Array.from(locations.values()) 
    };
  } catch (error: any) {
    console.error('Error en getDiscrepancySummaryByLocation:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al obtener resumen de discrepancias' 
    };
  }
}

// Función para obtener tendencia de discrepancias por fecha
export async function getDiscrepancyTrendByDate(
  locationId: number, 
  startDate: string, 
  endDate: string
) {
  const supabase = createClient();
  
  try {
    // Formatear las fechas si es necesario
    const formattedStartDate = startDate.includes('T') 
      ? startDate.split('T')[0] 
      : startDate;
    
    const formattedEndDate = endDate.includes('T') 
      ? endDate.split('T')[0] 
      : endDate;
    
    // Obtener tendencia de discrepancias de stock
    const { data: stockData, error: stockError } = await supabase
      .from('stock_discrepancies')
      .select(`
        date,
        shift,
        sum(total_value)
      `)
      .eq('location_id', locationId)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate)
      .group('date, shift')
      .order('date, shift');
    
    if (stockError) {
      console.error('Error al obtener tendencia de discrepancias de stock:', stockError);
      return { success: false, error: stockError.message };
    }
    
    // Obtener tendencia de discrepancias de caja
    const { data: cashData, error: cashError } = await supabase
      .from('cash_discrepancies')
      .select(`
        date,
        shift,
        sum(difference)
      `)
      .eq('location_id', locationId)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate)
      .group('date, shift')
      .order('date, shift');
    
    if (cashError) {
      console.error('Error al obtener tendencia de discrepancias de caja:', cashError);
      return { success: false, error: cashError.message };
    }
    
    // Combinar los resultados
    const trendMap = new Map();
    
    stockData?.forEach((item: any) => {
      const key = `${item.date}-${item.shift}`;
      trendMap.set(key, {
        date: item.date,
        shift: item.shift,
        stock_value: parseFloat(item.sum) || 0,
        cash_value: 0
      });
    });
    
    cashData?.forEach((item: any) => {
      const key = `${item.date}-${item.shift}`;
      if (trendMap.has(key)) {
        const trend = trendMap.get(key);
        trend.cash_value = parseFloat(item.sum) || 0;
      } else {
        trendMap.set(key, {
          date: item.date,
          shift: item.shift,
          stock_value: 0,
          cash_value: parseFloat(item.sum) || 0
        });
      }
    });
    
    // Convertir a array y ordenar por fecha y turno
    const trendData = Array.from(trendMap.values()).sort((a, b) => {
      if (a.date !== b.date) {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      return a.shift.localeCompare(b.shift);
    });
    
    return { 
      success: true, 
      data: trendData 
    };
  } catch (error: any) {
    console.error('Error en getDiscrepancyTrendByDate:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al obtener tendencia de discrepancias' 
    };
  }
}

// Función para obtener las principales discrepancias de stock
export async function getTopStockDiscrepancies(
  locationId: number, 
  startDate: string, 
  endDate: string, 
  limit: number = 10
) {
  const supabase = createClient();
  
  try {
    // Formatear las fechas si es necesario
    const formattedStartDate = startDate.includes('T') 
      ? startDate.split('T')[0] 
      : startDate;
    
    const formattedEndDate = endDate.includes('T') 
      ? endDate.split('T')[0] 
      : endDate;
    
    const { data, error } = await supabase
      .from('stock_discrepancies')
      .select(`
        product_id,
        product_name,
        category,
        sum(total_value) as total_value,
        count(*) as occurrence_count
      `)
      .eq('location_id', locationId)
      .gte('date', formattedStartDate)
      .lte('date', formattedEndDate)
      .group('product_id, product_name, category')
      .order('total_value', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('Error al obtener principales discrepancias de stock:', error);
      return { success: false, error: error.message };
    }
    
    return { 
      success: true, 
      data: data.map((item: any) => ({
        ...item,
        total_value: parseFloat(item.total_value) || 0,
        occurrence_count: parseInt(item.occurrence_count, 10) || 0
      }))
    };
  } catch (error: any) {
    console.error('Error en getTopStockDiscrepancies:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al obtener principales discrepancias de stock' 
    };
  }
}

// Función para verificar si existen discrepancias para una fecha, local y turno
export async function checkDiscrepanciesExist(
  locationId: number, 
  date: string, 
  shift: string
) {
  const supabase = createClient();
  
  try {
    // Formatear la fecha si es necesario
    const formattedDate = date.includes('T') 
      ? date.split('T')[0] 
      : date;
    
    // Verificar discrepancias de stock
    const { count: stockCount, error: stockError } = await supabase
      .from('stock_discrepancies')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('date', formattedDate)
      .eq('shift', shift);
    
    if (stockError) {
      console.error('Error al verificar discrepancias de stock:', stockError);
      return { success: false, error: stockError.message };
    }
    
    // Verificar discrepancias de caja
    const { count: cashCount, error: cashError } = await supabase
      .from('cash_discrepancies')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('date', formattedDate)
      .eq('shift', shift);
    
    if (cashError) {
      console.error('Error al verificar discrepancias de caja:', cashError);
      return { success: false, error: cashError.message };
    }
    
    return { 
      success: true, 
      exists: (stockCount || 0) > 0 || (cashCount || 0) > 0,
      stockCount: stockCount || 0,
      cashCount: cashCount || 0
    };
  } catch (error: any) {
    console.error('Error en checkDiscrepanciesExist:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al verificar discrepancias' 
    };
  }
}

// Función para verificar si existen los datos necesarios para generar discrepancias
export async function checkRequiredDataForDiscrepancies(
  locationId: number, 
  date: string, 
  shift: string
) {
  const supabase = createClient();
  
  try {
    // Formatear la fecha si es necesario
    const formattedDate = date.includes('T') 
      ? date.split('T')[0] 
      : date;
    
    // Convertir locationId a string para las consultas de caja
    const locationIdText = locationId.toString();
    
    // Verificar planilla de stock
    const { count: stockSheetCount, error: stockSheetError } = await supabase
      .from('stock_matrix_sheets')
      .select('*', { count: 'exact', head: true })
      .eq('location_id', locationId)
      .eq('date', formattedDate)
      .eq('shift', shift)
      .eq('status', 'completado');
    
    if (stockSheetError) {
      console.error('Error al verificar planilla de stock:', stockSheetError);
      return { success: false, error: stockSheetError.message };
    }
    
    // Verificar apertura de caja
    const { count: openingCount, error: openingError } = await supabase
      .from('cash_register_openings')
      .select('*', { count: 'exact', head: true })
      .eq('local_id', locationIdText)
      .eq('date', formattedDate)
      .eq('shift', shift);
    
    if (openingError) {
      console.error('Error al verificar apertura de caja:', openingError);
      return { success: false, error: openingError.message };
    }
    
    // Verificar cierre de caja
    const { count: closingCount, error: closingError } = await supabase
      .from('cash_register_closings')
      .select('*', { count: 'exact', head: true })
      .eq('local_id', locationIdText)
      .eq('date', formattedDate)
      .eq('shift', shift);
    
    if (closingError) {
      console.error('Error al verificar cierre de caja:', closingError);
      return { success: false, error: closingError.message };
    }
    
    // Construir mensaje de estado
    let statusMessage = '';
    let missingData = [];
    
    if (stockSheetCount === 0) {
      missingData.push('planilla de stock completada');
    }
    
    if (openingCount === 0) {
      missingData.push('apertura de caja');
    }
    
    if (closingCount === 0) {
      missingData.push('cierre de caja');
    }
    
    if (missingData.length > 0) {
      statusMessage = `Faltan datos: ${missingData.join(', ')}`;
    } else {
      statusMessage = 'Todos los datos necesarios están disponibles';
    }
    
    return { 
      success: true, 
      hasAllData: missingData.length === 0,
      hasStockSheet: stockSheetCount > 0,
      hasOpening: openingCount > 0,
      hasClosing: closingCount > 0,
      statusMessage
    };
  } catch (error: any) {
    console.error('Error en checkRequiredDataForDiscrepancies:', error);
    return { 
      success: false, 
      error: error.message || 'Error inesperado al verificar datos requeridos' 
    };
  }
}

// Exportar todas las funciones
export default {
  generateDiscrepancies,
  getStockDiscrepancies,
  getCashDiscrepancies,
  updateStockDiscrepancyStatus,
  updateCashDiscrepancyStatus,
  getDiscrepancySummaryByLocation,
  getDiscrepancyTrendByDate,
  getTopStockDiscrepancies,
  checkDiscrepanciesExist,
  checkRequiredDataForDiscrepancies
};