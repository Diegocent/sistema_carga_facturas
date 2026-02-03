import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Factura } from '@/types/factura';
import { logInfo, logError, logWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Actualiza una factura existente en la base de datos.
 * 
 * Maneja dos tipos de actualizaciones:
 * - Facturas normales: actualiza todos los campos (número, fecha, cliente, RUC, cantidad, descripción, costo)
 * - Facturas anuladas: solo actualiza el número de factura y marca como anulada, estableciendo fecha_emision en NULL
 * 
 * @param request - Request de Next.js que contiene el body con los datos de la factura a actualizar
 * @param params - Parámetros de la ruta que incluyen el ID de la factura
 * @returns NextResponse con el resultado de la operación:
 *   - 200: Factura actualizada exitosamente (incluye la factura actualizada)
 *   - 400: Error de validación (ID inválido, campos faltantes, número de factura duplicado)
 *   - 404: Factura no encontrada
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
 *   costo_final: 50000,
 *   es_anulada: false
 * }
 * 
 * Body para factura anulada:
 * {
 *   numero_factura: "001-001-0001234",
 *   es_anulada: true
 * }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

    logInfo('api', 'Solicitud para actualizar factura', { id });
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

    logInfo('api', 'Verificando si factura existe', { id });
    try {
      const facturaExistente = await db.prepare('SELECT id FROM facturas WHERE id = ?').get([id]);
      if (!facturaExistente) {
        logWarn('api', 'Factura no encontrada', { id });
        return NextResponse.json(
          { success: false, error: 'La factura no existe' },
          { status: 404 }
        );
      }
    } catch (dbError: any) {
      logError('database', 'Error al verificar existencia de factura', {
        error: dbError.message,
        code: dbError.code,
        id
      });
      throw dbError;
    }

    logInfo('api', 'Verificando si número de factura está en uso', { numero_factura, id });
    try {
      const facturaConMismoNumero = await db.prepare('SELECT id FROM facturas WHERE numero_factura = ? AND id != ?').get([numero_factura, id]);
      if (facturaConMismoNumero) {
        logWarn('api', 'Número de factura ya está en uso por otra factura', { numero_factura, id });
        return NextResponse.json(
          { success: false, error: 'Ya existe otra factura con este número' },
          { status: 400 }
        );
      }
    } catch (dbError: any) {
      logError('database', 'Error al verificar número de factura', {
        error: dbError.message,
        code: dbError.code,
        numero_factura,
        id
      });
      throw dbError;
    }

    logInfo('api', 'Actualizando factura en base de datos', { id, numero_factura, esAnulada });
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
      
      if (esAnulada) {
        const stmt = db.prepare(`
          UPDATE facturas 
          SET numero_factura = ?, es_anulada = ?, fecha_emision = ?, cantidad = ?
          WHERE id = ?
        `);
        await stmt.run([
          numero_factura,
          true,
          null,
          '',
          id
        ]);
      } else {
        const stmt = db.prepare(`
          UPDATE facturas 
          SET numero_factura = ?, fecha_emision = ?, nombre_cliente = ?, ruc = ?,
              es_persona_juridica = ?, cantidad = ?, descripcion = ?, costo_final = ?, es_anulada = ?
          WHERE id = ?
        `);
        await stmt.run([
          numero_factura,
          fechaEmisionValor,
          nombreClienteValor,
          rucValor,
          es_persona_juridica === true || es_persona_juridica === 1 || es_persona_juridica === 'true',
          cantidadValor,
          descripcion || null,
          costo_final || null,
          false,
          id
        ]);
      }

      logInfo('api', 'Factura actualizada exitosamente', { 
        id,
        numero_factura 
      });

      const facturaActualizada = await db.prepare('SELECT * FROM facturas WHERE id = ?').get([id]) as Factura;

      return NextResponse.json({ success: true, data: facturaActualizada });
    } catch (dbError: any) {
      logError('database', 'Error al actualizar factura en base de datos', {
        error: dbError.message,
        code: dbError.code,
        name: dbError.name,
        id,
        numero_factura
      });
      throw dbError;
    }
  } catch (error: any) {
    logError('api', 'Error al actualizar factura', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    console.error('Error al actualizar factura:', error);
    
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE' || error.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'Ya existe otra factura con este número' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Error al actualizar factura' },
      { status: 500 }
    );
  }
}

