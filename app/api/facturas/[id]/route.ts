import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { Factura } from '@/types/factura';
import { logInfo, logError, logWarn } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// PUT - Actualizar factura existente
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

    logInfo('api', 'Solicitud para actualizar factura', { id });
    const body = await request.json();
    const { numero_factura, fecha_emision, nombre_cliente, ruc, es_persona_juridica, cantidad, descripcion, costo_final, es_anulada } = body;

    // Si es factura anulada, descripcion y costo_final son opcionales
    const esAnulada = es_anulada === true || (!descripcion && !costo_final);
    
    // Validaciones básicas - fecha_emision no es requerida para facturas anuladas
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

    // Verificar que la factura existe
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

    // Verificar que el número de factura no esté en uso por otra factura
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

    // Actualizar factura
    logInfo('api', 'Actualizando factura en base de datos', { id, numero_factura, esAnulada });
    try {
      // Para facturas anuladas, NO guardar fecha (NULL), usar valores por defecto para otros campos
      // Para facturas no anuladas, usar fecha actual si está vacía
      let fechaEmisionValor: string | null;
      let nombreClienteValor: string;
      let rucValor: string;
      let cantidadValor: string;
      
      if (esAnulada) {
        // Facturas anuladas: NO guardar fecha (NULL), usar valores por defecto
        fechaEmisionValor = null;
        nombreClienteValor = nombre_cliente || 'ANULADA';
        rucValor = ruc || '00000000-0';
        cantidadValor = cantidad || '';
      } else {
        // Para facturas no anuladas, usar fecha actual si está vacía
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
        // Solo actualizar número de factura y marca como anulada, NO guardar fecha (NULL), cantidad vacío
        const stmt = db.prepare(`
          UPDATE facturas 
          SET numero_factura = ?, es_anulada = 1, fecha_emision = NULL, cantidad = ''
          WHERE id = ?
        `);
        await stmt.run([numero_factura, id]);
      } else {
        // Actualizar todos los campos para facturas no anuladas
        const stmt = db.prepare(`
          UPDATE facturas 
          SET numero_factura = ?, fecha_emision = ?, nombre_cliente = ?, ruc = ?,
              es_persona_juridica = ?, cantidad = ?, descripcion = ?, costo_final = ?, es_anulada = 0
          WHERE id = ?
        `);
        await stmt.run([
          numero_factura,
          fechaEmisionValor,
          nombreClienteValor,
          rucValor,
          es_persona_juridica,
          cantidadValor,
          descripcion || null,
          costo_final || null,
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

