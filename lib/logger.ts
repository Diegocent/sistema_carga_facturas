/**
 * Sistema de logging general para la aplicación
 * Registra todas las operaciones críticas: base de datos, carga de datos, errores, etc.
 */

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system';
  message: string;
  data?: any;
}

const MAX_LOG_ENTRIES = 2000; // Aumentado para más historial
let logBuffer: LogEntry[] = [];

// Cargar logs previos del localStorage
if (typeof window !== 'undefined') {
  try {
    const savedLogs = localStorage.getItem('app_logs');
    if (savedLogs) {
      logBuffer = JSON.parse(savedLogs);
      // Mantener solo los últimos MAX_LOG_ENTRIES
      if (logBuffer.length > MAX_LOG_ENTRIES) {
        logBuffer = logBuffer.slice(-MAX_LOG_ENTRIES);
      }
    }
  } catch (e) {
    console.error('Error al cargar logs:', e);
  }
}

function saveLogs() {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('app_logs', JSON.stringify(logBuffer));
    } catch (e) {
      console.error('Error al guardar logs:', e);
      // Si el localStorage está lleno, intentar limpiar logs antiguos
      if (e instanceof Error && e.name === 'QuotaExceededError') {
        logBuffer = logBuffer.slice(-500); // Mantener solo los últimos 500
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
 * Obtener todos los logs
 */
export function getLogs(): LogEntry[] {
  return [...logBuffer];
}

/**
 * Obtener logs filtrados por categoría o nivel
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
  
  // Ordenar por timestamp descendente (más recientes primero)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  if (filters?.limit) {
    filtered = filtered.slice(0, filters.limit);
  }
  
  return filtered;
}

/**
 * Limpiar logs
 */
export function clearLogs() {
  logBuffer = [];
  if (typeof window !== 'undefined') {
    localStorage.removeItem('app_logs');
  }
}

/**
 * Exportar logs como texto
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
 * Descargar logs como archivo
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
 * Obtener estadísticas de logs
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

