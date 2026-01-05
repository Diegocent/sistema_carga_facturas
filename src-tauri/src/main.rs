// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use rusqlite::{Connection, params};
use serde::{Deserialize, Serialize};
use app_dirs2::{AppDataType, app_root};
use tokio::runtime::Runtime;
use native_tls::TlsConnector;
use postgres_native_tls::MakeTlsConnector;
use std::sync::Mutex;

// URL de conexión a Neon PostgreSQL (solo para migración)
const DATABASE_URL: &str = "postgresql://neondb_owner:npg_Kt4oRPeVIE0a@ep-polished-hall-adp92fza-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require";

#[derive(Debug, Serialize, Deserialize)]
struct Factura {
    id: Option<i64>,
    numero_factura: String,
    fecha_emision: String,
    nombre_cliente: String,
    ruc: String,
    es_persona_juridica: bool,
    cantidad: String,
    descripcion: Option<String>,
    costo_final: Option<String>,
    es_anulada: bool,
    created_at: Option<String>,
}

// Runtime global para ejecutar código async (solo para migración a Neon)
lazy_static::lazy_static! {
    static ref RUNTIME: Runtime = Runtime::new().expect("Failed to create Tokio runtime");
    static ref LOG_BUFFER: Mutex<Vec<LogEntry>> = Mutex::new(Vec::new());
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct LogEntry {
    timestamp: String,
    level: String,
    message: String,
}

fn add_log(level: &str, message: &str) {
    let entry = LogEntry {
        timestamp: chrono::Utc::now().to_rfc3339(),
        level: level.to_string(),
        message: message.to_string(),
    };
    
    if let Ok(mut buffer) = LOG_BUFFER.lock() {
        buffer.push(entry);
        // Mantener solo los últimos 1000 logs
        if buffer.len() > 1000 {
            buffer.remove(0);
        }
    }
    
    // También imprimir a consola
    match level {
        "error" => eprintln!("[{}] {}", level.to_uppercase(), message),
        "warn" => eprintln!("[{}] {}", level.to_uppercase(), message),
        _ => println!("[{}] {}", level.to_uppercase(), message),
    }
}

// Obtener ruta de SQLite local
fn get_sqlite_path() -> Result<std::path::PathBuf, Box<dyn std::error::Error>> {
    let app_dir = app_root(AppDataType::UserData, &app_dirs2::AppInfo {
        name: "gestion-imprenta",
        author: "gestion-imprenta",
    })?;
    std::fs::create_dir_all(&app_dir)?;
    Ok(app_dir.join("facturas.db"))
}

// Obtener conexión a SQLite
fn get_connection() -> Result<Connection, Box<dyn std::error::Error>> {
    let db_path = get_sqlite_path()?;
    let conn = Connection::open(&db_path)?;
    
    // Crear tabla si no existe
    conn.execute(
        "CREATE TABLE IF NOT EXISTS facturas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            numero_factura TEXT NOT NULL UNIQUE,
            fecha_emision TEXT,
            nombre_cliente TEXT,
            ruc TEXT,
            es_persona_juridica INTEGER NOT NULL DEFAULT 1,
            cantidad TEXT,
            descripcion TEXT,
            costo_final TEXT,
            es_anulada INTEGER NOT NULL DEFAULT 0,
            created_at TEXT
        )",
        [],
    )?;
    
    Ok(conn)
}

// Helper para crear conexión a Neon (solo para migración)
fn connect_to_neon() -> Result<(tokio_postgres::Client, tokio::task::JoinHandle<()>), Box<dyn std::error::Error>> {
    let connector = TlsConnector::builder()
        .danger_accept_invalid_certs(true)
        .build()?;
    let tls = MakeTlsConnector::new(connector);
    
    let (client, connection) = RUNTIME.block_on(async {
        tokio_postgres::connect(DATABASE_URL, tls).await
    })?;
    
    let connection_handle = RUNTIME.spawn(async move {
        if let Err(e) = connection.await {
            eprintln!("[NEON ERROR] Error de conexión: {}", e);
        }
    });
    
    Ok((client, connection_handle))
}

