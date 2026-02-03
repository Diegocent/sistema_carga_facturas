/**
 * Script para migrar datos de SQLite (Tauri) a Neon PostgreSQL.
 * 
 * Este script lee la base de datos SQLite local (desde la ubicación por defecto de Tauri
 * o desde una ruta proporcionada como argumento) y migra los datos a Neon PostgreSQL.
 * 
 * Uso:
 *   npm run migrar-a-neon [ruta-a-facturas.db]
 * 
 * Si no se proporciona ruta, usa la ubicación por defecto según el sistema operativo:
 *   - Windows: %APPDATA%\gestion-imprenta\facturas.db
 *   - macOS: ~/Library/Application Support/gestion-imprenta/facturas.db
 *   - Linux: ~/.config/gestion-imprenta/facturas.db
 */

const Database = require('better-sqlite3');
const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');
const os = require('os');

const DATABASE_URL = process.env.DATABASE_URL || 
  'postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require';

/**
 * Obtiene la ruta de la base de datos SQLite según el sistema operativo.
 * 
 * @returns Ruta completa al archivo facturas.db
 */
function getSQLitePath() {
  const platform = os.platform();
  let appDataPath;

  if (platform === 'win32') {
    // Windows: %APPDATA%\gestion-imprenta\facturas.db
    appDataPath = path.join(process.env.APPDATA || '', 'gestion-imprenta', 'facturas.db');
  } else if (platform === 'darwin') {
    // macOS: ~/Library/Application Support/gestion-imprenta/facturas.db
    appDataPath = path.join(os.homedir(), 'Library', 'Application Support', 'gestion-imprenta', 'facturas.db');
  } else {
    // Linux: ~/.config/gestion-imprenta/facturas.db
    appDataPath = path.join(os.homedir(), '.config', 'gestion-imprenta', 'facturas.db');
  }

  return appDataPath;
}

/**
 * Verifica si ya se realizó la migración anteriormente.
 * 
 * @param sqlitePath - Ruta al archivo SQLite
 * @returns true si existe el marcador de migración, false en caso contrario
 */
function yaMigrado(sqlitePath) {
  const markerPath = path.join(path.dirname(sqlitePath), '.migracion-completada');
  return fs.existsSync(markerPath);
}

/**
 * Crea un archivo marcador para indicar que la migración se completó.
 * 
 * @param sqlitePath - Ruta al archivo SQLite
 */
function crearMarcadorMigracion(sqlitePath) {
  const markerPath = path.join(path.dirname(sqlitePath), '.migracion-completada');
  fs.writeFileSync(markerPath, new Date().toISOString());
  console.log(`[MIGRACIÓN] Marcador creado: ${markerPath}`);
}

/**
 * Función principal que ejecuta la migración de SQLite a Neon PostgreSQL.
 */
