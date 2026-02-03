/**
 * Módulo de conexión a Neon PostgreSQL.
 * 
 * Proporciona funciones para:
 * - Gestionar el pool de conexiones a Neon PostgreSQL
 * - Crear la tabla de facturas si no existe
 * - Migrar datos de SQLite a Neon (solo en desarrollo local)
 * 
 * SQLite solo se usa para migración en desarrollo local, nunca en producción web.
 */

import { Pool, QueryResult, QueryResultRow } from 'pg';
let Database: any = null;
try {
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    Database = require('better-sqlite3');
  }
} catch (e) {
  Database = null;
}
import path from 'path';
import fs from 'fs';

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

let pool: Pool | null = null;

/**
 * Inicializa el pool de conexiones a Neon PostgreSQL.
 * No se inicializa durante el build de Next.js.
 * 
 * @returns Pool de conexiones a PostgreSQL
 * @throws Error si se intenta inicializar durante el build
 */
function initPool(): Pool {
  if (!pool) {
    // No crear pool durante el build
    const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                        process.env.NEXT_PHASE === 'phase-production-build' ||
                        process.env.VERCEL === '1' && process.env.NEXT_PHASE;
    
    if (isBuildTime) {
      throw new Error('No se puede inicializar pool durante el build');
    }
    
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: {
        rejectUnauthorized: false
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      statement_timeout: 30000,
      query_timeout: 30000,
    });
    
    pool.on('error', (err) => {
      console.error('Error inesperado en el pool de PostgreSQL:', err);
    });
  }
  return pool;
}

/**
 * Obtiene el pool de conexiones a Neon PostgreSQL, inicializándolo si es necesario.
 * 
 * @returns Pool de conexiones a PostgreSQL
 */
export function getPool(): Pool {
  return initPool();
}

/**
 * Verifica si existe la base de datos SQLite local.
 * En entorno web/Docker siempre retorna false (no se usa SQLite).
 * 
 * @returns true si existe SQLite y estamos en entorno local, false en caso contrario
 */
function existeSQLite(): boolean {
  const isWebEnvironment = typeof window === 'undefined' && !process.env.TAURI_DEV;
  
  if (isWebEnvironment) {
    return false;
  }
  
  const dbPath = path.join(process.cwd(), 'facturas.db');
  return fs.existsSync(dbPath);
}

/**
 * Migra datos de SQLite local a Neon PostgreSQL.
 * Solo se ejecuta en desarrollo local, nunca en producción web/Docker.
 * 
 * Evita duplicados usando ON CONFLICT DO NOTHING en el número de factura.
 * 
 * @throws Error si falla la migración
 */
async function migrarSQLiteANeon(): Promise<void> {
  const isWebEnvironment = typeof window === 'undefined' && !process.env.TAURI_DEV;
  
  if (isWebEnvironment) {
    console.log('[MIGRACIÓN] Entorno web detectado, omitiendo migración desde SQLite');
    return;
  }
  
  const dbPath = path.join(process.cwd(), 'facturas.db');
  
  if (!fs.existsSync(dbPath)) {
    console.log('[MIGRACIÓN] No se encontró base de datos SQLite, omitiendo migración');
    return;
  }

  console.log('[MIGRACIÓN] Iniciando migración de SQLite a Neon PostgreSQL...');
  
  if (!Database) {
    console.log('[MIGRACIÓN] better-sqlite3 no está disponible (entorno web), omitiendo migración');
    return;
  }
  
  try {
    const sqliteDb = new Database(dbPath);
    const facturas = sqliteDb.prepare('SELECT * FROM facturas ORDER BY id').all() as any[];
    
    console.log(`[MIGRACIÓN] Encontradas ${facturas.length} facturas en SQLite`);
    
    if (facturas.length === 0) {
      sqliteDb.close();
      console.log('[MIGRACIÓN] No hay datos para migrar');
      return;
    }

    const neonPool = getPool();
    const client = await neonPool.connect();

    try {
      await client.query('BEGIN');

      const countResult = await client.query('SELECT COUNT(*) as count FROM facturas');
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        console.log(`[MIGRACIÓN] Ya existen ${count} facturas en Neon, omitiendo migración`);
        await client.query('ROLLBACK');
        return;
      }

      const insertQuery = `
        INSERT INTO facturas (
          numero_factura, fecha_emision, nombre_cliente, ruc, 
          es_persona_juridica, cantidad, descripcion, costo_final, 
          es_anulada, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (numero_factura) DO NOTHING
      `;

      let migradas = 0;
      for (const factura of facturas) {
        try {
          const result = await client.query(insertQuery, [
            factura.numero_factura,
            factura.fecha_emision || null,
            factura.nombre_cliente || null,
            factura.ruc || null,
            factura.es_persona_juridica === 1 || factura.es_persona_juridica === true ? true : false,
            factura.cantidad || null,
            factura.descripcion || null,
            factura.costo_final || null,
            factura.es_anulada === 1 || factura.es_anulada === true ? true : false,
            factura.created_at || new Date().toISOString()
          ]);
          
          if (result.rowCount && result.rowCount > 0) {
            migradas++;
          }
        } catch (error: any) {
          console.error(`[MIGRACIÓN] Error al migrar factura ${factura.id} (${factura.numero_factura}):`, error.message);
        }
      }

      await client.query('COMMIT');
      
      console.log(`[MIGRACIÓN] Migración completada exitosamente: ${migradas} de ${facturas.length} facturas migradas`);
      
      const migrationMarker = path.join(process.cwd(), '.migracion-completada');
      fs.writeFileSync(migrationMarker, new Date().toISOString());
      console.log('[MIGRACIÓN] Marcador de migración creado');
      
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[MIGRACIÓN] Error durante la migración:', error);
      throw error;
    } finally {
      client.release();
      sqliteDb.close();
    }
    
  } catch (error: any) {
    console.error('[MIGRACIÓN] Error al migrar datos:', error);
    throw error;
  }
}