// Crear tabla en Neon si no existe (solo para migración)
fn create_table_neon() -> Result<(), Box<dyn std::error::Error>> {
    let (client, _handle) = connect_to_neon()?;
    
    RUNTIME.block_on(async {
        client.execute(
            "CREATE TABLE IF NOT EXISTS facturas (
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
            )",
            &[],
        ).await?;
        Ok::<(), tokio_postgres::Error>(())
    })?;
    
    Ok(())
}

// Comando para obtener logs de Tauri
#[tauri::command]
fn get_tauri_logs() -> Result<Vec<LogEntry>, String> {
    if let Ok(buffer) = LOG_BUFFER.lock() {
        Ok(buffer.clone())
    } else {
        Err("Error al acceder al buffer de logs".to_string())
    }
}

// Comando para limpiar logs de Tauri
#[tauri::command]
fn clear_tauri_logs() -> Result<(), String> {
    if let Ok(mut buffer) = LOG_BUFFER.lock() {
        buffer.clear();
        Ok(())
    } else {
        Err("Error al limpiar logs".to_string())
    }
}

// Comando para migrar datos de SQLite a Neon
#[tauri::command]
fn migrar_a_neon() -> Result<String, String> {
    add_log("info", "Iniciando migración de SQLite a Neon PostgreSQL...");
    
    // Crear tabla en Neon
    if let Err(e) = create_table_neon() {
        add_log("error", &format!("Error al crear tabla en Neon: {}", e));
        return Err(format!("Error al crear tabla en Neon: {}", e));
    }
    
    // Abrir SQLite
    let sqlite_path = match get_sqlite_path() {
        Ok(path) => path,
        Err(e) => {
            add_log("error", &format!("Error al obtener ruta de SQLite: {}", e));
            return Err(format!("Error al obtener ruta de SQLite: {}", e));
        }
    };
    
    if !sqlite_path.exists() {
        add_log("error", "No se encontró la base de datos SQLite local");
        return Err("No se encontró la base de datos SQLite local".to_string());
    }
    
    add_log("info", &format!("Base de datos SQLite encontrada en: {:?}", sqlite_path));
    
    let sqlite_conn = match Connection::open(&sqlite_path) {
        Ok(conn) => conn,
        Err(e) => {
            add_log("error", &format!("Error al abrir SQLite: {}", e));
            return Err(format!("Error al abrir SQLite: {}", e));
        }
    };
    
    // Leer facturas de SQLite
    let mut stmt = match sqlite_conn.prepare("SELECT * FROM facturas ORDER BY id") {
        Ok(stmt) => stmt,
        Err(e) => return Err(format!("Error al preparar consulta SQLite: {}", e)),
    };
    
    let facturas_result: Result<Vec<_>, _> = stmt.query_map([], |row| {
        Ok((
            row.get::<_, Option<i64>>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, Option<String>>(2)?,
            row.get::<_, Option<String>>(3)?,
            row.get::<_, Option<String>>(4)?,
            row.get::<_, i32>(5)?,
            row.get::<_, Option<String>>(6)?,
            row.get::<_, Option<String>>(7)?,
            row.get::<_, Option<String>>(8)?,
            row.get::<_, i32>(9)?,
            row.get::<_, Option<String>>(10)?,
        ))
    }).map_err(|e| format!("Error al leer facturas de SQLite: {}", e))?.collect();
    
    let facturas = facturas_result.map_err(|e| {
        add_log("error", &format!("Error al procesar facturas: {}", e));
        format!("Error al procesar facturas: {}", e)
    })?;
    
    add_log("info", &format!("Encontradas {} facturas en SQLite", facturas.len()));
    
    if facturas.is_empty() {
        add_log("info", "No hay facturas para migrar");
        return Ok("No hay facturas para migrar".to_string());
    }
    
    // Conectar a Neon
    let (mut client, _handle) = match connect_to_neon() {
        Ok(client) => {
            add_log("info", "Conectado exitosamente a Neon PostgreSQL");
            client
        },
        Err(e) => {
            add_log("error", &format!("Error al conectar a Neon: {}", e));
            return Err(format!("Error al conectar a Neon: {}", e));
        }
    };
    
    // Verificar cuántas facturas ya existen en Neon
    let count_existente: i64 = RUNTIME.block_on(async {
        let row = client.query_one("SELECT COUNT(*) FROM facturas", &[]).await?;
        Ok::<i64, tokio_postgres::Error>(row.get(0))
    }).map_err(|e| {
        add_log("error", &format!("Error al verificar facturas existentes en Neon: {}", e));
        format!("Error al verificar facturas existentes en Neon: {}", e)
    })?;
    
    add_log("info", &format!("Ya existen {} facturas en Neon", count_existente));
    
    // Migrar facturas
    let resultado = RUNTIME.block_on(async {
        let trans = client.transaction().await?;
        let mut migradas = 0;
        let mut omitidas = 0;
        let mut errores = 0;
        
        for factura in facturas.iter() {
            let (_id, numero_factura, fecha_emision, nombre_cliente, ruc, es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at) = factura;
            
            // Debug: mostrar primera factura para verificar datos
            if migradas == 0 && omitidas == 0 {
                add_log("info", &format!("Primera factura: numero={}, fecha_emision={:?}, nombre={:?}, ruc={:?}, cantidad={:?}, created_at={:?}", 
                         numero_factura, fecha_emision, nombre_cliente, ruc, cantidad, created_at));
            }
            
            // Convertir Option<String> a Option<&str> para tokio-postgres
            let fecha_emision_ref: Option<&str> = fecha_emision.as_ref().map(|s| s.as_str());
            let nombre_cliente_ref: Option<&str> = nombre_cliente.as_ref().map(|s| s.as_str());
            let ruc_ref: Option<&str> = ruc.as_ref().map(|s| s.as_str());
            let cantidad_ref: Option<&str> = cantidad.as_ref().map(|s| s.as_str());
            let descripcion_ref: Option<&str> = descripcion.as_ref().map(|s| s.as_str());
            let costo_final_ref: Option<&str> = costo_final.as_ref().map(|s| s.as_str());
            
            // Para created_at, si es None o está vacío, usar NULL (PostgreSQL usará DEFAULT)
            // Si tiene valor, intentar parsearlo como TIMESTAMP o usar NULL
            let created_at_ref: Option<&str> = created_at.as_ref()
                .and_then(|s| if s.is_empty() { None } else { Some(s.as_str()) });
            
            // Verificar primero si ya existe en Neon
            let existe = match trans.query_opt(
                "SELECT numero_factura FROM facturas WHERE numero_factura = $1",
                &[numero_factura],
            ).await {
                Ok(opt) => opt.is_some(),
                Err(e) => {
                    add_log("error", &format!("Error al verificar existencia de factura {}: {}", numero_factura, e));
                    errores += 1;
                    continue;
                }
            };
            
            if existe {
                omitidas += 1;
                if (omitidas + migradas) % 10 == 0 {
                    println!("[MIGRACIÓN] Progreso: {}/{} procesadas ({} migradas, {} omitidas)...", 
                             omitidas + migradas, facturas.len(), migradas, omitidas);
                }
                continue;
            }
            
            // Insertar la factura (sin created_at, dejar que PostgreSQL use DEFAULT)
            // Si created_at tiene valor válido, lo incluimos
            let insert_result = if let Some(created_at_val) = created_at_ref {
                // Intentar insertar con created_at
                trans.execute(
                    "INSERT INTO facturas (numero_factura, fecha_emision, nombre_cliente, ruc, 
                     es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamp)",
                    &[
                        numero_factura,
                        &fecha_emision_ref,
                        &nombre_cliente_ref,
                        &ruc_ref,
                        &(*es_persona_juridica != 0),
                        &cantidad_ref,
                        &descripcion_ref,
                        &costo_final_ref,
                        &(*es_anulada != 0),
                        &created_at_val,
                    ],
                ).await
            } else {
                // Insertar sin created_at (usará DEFAULT)
                trans.execute(
                    "INSERT INTO facturas (numero_factura, fecha_emision, nombre_cliente, ruc, 
                     es_persona_juridica, cantidad, descripcion, costo_final, es_anulada)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                    &[
                        numero_factura,
                        &fecha_emision_ref,
                        &nombre_cliente_ref,
                        &ruc_ref,
                        &(*es_persona_juridica != 0),
                        &cantidad_ref,
                        &descripcion_ref,
                        &costo_final_ref,
                        &(*es_anulada != 0),
                    ],
                ).await
            };
            
            match insert_result {
                Ok(result) => {
                    if result > 0 {
                        migradas += 1;
                        if migradas % 10 == 0 || migradas == 1 {
                            add_log("info", &format!("Progreso: {} facturas migradas...", migradas));
                        }
                    } else {
                        add_log("warn", &format!("Factura {} no se insertó (result = 0)", numero_factura));
                        errores += 1;
                    }
                },
                Err(e) => {
                    add_log("error", &format!("Error al migrar factura {}: {:?}", numero_factura, e));
                    // Intentar sin created_at si falló
                    if created_at_ref.is_some() {
                        add_log("info", &format!("Reintentando factura {} sin created_at...", numero_factura));
                        match trans.execute(
                            "INSERT INTO facturas (numero_factura, fecha_emision, nombre_cliente, ruc, 
                             es_persona_juridica, cantidad, descripcion, costo_final, es_anulada)
                             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
                            &[
                                numero_factura,
                                &fecha_emision_ref,
                                &nombre_cliente_ref,
                                &ruc_ref,
                                &(*es_persona_juridica != 0),
                                &cantidad_ref,
                                &descripcion_ref,
                                &costo_final_ref,
                                &(*es_anulada != 0),
                            ],
                        ).await {
                            Ok(result) => {
                                if result > 0 {
                                    migradas += 1;
                                    add_log("info", &format!("Factura {} migrada exitosamente (sin created_at)", numero_factura));
                                } else {
                                    add_log("error", &format!("Factura {} aún falla (result = 0)", numero_factura));
                                    errores += 1;
                                }
                            },
                            Err(e2) => {
                                add_log("error", &format!("Error al reintentar factura {}: {:?}", numero_factura, e2));
                                errores += 1;
                            }
                        }
                    } else {
                        errores += 1;
                    }
                }
            }
        }
        
        add_log("info", &format!("Procesadas {} facturas: {} migradas, {} omitidas, {} errores", 
                 facturas.len(), migradas, omitidas, errores));
        
        trans.commit().await?;
        Ok::<(i32, i32, i32), tokio_postgres::Error>((migradas, omitidas, errores))
    });
    
    match resultado {
        Ok((migradas, omitidas, errores)) => {
            let mensaje = if errores > 0 {
                format!("Migración completada: {} facturas migradas, {} omitidas (ya existían), {} errores", migradas, omitidas, errores)
            } else {
                format!("Migración completada: {} facturas migradas, {} omitidas (ya existían)", migradas, omitidas)
            };
            add_log("info", &mensaje);
            Ok(mensaje)
        },
        Err(e) => {
            add_log("error", &format!("Error durante la migración: {}", e));
            Err(format!("Error durante la migración: {}", e))
        }
    }
}

