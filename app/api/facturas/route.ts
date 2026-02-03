import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Factura } from '@/types/factura';
import { logInfo, logError, logWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Obtiene todas las facturas o calcula el siguiente número de factura disponible.
 * 
 * Si se proporciona el parámetro `siguiente=true` en la query string, calcula y retorna
 * el siguiente número de factura basándose en el número más alto encontrado en las últimas 100 facturas.
 * 
 * Si no se proporciona el parámetro, retorna todas las facturas ordenadas por número de factura
 * (numéricamente cuando es posible, descendente).
 * 
 * @param request - Request de Next.js que puede contener el parámetro `siguiente` en la query string
 * @returns NextResponse con:
 *   - Si `siguiente=true`: { success: true, siguiente_numero: string }
 *   - Si no: { success: true, data: Factura[] } con todas las facturas
 *   - En caso de error: { success: false, error: string } con status 500
 * 
 * @example
 * GET /api/facturas?siguiente=true
 * // Retorna: { success: true, siguiente_numero: "123" }
 * 
 * GET /api/facturas
 * // Retorna: { success: true, data: [...] }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const siguiente = searchParams.get('siguiente');
    
    if (siguiente === 'true') {
      logInfo('api', 'Solicitando siguiente número de factura');
      try {
        const facturas = await db.prepare('SELECT numero_factura FROM facturas ORDER BY id DESC LIMIT 100').all() as { numero_factura: string }[];
        logInfo('api', 'Facturas obtenidas para calcular siguiente número', { cantidad: facturas.length });
        
        let siguienteNumero = '1';
        if (facturas.length > 0) {
          let maxNumero = 0;
          for (const factura of facturas) {
            const numero = parseInt(factura.numero_factura);
            if (!isNaN(numero) && numero > maxNumero) {
              maxNumero = numero;
            } else {
              const match = factura.numero_factura.match(/(\d+)/);
              if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumero) {
                  maxNumero = num;
                }
              }
            }
          }
          siguienteNumero = (maxNumero + 1).toString();
        }
        
        logInfo('api', 'Siguiente número calculado', { siguienteNumero });
        return NextResponse.json({ success: true, siguiente_numero: siguienteNumero });
      } catch (dbError: any) {
        logError('database', 'Error al consultar base de datos para siguiente número', {
          error: dbError.message,
          code: dbError.code,
          name: dbError.name
        });
        throw dbError;
      }
    }
    
    logInfo('api', 'Solicitando todas las facturas');
    try {
      const facturasRaw = await db.prepare(`SELECT * FROM facturas ORDER BY 
        CASE 
          WHEN CAST(numero_factura AS INTEGER) IS NULL THEN 999999999
          ELSE CAST(numero_factura AS INTEGER)
        END DESC, 
        numero_factura DESC`).all() as any[];
      logInfo('api', 'Facturas obtenidas de base de datos', { cantidad: facturasRaw.length });
      
      const facturasFormateadas = facturasRaw.map(f => ({
        ...f,
        es_persona_juridica: f.es_persona_juridica === 1 || f.es_persona_juridica === true || f.es_persona_juridica,
        es_anulada: f.es_anulada === 1 || f.es_anulada === true || f.es_anulada || false
      })) as Factura[];
      
      logInfo('api', 'Facturas formateadas y listas para enviar', { cantidad: facturasFormateadas.length });
      return NextResponse.json({ success: true, data: facturasFormateadas });
    } catch (dbError: any) {
      logError('database', 'Error al consultar base de datos para obtener facturas', {
        error: dbError.message,
        code: dbError.code,
        name: dbError.name,
        stack: dbError.stack
      });
      throw dbError;
    }
  } catch (error: any) {
    logError('api', 'Error al obtener facturas', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    console.error('Error al obtener facturas:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener facturas' },
      { status: 500 }
    );
  }
}

/**
 * Crea una nueva factura en la base de datos.
 * 
 * Maneja dos tipos de facturas:
 * - Facturas normales: requiere todos los campos (número, fecha, cliente, RUC, cantidad, descripción, costo)
 * - Facturas anuladas: solo requiere el número de factura, establece fecha_emision en NULL
 * 
 * Valida que el número de factura no exista previamente y que los campos requeridos estén presentes.
 * 
 * @param request - Request de Next.js que contiene el body con los datos de la factura
 * @returns NextResponse con el resultado de la operación:
 *   - 201: Factura creada exitosamente (incluye la factura creada)
 *   - 400: Error de validación (campos faltantes, número de factura duplicado)
 *   - 500: Error interno del servidor
 * 
 * @example
 * Body para factura normal:
 * {
 *   numero_factura: "001-001-0001234",
 *   fecha_emision: "2024-01-15",
 *   nombre_cliente: "Juan Pérez",
 *   ruc: "12345678-9",
 *   es_persona_juridica: false,
 *   cantidad: "100 unidades",
 *   descripcion: "Impresión de folletos",
 *   costo_final: "50000",
 *   es_anulada: false
 * }
 * 
 * Body para factura anulada:
 * {
 *   numero_factura: "001-001-0001234",
 *   es_anulada: true
 * }
 */