async function migrarSQLiteANeon() {
  console.log('='.repeat(60));
  console.log('SCRIPT DE MIGRACIÓN SQLite -> Neon PostgreSQL');
  console.log('='.repeat(60));
  console.log('');

  let sqlitePath;
  const args = process.argv.slice(2);
  const esRutaPorDefecto = args.length === 0;
  
  if (args.length > 0) {
    sqlitePath = path.resolve(args[0]);
    console.log(`[INFO] Usando ruta proporcionada: ${sqlitePath}`);
  } else {
    sqlitePath = getSQLitePath();
  }
  
  console.log(`[1/5] Buscando base de datos SQLite...`);
  console.log(`     Ruta: ${sqlitePath}`);

  if (!fs.existsSync(sqlitePath)) {
    console.error(`[ERROR] No se encontró la base de datos SQLite en: ${sqlitePath}`);
    console.log('');
    console.log('Uso:');
    console.log('  npm run migrar-a-neon [ruta-a-facturas.db]');
    console.log('');
    console.log('Ejemplo:');
    console.log('  npm run migrar-a-neon "C:\\Users\\Usuario\\AppData\\Roaming\\gestion-imprenta\\facturas.db"');
    console.log('');
    console.log('Ubicaciones por defecto:');
    if (os.platform() === 'win32') {
      console.log('  - Windows: %APPDATA%\\gestion-imprenta\\facturas.db');
    } else if (os.platform() === 'darwin') {
      console.log('  - macOS: ~/Library/Application Support/gestion-imprenta/facturas.db');
    } else {
      console.log('  - Linux: ~/.config/gestion-imprenta/facturas.db');
    }
    console.log('');
    console.log('También puedes buscar manualmente la base de datos SQLite de Tauri:');
    console.log('  1. Abre la aplicación Tauri');
    console.log('  2. Los datos se guardan en la carpeta de datos de la aplicación');
    console.log('  3. Copia la ruta completa de facturas.db y pásala como argumento');
    process.exit(1);
  }

  console.log(`[✓] Base de datos SQLite encontrada`);
  console.log('');

  if (esRutaPorDefecto && yaMigrado(sqlitePath)) {
    console.log(`[INFO] La migración ya se realizó anteriormente.`);
    console.log(`       Si deseas forzar la migración, elimina el archivo:`);
    console.log(`       ${path.join(path.dirname(sqlitePath), '.migracion-completada')}`);
    console.log('');
    
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const respuesta = await new Promise(resolve => {
      readline.question('¿Deseas continuar de todos modos? (s/n): ', resolve);
    });
    readline.close();

    if (respuesta.toLowerCase() !== 's' && respuesta.toLowerCase() !== 'si') {
      console.log('[CANCELADO] Migración cancelada por el usuario.');
      process.exit(0);
    }
    console.log('');
  }

  console.log(`[2/5] Abriendo base de datos SQLite...`);
  let sqliteDb;
  try {
    sqliteDb = new Database(sqlitePath, { readonly: true });
    console.log(`[✓] Base de datos SQLite abierta correctamente`);
  } catch (error) {
    console.error(`[ERROR] No se pudo abrir la base de datos SQLite:`, error.message);
    process.exit(1);
  }
  console.log('');

  console.log(`[3/5] Leyendo facturas de SQLite...`);
  let facturas;
  try {
    facturas = sqliteDb.prepare('SELECT * FROM facturas ORDER BY id').all();
    console.log(`[✓] Encontradas ${facturas.length} facturas en SQLite`);
  } catch (error) {
    console.error(`[ERROR] No se pudieron leer las facturas:`, error.message);
    sqliteDb.close();
    process.exit(1);
  }
  console.log('');

  if (facturas.length === 0) {
    console.log(`[INFO] No hay facturas para migrar.`);
    sqliteDb.close();
    crearMarcadorMigracion(sqlitePath);
    process.exit(0);
  }

  // Conectar a Neon
  console.log(`[4/5] Conectando a Neon PostgreSQL...`);
  const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });

  let client;
  try {
    client = await pool.connect();
    console.log(`[✓] Conectado a Neon PostgreSQL exitosamente`);
  } catch (error) {
    console.error(`[ERROR] No se pudo conectar a Neon PostgreSQL:`, error.message);
    sqliteDb.close();
    await pool.end();
    process.exit(1);
  }
  console.log('');

  try {
    console.log(`[4.1/5] Verificando tabla en Neon...`);
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
    console.log(`[✓] Tabla verificada/creada en Neon`);
    console.log('');

    const countResult = await client.query('SELECT COUNT(*) as count FROM facturas');
    const count = parseInt(countResult.rows[0].count);
    
    if (count > 0) {
      console.log(`[INFO] Ya existen ${count} facturas en Neon.`);
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const respuesta = await new Promise(resolve => {
        readline.question('¿Deseas agregar las facturas de SQLite de todos modos? (s/n): ', resolve);
      });
      readline.close();

      if (respuesta.toLowerCase() !== 's' && respuesta.toLowerCase() !== 'si') {
        console.log('[CANCELADO] Migración cancelada por el usuario.');
        client.release();
        await pool.end();
        sqliteDb.close();
        process.exit(0);
      }
      console.log('');
    }

    console.log(`[5/5] Migrando ${facturas.length} facturas a Neon...`);
    await client.query('BEGIN');

    let migradas = 0;
    let errores = 0;

    for (const factura of facturas) {
      try {
        await client.query(
          `INSERT INTO facturas (
            numero_factura, fecha_emision, nombre_cliente, ruc, 
            es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (numero_factura) DO NOTHING`,
          [
            factura.numero_factura,
            factura.fecha_emision || null,
            factura.nombre_cliente || null,
            factura.ruc || null,
            factura.es_persona_juridica === 1 || factura.es_persona_juridica === true,
            factura.cantidad || null,
            factura.descripcion || null,
            factura.costo_final || null,
            factura.es_anulada === 1 || factura.es_anulada === true,
            factura.created_at || null
          ]
        );
        migradas++;
        
        if (migradas % 10 === 0) {
          process.stdout.write(`\r     Migradas: ${migradas}/${facturas.length}...`);
        }
      } catch (error) {
        errores++;
        console.error(`\n[ERROR] Error al migrar factura ${factura.numero_factura}:`, error.message);
      }
    }

    console.log(`\r     Migradas: ${migradas}/${facturas.length}`);
    console.log('');

    await client.query('COMMIT');
    console.log(`[✓] Migración completada exitosamente`);
    console.log(`    - Facturas migradas: ${migradas}`);
    if (errores > 0) {
      console.log(`    - Errores: ${errores}`);
    }
    console.log('');

    if (esRutaPorDefecto) {
      crearMarcadorMigracion(sqlitePath);
    }

    client.release();
    await pool.end();
    sqliteDb.close();

    console.log('='.repeat(60));
    console.log('MIGRACIÓN COMPLETADA EXITOSAMENTE');
    console.log('='.repeat(60));
    console.log('');
    console.log(`Se migraron ${migradas} facturas de SQLite a Neon PostgreSQL.`);
    console.log(`La aplicación ahora usará Neon PostgreSQL para todas las operaciones.`);
    console.log('');
    console.log('[IMPORTANTE] Verifica en Neon PostgreSQL que los datos se migraron correctamente.');
    console.log('');

  } catch (error) {
    console.error(`[ERROR] Error durante la migración:`, error.message);
    console.error(error.stack);
    
    try {
      await client.query('ROLLBACK');
      console.log('[INFO] Transacción revertida');
    } catch (rollbackError) {
      console.error('[ERROR] Error al revertir transacción:', rollbackError.message);
    }
    
    client.release();
    await pool.end();
    sqliteDb.close();
    process.exit(1);
  }
}

migrarSQLiteANeon().catch(error => {
  console.error('[ERROR FATAL]', error);
  process.exit(1);
});

