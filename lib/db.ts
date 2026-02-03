/**
 * Wrapper de base de datos que proporciona una interfaz compatible con better-sqlite3
 * pero utiliza Neon PostgreSQL como backend.
 * 
 * Este módulo convierte automáticamente las queries de SQLite (con placeholders ?)
 * a PostgreSQL (con placeholders $1, $2, etc.) y maneja la inicialización de la base de datos.
 * 
 * La migración de datos de SQLite a Neon se realiza automáticamente en la primera ejecución.
 */

import { initNeonDb, query as queryNeon, getClient } from './db-neon';
import { QueryResultRow } from 'pg';

let initialized = false;

/**
 * Asegura que la base de datos Neon esté inicializada.
 * Omite la inicialización durante el build de Next.js.
 */
async function ensureInitialized() {
  const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                      process.env.NEXT_PHASE === 'phase-production-build' ||
                      (process.env.VERCEL === '1' && process.env.NEXT_PHASE);
  
  if (isBuildTime) {
    return;
  }
  
  if (!initialized) {
    await initNeonDb();
    initialized = true;
  }
}

/**
 * Objeto de base de datos que proporciona métodos compatibles con better-sqlite3.
 * Todas las funciones son asíncronas (necesario para PostgreSQL).
 */
export const db = {
  /**
   * Ejecuta una query y devuelve todos los resultados.
   * Convierte automáticamente placeholders de SQLite (?) a PostgreSQL ($1, $2, etc.).
   * 
   * @param sql - Query SQL con placeholders de SQLite (?)
   * @param params - Array de parámetros para la query
   * @returns Promise con array de resultados
   */
  async query<T extends QueryResultRow = any>(sql: string, params?: any[]): Promise<T[]> {
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
    
    const result = await queryNeon<T>(pgSql, pgParams);
    return result.rows;
  },

  /**
   * Prepara una query SQL para ejecución posterior.
   * Retorna un objeto con métodos all(), get() y run() para compatibilidad con better-sqlite3.
   * 
   * @param sql - Query SQL con placeholders de SQLite (?)
   * @returns Objeto con métodos all(), get() y run()
   */
  prepare(sql: string) {
    return {
      /**
       * Ejecuta la query y obtiene todos los resultados.
       * 
       * @param params - Array de parámetros para la query
       * @returns Promise con array de resultados
       */
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

      /**
       * Ejecuta la query y obtiene un solo resultado (primera fila).
       * 
       * @param params - Array de parámetros para la query
       * @returns Promise con el primer resultado o null si no hay resultados
       */
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

      /**
       * Ejecuta una query de modificación (INSERT/UPDATE/DELETE).
       * Si la query tiene RETURNING id, extrae el ID de la fila insertada.
       * 
       * @param params - Array de parámetros para la query
       * @returns Promise con objeto { lastInsertRowid: number | null, changes: number }
       */
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
        
        const hasReturning = /RETURNING\s+id/i.test(pgSql);
        
        const result = await queryNeon(pgSql, pgParams);
        
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

  /**
   * Ejecuta SQL directamente sin parámetros (útil para CREATE TABLE, etc.).
   * 
   * @param sql - Query SQL sin parámetros
   * @returns Promise que se resuelve cuando la query se completa
   */
  async exec(sql: string): Promise<void> {
    await ensureInitialized();
    await queryNeon(sql);
  }
};

export default db;