// Obtener todas las facturas
#[tauri::command]
fn get_facturas() -> Result<Vec<Factura>, String> {
    let conn = get_connection().map_err(|e| format!("Error al conectar: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT id, numero_factura, fecha_emision, nombre_cliente, ruc, 
         es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at
         FROM facturas 
         ORDER BY 
         CASE 
           WHEN CAST(numero_factura AS INTEGER) IS NULL THEN 999999999
           ELSE CAST(numero_factura AS INTEGER)
         END DESC, 
         numero_factura DESC"
    ).map_err(|e| format!("Error al preparar consulta: {}", e))?;
    
    let facturas_iter = stmt.query_map([], |row| {
        Ok(Factura {
            id: row.get(0)?,
            numero_factura: row.get(1)?,
            fecha_emision: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
            nombre_cliente: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
            ruc: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
            es_persona_juridica: row.get::<_, i32>(5)? != 0,
            cantidad: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
            descripcion: row.get(7)?,
            costo_final: row.get(8)?,
            es_anulada: row.get::<_, i32>(9)? != 0,
            created_at: row.get(10)?,
        })
    }).map_err(|e| format!("Error al consultar facturas: {}", e))?;
    
    let mut facturas = Vec::new();
    for factura in facturas_iter {
        facturas.push(factura.map_err(|e| format!("Error al leer factura: {}", e))?);
    }
    
    Ok(facturas)
}

// Crear nueva factura
#[tauri::command]
fn create_factura(factura: Factura) -> Result<Factura, String> {
    let conn = get_connection().map_err(|e| format!("Error al conectar: {}", e))?;
    
    let es_anulada = factura.es_anulada || (factura.descripcion.is_none() && factura.costo_final.is_none());
    
    let fecha_emision_val: Option<String> = if es_anulada {
        None
    } else if factura.fecha_emision.is_empty() {
        None
    } else {
        Some(factura.fecha_emision)
    };
    
    let nombre_cliente_val = if es_anulada && factura.nombre_cliente.is_empty() {
        "ANULADA".to_string()
    } else {
        factura.nombre_cliente
    };
    
    let ruc_val = if es_anulada && factura.ruc.is_empty() {
        "00000000-0".to_string()
    } else {
        factura.ruc
    };
    
    let cantidad_val = if es_anulada {
        "".to_string()
    } else {
        factura.cantidad
    };
    
    // Verificar si ya existe
    let exists: i32 = conn.query_row(
        "SELECT COUNT(*) FROM facturas WHERE numero_factura = ?1",
        params![factura.numero_factura],
        |row| row.get(0)
    ).map_err(|e| format!("Error al verificar existencia: {}", e))?;
    
    if exists > 0 {
        return Err(format!("Ya existe una factura con este número: {}", factura.numero_factura));
    }
    
    // Insertar
    conn.execute(
        "INSERT INTO facturas (numero_factura, fecha_emision, nombre_cliente, ruc, 
         es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        params![
            factura.numero_factura,
            fecha_emision_val,
            nombre_cliente_val,
            ruc_val,
            if factura.es_persona_juridica { 1 } else { 0 },
            cantidad_val,
            factura.descripcion,
            factura.costo_final,
            if es_anulada { 1 } else { 0 },
            chrono::Utc::now().to_rfc3339(),
        ],
    ).map_err(|e| {
        if e.to_string().contains("UNIQUE constraint") {
            format!("Ya existe una factura con este número: {}", factura.numero_factura)
        } else {
            format!("Error al insertar factura: {}", e)
        }
    })?;
    
    let id = conn.last_insert_rowid();
    
    // Obtener factura creada
    let nueva_factura = conn.query_row(
        "SELECT id, numero_factura, fecha_emision, nombre_cliente, ruc, 
         es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at
         FROM facturas WHERE id = ?1",
        params![id],
        |row| {
            Ok(Factura {
                id: Some(row.get(0)?),
                numero_factura: row.get(1)?,
                fecha_emision: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                nombre_cliente: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                ruc: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                es_persona_juridica: row.get::<_, i32>(5)? != 0,
                cantidad: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                descripcion: row.get(7)?,
                costo_final: row.get(8)?,
                es_anulada: row.get::<_, i32>(9)? != 0,
                created_at: row.get(10)?,
            })
        },
    ).map_err(|e| format!("Error al obtener factura creada: {}", e))?;
    
    Ok(nueva_factura)
}

// Actualizar factura existente
#[tauri::command]
fn update_factura(id: i64, factura: Factura) -> Result<Factura, String> {
    let conn = get_connection().map_err(|e| format!("Error al conectar: {}", e))?;
    
    let es_anulada = factura.es_anulada;
    
    if es_anulada {
        conn.execute(
            "UPDATE facturas SET numero_factura = ?1, es_anulada = 1, fecha_emision = NULL, cantidad = '' WHERE id = ?2",
            params![factura.numero_factura, id],
        ).map_err(|e| format!("Error al actualizar factura: {}", e))?;
    } else {
        conn.execute(
            "UPDATE facturas SET 
             numero_factura = ?1, fecha_emision = ?2, nombre_cliente = ?3, ruc = ?4,
             es_persona_juridica = ?5, cantidad = ?6, descripcion = ?7, costo_final = ?8, es_anulada = 0
             WHERE id = ?9",
            params![
                factura.numero_factura,
                factura.fecha_emision,
                factura.nombre_cliente,
                factura.ruc,
                if factura.es_persona_juridica { 1 } else { 0 },
                factura.cantidad,
                factura.descripcion,
                factura.costo_final,
                id,
            ],
        ).map_err(|e| format!("Error al actualizar factura: {}", e))?;
    }
    
    let factura_actualizada = conn.query_row(
        "SELECT id, numero_factura, fecha_emision, nombre_cliente, ruc, 
         es_persona_juridica, cantidad, descripcion, costo_final, es_anulada, created_at
         FROM facturas WHERE id = ?1",
        params![id],
        |row| {
            Ok(Factura {
                id: Some(row.get(0)?),
                numero_factura: row.get(1)?,
                fecha_emision: row.get::<_, Option<String>>(2)?.unwrap_or_default(),
                nombre_cliente: row.get::<_, Option<String>>(3)?.unwrap_or_default(),
                ruc: row.get::<_, Option<String>>(4)?.unwrap_or_default(),
                es_persona_juridica: row.get::<_, i32>(5)? != 0,
                cantidad: row.get::<_, Option<String>>(6)?.unwrap_or_default(),
                descripcion: row.get(7)?,
                costo_final: row.get(8)?,
                es_anulada: row.get::<_, i32>(9)? != 0,
                created_at: row.get(10)?,
            })
        },
    ).map_err(|e| format!("Error al obtener factura actualizada: {}", e))?;
    
    Ok(factura_actualizada)
}

// Obtener siguiente número de factura
#[tauri::command]
fn get_siguiente_numero() -> Result<String, String> {
    let conn = get_connection().map_err(|e| format!("Error al conectar: {}", e))?;
    
    let mut stmt = conn.prepare(
        "SELECT numero_factura FROM facturas ORDER BY id DESC LIMIT 100"
    ).map_err(|e| format!("Error al preparar consulta: {}", e))?;
    
    let numero_iter = stmt.query_map([], |row| {
        Ok(row.get::<_, String>(0)?)
    }).map_err(|e| format!("Error al consultar números: {}", e))?;
    
    let mut max_numero = 0;
    for numero_str in numero_iter {
        let num_str = numero_str.map_err(|e| format!("Error al leer número: {}", e))?;
        if let Ok(num) = num_str.parse::<i32>() {
            if num > max_numero {
                max_numero = num;
            }
        } else {
            let num_str_clean: String = num_str.chars().take_while(|c| c.is_ascii_digit()).collect();
            if !num_str_clean.is_empty() {
                if let Ok(num) = num_str_clean.parse::<i32>() {
                    if num > max_numero {
                        max_numero = num;
                    }
                }
            }
        }
    }
    
    Ok((max_numero + 1).to_string())
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_facturas,
            create_factura,
            update_factura,
            get_siguiente_numero,
            migrar_a_neon,
            get_tauri_logs,
            clear_tauri_logs
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
