/**
 * Sistema de logging general para la aplicación.
 * 
 * Registra todas las operaciones críticas: base de datos, carga de datos, errores, etc.
 * Los logs se almacenan en memoria y en localStorage (solo en el navegador).
 */

/**
 * Interfaz que representa una entrada de log.
 */
export interface LogEntry {
  /** Timestamp ISO de cuando se creó el log */
  timestamp: string;
  /** Nivel de severidad del log */
  level: 'info' | 'warn' | 'error';
  /** Categoría del log */
  category: 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system';
  /** Mensaje descriptivo del log */
  message: string;
  /** Datos adicionales opcionales */
  data?: any;
}

const MAX_LOG_ENTRIES = 2000;
let logBuffer: LogEntry[] = [];

if (typeof window !== 'undefined') {
  try {
    const savedLogs = localStorage.getItem('app_logs');
    if (savedLogs) {
      logBuffer = JSON.parse(savedLogs);
      if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer = logBuffer.slice(-MAX_LOG_ENTRIES);
      }
    }
  } catch (e) {
    console.error('Error al cargar logs:', e);
  }
}

/**
 * Guarda los logs en localStorage.
 * Si el localStorage está lleno, reduce el buffer a 500 entradas y reintenta.
 */
function saveLogs() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app_logs', JSON.stringify(logBuffer));
    } catch (e) {
      console.error('Error al guardar logs:', e);
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        logBuffer = logBuffer.slice(-500);
        try {
          localStorage.setItem('app_logs', JSON.stringify(logBuffer));
        } catch (e2) {
          console.error('Error al guardar logs después de limpiar:', e2);
        }
      }
    }
  }
}

function addLog(
  level: 'info' | 'warn' | 'error',
  category: LogEntry['category'],
  message: string,
  data?: any
) {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    category,
    message,
    data
  };

  logBuffer.push(entry);
  
  // Mantener solo los últimos MAX_LOG_ENTRIES
  if (logBuffer.length > MAX_LOG_ENTRIES) {
    logBuffer = logBuffer.slice(-MAX_LOG_ENTRIES);
  }

  // Log en consola con formato mejorado
  const logMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  const prefix = `[${category.toUpperCase()} ${level.toUpperCase()}]`;
  logMethod(`${prefix} ${message}`, data || '');

  // Guardar en localStorage
  saveLogs();
}

// Funciones de logging por categoría
export function logInfo(category: LogEntry['category'], message: string, data?: any) {
  addLog('info', category, message, data);
}

export function logWarn(category: LogEntry['category'], message: string, data?: any) {
  addLog('warn', category, message, data);
}

export function logError(category: LogEntry['category'], message: string, data?: any) {
  addLog('error', category, message, data);
}

/**
 * Obtiene todos los logs almacenados.
 * 
 * @returns Array con todas las entradas de log (copia del buffer)
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Obtiene logs filtrados por categoría, nivel o limitados en cantidad.
 * Los resultados se ordenan por timestamp descendente (más recientes primero).
 * 
 * @param filters - Filtros opcionales para aplicar
 * @param filters.category - Filtrar por categoría específica
 * @param filters.level - Filtrar por nivel específico
 * @param filters.limit - Limitar cantidad de resultados
 * @returns Array con las entradas de log filtradas y ordenadas
 */
export function getLogsFiltered(filters?: {
  category?: LogEntry['category'];
  level?: LogEntry['level'];
  limit?: number;
}): LogEntry[] {
  let filtered = [...logBuffer];
  
  if (filters?.category) {
    filtered = filtered.filter(log => log.category === filters.category);
  }
  
  if (filters?.level) {
    filtered = filtered.filter(log => log.level === filters.level);
  }
  
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

/**
 * Limpia todos los logs del buffer y del localStorage.
 */
export function clearLogs() {
  logBuffer = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('app_logs');
  }
}

/**
 * Exporta los logs como texto plano formateado.
 * 
 * @param filters - Filtros opcionales para aplicar antes de exportar
 * @param filters.category - Filtrar por categoría específica
 * @param filters.level - Filtrar por nivel específico
 * @returns String con los logs formateados, separados por doble salto de línea
 */
export function exportLogsAsText(filters?: {
  category?: LogEntry['category'];
  level?: LogEntry['level'];
}): string {
  const logs = filters ? getLogsFiltered(filters) : logBuffer;
  return logs.map(entry => {
    const dataStr = entry.data ? `\n  Data: ${JSON.stringify(entry.data, null, 2)}` : '';
    return `[${entry.timestamp}] [${entry.category.toUpperCase()}] ${entry.level.toUpperCase()}: ${entry.message}${dataStr}`;
  }).join('\n\n');
}

/**
 * Descarga los logs como un archivo de texto.
 * 
 * @param filters - Filtros opcionales para aplicar antes de descargar
 * @param filters.category - Filtrar por categoría específica
 * @param filters.level - Filtrar por nivel específico
 */
export async function downloadLogs(filters?: {
  category?: LogEntry['category'];
  level?: LogEntry['level'];
}) {
  const logsText = exportLogsAsText(filters);
  const blob = new Blob([logsText], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  const filterStr = filters?.category ? `_${filters.category}` : '';
  const levelStr = filters?.level ? `_${filters.level}` : '';
  a.download = `app_logs${filterStr}${levelStr}_${dateStr}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Obtiene estadísticas de los logs almacenados.
 * 
 * @returns Objeto con estadísticas:
 *   - total: cantidad total de logs
 *   - byLevel: cantidad por nivel (info, warn, error)
 *   - byCategory: cantidad por categoría
 *   - lastError: última entrada de error (si existe)
 *   - lastWarning: última entrada de advertencia (si existe)
 */
export function getLogStats() {
  const stats = {
    total: logBuffer.length,
    byLevel: {
      info: 0,
      warn: 0,
      error: 0,
    },
    byCategory: {
      database: 0,
      api: 0,
      frontend: 0,
      ruc: 0,
      tauri: 0,
      system: 0,
    },
    lastError: null as LogEntry | null,
    lastWarning: null as LogEntry | null,
  };

  for (const log of logBuffer) {
    stats.byLevel[log.level]++;
    stats.byCategory[log.category]++;
    
    if (log.level === 'error' && !stats.lastError) {
      stats.lastError = log;
    }
    if (log.level === 'warn' && !stats.lastWarning) {
      stats.lastWarning = log;
    }
  }

  return stats;
}

