// Este archivo ahora usa Neon PostgreSQL en lugar de SQLite
// La migración de datos de SQLite a Neon se realiza automáticamente en la primera ejecución

import { initNeonDb, query as queryNeon, getClient } from './db-neon';
import { QueryResultRow } from 'pg';

// Inicializar base de datos Neon (se ejecuta solo una vez)
let initialized = false;

async function ensureInitialized() {
  // No inicializar durante el build
  const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                      process.env.NEXT_PHASE === 'phase-production-build' ||
                      (process.env.VERCEL === '1' && process.env.NEXT_PHASE);
  
  if (isBuildTime) {
    return; // Omitir inicialización durante el build
  }
  
  if (!initialized) {
    await initNeonDb();
    initialized = true;
  }
}

// Wrapper para mantener compatibilidad con código existente
// Nota: Las funciones ahora son asíncronas (necesario para PostgreSQL)
export const db = {
  // Ejecutar query y devolver todos los resultados
  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]> {
    await ensureInitialized();
    
    // Convertir placeholders de SQLite (?) a PostgreSQL ($1, $2, etc.)
    let pgSql = sql;
    const pgParams: any[] = [];
    
    if (params) {
      let paramIndex = 1;
      pgSql = sql.replace(/\?/g, () => {
        pgParams.push(params[paramIndex - 1]);
        return `$${paramIndex++}`;
      });
    }
    
    const result = await queryNeon<T>(pgSql, pgParams);
    return result.rows;
  },

  // Preparar y ejecutar query (simulado para compatibilidad)
  prepare(sql: string) {
    return {
      // Ejecutar query y obtener todos los resultados
      all: async (params?: any[]) => {
        await ensureInitialized();
        
        let pgSql = sql;
        const pgParams: any[] = [];
        
        if (params) {
          let paramIndex = 1;
          pgSql = sql.replace(/\?/g, () => {
            pgParams.push(params[paramIndex - 1]);
            return `$${paramIndex++}`;
          });
        }
        
        const result = await queryNeon(pgSql, pgParams);
        return result.rows;
      },

      // Ejecutar query y obtener un solo resultado
      get: async (params?: any[]) => {
        await ensureInitialized();
        
        let pgSql = sql;
        const pgParams: any[] = [];
        
        if (params) {
          let paramIndex = 1;
          pgSql = sql.replace(/\?/g, () => {
            pgParams.push(params[paramIndex - 1]);
            return `$${paramIndex++}`;
          });
        }
        
        const result = await queryNeon(pgSql, pgParams);
        return result.rows[0] || null;
      },

      // Ejecutar query (INSERT/UPDATE/DELETE)
      run: async (params?: any[]) => {
        await ensureInitialized();
        
        let pgSql = sql;
        const pgParams: any[] = [];
        
        if (params) {
          let paramIndex = 1;
          pgSql = sql.replace(/\?/g, () => {
            pgParams.push(params[paramIndex - 1]);
            return `$${paramIndex++}`;
          });
        }
        
        // Si la query tiene RETURNING, extraer el ID de las filas
        const hasReturning = /RETURNING\s+id/i.test(pgSql);
        
        const result = await queryNeon(pgSql, pgParams);
        
        // Simular el comportamiento de better-sqlite3
        // Si hay RETURNING id, el ID viene en result.rows[0].id
        // Si no, intentamos obtenerlo de otra forma
        let lastInsertRowid: number | bigint | null = null;
        if (hasReturning && result.rows.length > 0) {
          lastInsertRowid = result.rows[0].id;
        }
        
        return {
          lastInsertRowid: lastInsertRowid || null,
          changes: result.rowCount || 0
        };
      }
    };
  },

  // Ejecutar SQL directamente (para CREATE TABLE, etc.)
  async exec(sql: string): Promise<void> {
    await ensureInitialized();
    await queryNeon(sql);
  }
};

// NO inicializar automáticamente durante el import
// Se inicializará automáticamente en el primer uso (cuando se llame a cualquier método de db)

export default db;