export async function POST(request: NextRequest) {
  try {
    logInfo('api', 'Solicitud para crear nueva factura');
    const body = await request.json();
    const { numero_factura, fecha_emision, nombre_cliente, ruc, es_persona_juridica, cantidad, descripcion, costo_final, es_anulada } = body;

    const esAnulada = es_anulada === true || (!descripcion && !costo_final);
    
    if (!numero_factura || (!esAnulada && !fecha_emision) || (!esAnulada && !nombre_cliente) || (!esAnulada && !ruc) || (cantidad === undefined && !esAnulada) || es_persona_juridica === undefined) {
      logWarn('api', 'Validación fallida: campos básicos faltantes', { body });
      return NextResponse.json(
        { success: false, error: 'Los campos básicos son obligatorios' },
        { status: 400 }
      );
    }
    
    if (!esAnulada && (!descripcion || !costo_final)) {
      logWarn('api', 'Validación fallida: descripción o costo final faltantes para factura no anulada', { body });
      return NextResponse.json(
        { success: false, error: 'Para facturas no anuladas, descripción y costo final son obligatorios' },
        { status: 400 }
      );
    }

    logInfo('api', 'Verificando si número de factura existe', { numero_factura });
    try {
      const facturaExistente = await db.prepare('SELECT id FROM facturas WHERE numero_factura = ?').get([numero_factura]);
      if (facturaExistente) {
        logWarn('api', 'Número de factura ya existe', { numero_factura });
        return NextResponse.json(
          { success: false, error: 'Ya existe una factura con este número' },
          { status: 400 }
        );
      }
    } catch (dbError: any) {
      logError('database', 'Error al verificar existencia de factura', {
        error: dbError.message,
        code: dbError.code,
        numero_factura
      });
      throw dbError;
    }

    logInfo('api', 'Insertando nueva factura en base de datos', { numero_factura, esAnulada });
    try {
      let fechaEmisionValor: string | null;
      let nombreClienteValor: string;
      let rucValor: string;
      let cantidadValor: string;
      
      if (esAnulada) {
        fechaEmisionValor = null;
        nombreClienteValor = nombre_cliente || 'ANULADA';
        rucValor = ruc || '00000000-0';
        cantidadValor = cantidad || '';
      } else {
        if (!fecha_emision || fecha_emision.trim() === '') {
          const fechaActual = new Date().toISOString().split('T')[0];
          fechaEmisionValor = fechaActual;
        } else {
          fechaEmisionValor = fecha_emision;
        }
        nombreClienteValor = nombre_cliente;
        rucValor = ruc;
        cantidadValor = cantidad;
      }
      
      const stmt = db.prepare(`
        INSERT INTO facturas (numero_factura, fecha_emision, nombre_cliente, ruc, es_persona_juridica, cantidad, descripcion, costo_final, es_anulada)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING id
      `);

      const result = await stmt.run([
        numero_factura,
        fechaEmisionValor,
        nombreClienteValor,
        rucValor,
        es_persona_juridica,
        cantidadValor,
        descripcion || null,
        costo_final || null,
        esAnulada
      ]);

      const insertId = result.lastInsertRowid;

      logInfo('api', 'Factura insertada exitosamente', { 
        id: insertId,
        numero_factura 
      });

      const nuevaFactura = await db.prepare('SELECT * FROM facturas WHERE id = ?').get([insertId]) as Factura;

      return NextResponse.json({ success: true, data: nuevaFactura }, { status: 201 });
    } catch (dbError: any) {
      logError('database', 'Error al insertar factura en base de datos', {
        error: dbError.message,
        code: dbError.code,
        name: dbError.name,
        numero_factura
      });
      throw dbError;
    }
  } catch (error: any) {
    logError('api', 'Error al crear factura', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error('Error al crear factura:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Ya existe una factura con este número' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al crear factura' },
      { status: 500 }
    );
  }
}

