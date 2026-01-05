/**
 * Cliente RUC para usar desde el frontend
 * Llama directamente al API de TuRUC sin pasar por las API routes de Next.js
 * Esto permite que funcione en builds estáticos (como Tauri production)
 */

import { RUCResponse } from '@/types/factura';
import { logInfo, logWarn, logError } from '@/lib/logger';

/**
 * Consulta información de RUC directamente desde el frontend
 */
export async function consultarRUCDirecto(ruc: string): Promise<RUCResponse> {
  try {
    const rucLimpio = ruc.trim();
    const rucNormalizado = rucLimpio.replace(/\s/g, '');

    // Validar formato según documentación: 1-10 caracteres, patrón ^\d{1,8}(?:-\d)?$
    if (!rucNormalizado || rucNormalizado.length < 1 || rucNormalizado.length > 10 || !/^\d{1,8}(?:-\d)?$/.test(rucNormalizado)) {
      logError('ruc', 'RUC inválido', { ruc: rucNormalizado });
      return {
        success: false,
        error: 'RUC inválido. Debe tener entre 1 y 10 caracteres, formato válido: 1-8 dígitos opcionalmente seguido de guión y un dígito verificador (ej: 80012345-5 o 5294124-8).'
      };
    }

    // Usar el endpoint por query según la documentación: GET /api/contribuyente?ruc={ruc}
    const url = `https://turuc.com.py/api/contribuyente?ruc=${encodeURIComponent(rucNormalizado)}`;
    logInfo('ruc', 'Consultando RUC directamente', { ruc: rucNormalizado, url });

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    logInfo('ruc', 'Response recibida', { status: response.status, ok: response.ok, contentType: response.headers.get('content-type') });

    // Verificar que la respuesta sea JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const responseText = await response.text();
      logError('ruc', 'Respuesta no es JSON', { contentType, responseText: responseText.substring(0, 200) });
      
      // Si recibimos HTML, probablemente es una página de error
      if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<!doctype')) {
        return {
          success: false,
          error: 'Error de conexión con el servicio. Por favor, intente más tarde o ingrese el nombre manualmente.'
        };
      }
      
      return {
        success: false,
        error: 'Error en la respuesta del servidor. Por favor, intente más tarde o ingrese el nombre manualmente.'
      };
    }

    if (response.status === 404) {
      logInfo('ruc', 'RUC no encontrado (404)');
      return {
        success: false,
        error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      logError('ruc', `Error HTTP ${response.status}`, { status: response.status, errorText });
      return {
        success: false,
        error: `Error al consultar el RUC (${response.status}). Por favor, intente más tarde o ingrese el nombre manualmente.`
      };
    }

    let result;
    try {
      result = await response.json();
    } catch (jsonError) {
      const responseText = await response.text();
      logError('ruc', 'Error al parsear JSON', { jsonError, responseText: responseText.substring(0, 200) });
      return {
        success: false,
        error: 'Error al procesar la respuesta del servidor. Por favor, intente más tarde o ingrese el nombre manualmente.'
      };
    }
    logInfo('ruc', 'Datos recibidos', { result });

    // Según la documentación, la respuesta tiene estructura: { data: {...}, message: "" }
    if (result.data) {
      const razonSocial = result.data.razonSocial;
      if (razonSocial) {
        const respuesta = {
          success: true,
          nombre: razonSocial,
          razon_social: razonSocial,
          ruc: result.data.ruc || rucNormalizado
        };
        logInfo('ruc', 'RUC consultado exitosamente', respuesta);
        return respuesta;
      }
      
      // Si hay data pero no razonSocial, puede ser un error
      logWarn('ruc', 'Respuesta con data pero sin razonSocial', { data: result.data });
    }

    if (result.message) {
      logInfo('ruc', 'Mensaje de error en respuesta', { message: result.message });
      return {
        success: false,
        error: result.message || 'No se encontró información para este RUC.'
      };
    }

    logWarn('ruc', 'Respuesta sin datos válidos', { result });
    return {
      success: false,
      error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
    };
  } catch (error: any) {
    logError('ruc', 'Error al consultar RUC', { error: error.message, stack: error.stack });
    
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return {
        success: false,
        error: 'Error de conexión. Verifique su conexión a internet o ingrese el nombre manualmente.'
      };
    }

    return {
      success: false,
      error: `Error al consultar el RUC: ${error.message || 'Error desconocido'}. Por favor, ingrese el nombre manualmente.`
    };
  }
}