/**
 * Crea la tabla de facturas en Neon PostgreSQL si no existe.
 * También crea un índice en numero_factura para optimizar búsquedas.
 * No se ejecuta durante el build de Next.js.
 * 
 * @throws Error si falla la creación de la tabla
 */
async function crearTablaNeon(): Promise<void> {
  const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                      process.env.NEXT_PHASE === 'phase-production-build';
  
  if (isBuildTime) {
    console.log('[NEON] Build time detectado, omitiendo creación de tabla');
    return;
  }
  
  const pool = getPool();
  const client = await pool.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS facturas (
        id SERIAL PRIMARY KEY,
        numero_factura TEXT NOT NULL UNIQUE,
        fecha_emision TEXT,
        nombre_cliente TEXT,
        ruc TEXT,
        es_persona_juridica BOOLEAN NOT NULL DEFAULT true,
        cantidad TEXT,
        descripcion TEXT,
        costo_final TEXT,
        es_anulada BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_facturas_numero_factura ON facturas(numero_factura)
    `);

    console.log('[NEON] Tabla facturas verificada/creada exitosamente');
  } catch (error: any) {
    console.error('[NEON] Error al crear tabla:', error);
    throw error;
  } finally {
    client.release();
  }
}

let inicializacionCompleta = false;

/**
 * Inicializa la base de datos Neon PostgreSQL.
 * 
 * Realiza las siguientes operaciones:
 * 1. Crea la tabla de facturas si no existe
 * 2. Migra datos de SQLite a Neon si existe SQLite local y no se ha migrado antes
 * 
 * No se ejecuta durante el build de Next.js, solo en runtime.
 * 
 * @throws Error si falla la inicialización (aunque continúa si solo falla la migración)
 */
export async function initNeonDb(): Promise<void> {
  if (inicializacionCompleta) {
    return;
  }

  const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                      process.env.NEXT_PHASE === 'phase-production-build' ||
                      (process.env.VERCEL === '1' && process.env.NEXT_PHASE);

  if (isBuildTime) {
    console.log('[NEON] Build time detectado, omitiendo inicialización');
    inicializacionCompleta = true;
    return;
  }

  try {
    const migrationMarker = path.join(process.cwd(), '.migracion-completada');
    const yaMigrado = fs.existsSync(migrationMarker);

    await crearTablaNeon();

    if (!yaMigrado && existeSQLite()) {
      await migrarSQLiteANeon();
    }

    inicializacionCompleta = true;
  } catch (error: any) {
    console.error('[NEON] Error al inicializar base de datos:', error);
    inicializacionCompleta = true;
  }
}

/**
 * Cierra el pool de conexiones a Neon PostgreSQL.
 * Útil para tests o shutdown graceful de la aplicación.
 * 
 * @returns Promise que se resuelve cuando el pool se cierra
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    inicializacionCompleta = false;
  }
}

/**
 * Ejecuta una query en Neon PostgreSQL.
 * 
 * @param text - Query SQL con placeholders de PostgreSQL ($1, $2, etc.)
 * @param params - Array de parámetros para la query
 * @returns Promise con el resultado de la query
 */
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  return await pool.query<T>(text, params);
}

/**
 * Obtiene un cliente del pool de conexiones para ejecutar múltiples queries en una transacción.
 * 
 * @returns Promise con un cliente de PostgreSQL (recuerda hacer release() cuando termines)
 */
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

