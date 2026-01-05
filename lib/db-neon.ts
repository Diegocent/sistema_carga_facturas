import { Pool, QueryResult, QueryResultRow } from 'pg';
// SQLite solo se usa para migración en desarrollo local (no en producción web)
// Importación condicional: solo en desarrollo local, no en Vercel/producción web
let Database: any = null;
try {
  // Solo intentar importar en desarrollo local (no en Vercel)
  if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'production') {
    Database = require('better-sqlite3');
  }
} catch (e) {
  // better-sqlite3 no está disponible (normal en Vercel)
  Database = null;
}
import path from 'path';
import fs from 'fs';

// URL de conexión a Neon PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

// Pool de conexiones a Neon
let pool: Pool | null = null;

// Inicializar pool de conexiones
function initPool(): Pool {
  if (!pool) {
    // No crear pool durante el build
    const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                        process.env.NEXT_PHASE === 'phase-production-build';
    
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
      connectionTimeoutMillis: 10000, // Aumentado a 10 segundos para conexiones desde Docker
      statement_timeout: 30000, // Timeout para queries individuales
      query_timeout: 30000,
    });
    
    // Manejar errores de conexión
    pool.on('error', (err) => {
      console.error('Error inesperado en el pool de PostgreSQL:', err);
    });
  }
  return pool;
}

// Obtener pool de conexiones
export function getPool(): Pool {
  return initPool();
}

// Verificar si existe la base de datos SQLite
// IMPORTANTE: En entorno web/Docker, NO usar SQLite
function existeSQLite(): boolean {
  // Si estamos en entorno web (no Tauri), nunca usar SQLite
  const isWebEnvironment = typeof window === 'undefined' && !process.env.TAURI_DEV;
  
  if (isWebEnvironment) {
    return false; // En web, siempre usar solo Neon
  }
  
  const dbPath = path.join(process.cwd(), 'facturas.db');
  return fs.existsSync(dbPath);
}

// Migrar datos de SQLite a Neon PostgreSQL
// IMPORTANTE: Solo se ejecuta en desarrollo local, nunca en producción web/Docker
async function migrarSQLiteANeon(): Promise<void> {
  // En entorno web/Docker, nunca intentar migrar desde SQLite
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
  
  // Verificar que better-sqlite3 esté disponible
  if (!Database) {
    console.log('[MIGRACIÓN] better-sqlite3 no está disponible (entorno web), omitiendo migración');
    return;
  }
  
  try {
    // Abrir base de datos SQLite
    const sqliteDb = new Database(dbPath);
    
    // Obtener todas las facturas de SQLite
    const facturas = sqliteDb.prepare('SELECT * FROM facturas ORDER BY id').all() as any[];
    
    console.log(`[MIGRACIÓN] Encontradas ${facturas.length} facturas en SQLite`);
    
    if (facturas.length === 0) {
      sqliteDb.close();
      console.log('[MIGRACIÓN] No hay datos para migrar');
      return;
    }

    // Conectar a Neon
    const neonPool = getPool();
    const client = await neonPool.connect();

    try {
      // Iniciar transacción
      await client.query('BEGIN');

      // Verificar si ya hay datos en Neon (evitar duplicados)
      const countResult = await client.query('SELECT COUNT(*) as count FROM facturas');
      const count = parseInt(countResult.rows[0].count);
      
      if (count > 0) {
        console.log(`[MIGRACIÓN] Ya existen ${count} facturas en Neon, omitiendo migración`);
        await client.query('ROLLBACK');
        return;
      }

      // Insertar facturas en Neon
      // Nota: No incluimos id en el INSERT para que PostgreSQL use la secuencia automáticamente
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
          
          // Si se insertó (rowCount > 0), incrementar contador
          if (result.rowCount && result.rowCount > 0) {
            migradas++;
          }
        } catch (error: any) {
          console.error(`[MIGRACIÓN] Error al migrar factura ${factura.id} (${factura.numero_factura}):`, error.message);
          // Continuar con la siguiente factura
        }
      }

      // Confirmar transacción
      await client.query('COMMIT');
      
      console.log(`[MIGRACIÓN] Migración completada exitosamente: ${migradas} de ${facturas.length} facturas migradas`);
      
      // Crear archivo de marcador para indicar que la migración se completó
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

// Crear tabla en Neon si no existe
async function crearTablaNeon(): Promise<void> {
  // No ejecutar durante el build
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

    // Crear índice en numero_factura si no existe (ya es UNIQUE pero ayuda con las búsquedas)
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

// Inicializar base de datos Neon (crear tabla y migrar si es necesario)
let inicializacionCompleta = false;

export async function initNeonDb(): Promise<void> {
  if (inicializacionCompleta) {
    return;
  }

  // No ejecutar NADA durante el build de Next.js
  // Solo ejecutar durante el runtime de la aplicación
  // Detectamos build time verificando si estamos en proceso de construcción
  const isBuildTime = process.env.TAURI_BUILD === 'true' || 
                      process.env.NEXT_PHASE === 'phase-production-build' ||
                      (typeof process !== 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL);

  // Si estamos en build time, no hacer nada
  if (isBuildTime) {
    console.log('[NEON] Build time detectado, omitiendo inicialización');
    inicializacionCompleta = true;
    return;
  }

  try {
    // Verificar si ya se realizó la migración (solo en runtime, no en build)
    const migrationMarker = path.join(process.cwd(), '.migracion-completada');
    const yaMigrado = fs.existsSync(migrationMarker);

    // Crear tabla en Neon (solo en runtime)
    await crearTablaNeon();

    // Migrar datos de SQLite solo si:
    // 1. Existe SQLite
    // 2. No se ha migrado antes
    if (!yaMigrado && existeSQLite()) {
      await migrarSQLiteANeon();
    }

    inicializacionCompleta = true;
  } catch (error: any) {
    console.error('[NEON] Error al inicializar base de datos:', error);
    // Continuar aunque haya error en la migración
    inicializacionCompleta = true;
  }
}

// Cerrar pool de conexiones (útil para tests o shutdown)
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    inicializacionCompleta = false;
  }
}

// Helper para ejecutar queries
export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const pool = getPool();
  return await pool.query<T>(text, params);
}

// Helper para obtener un cliente del pool
export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

