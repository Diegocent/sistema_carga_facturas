import { RUCResponse } from '@/types/factura';

/**
 * Consulta información de una persona o empresa por RUC en Paraguay
 * Utiliza la API pública de TuRUC (https://turuc.com.py/api)
 * 
 * Documentación: https://docs.turuc.com.py
 */
export async function consultarRUC(ruc: string): Promise<RUCResponse> {
  try {
    // Limpiar el RUC pero mantener el formato con guión si lo tiene
    // El RUC puede venir como "80012345-5" o "800123455"
    const rucLimpio = ruc.trim();
    
    // Normalizar el RUC: remover solo espacios, mantener guiones
    const rucNormalizado = rucLimpio.replace(/\s/g, '');
    
    // Validar formato según documentación: 1-10 caracteres, patrón ^\d{1,8}(?:-\d)?$
    // Ejemplos válidos: "80012345-5", "5294124-8", "1234567"
    if (!rucNormalizado || rucNormalizado.length < 1 || rucNormalizado.length > 10 || !/^\d{1,8}(?:-\d)?$/.test(rucNormalizado)) {
      return {
        success: false,
        error: 'RUC inválido. Debe tener entre 1 y 10 caracteres, formato válido: 1-8 dígitos opcionalmente seguido de guión y un dígito verificador (ej: 80012345-5 o 5294124-8).'
      };
    }

    // Llamar a la API de TuRUC
    return await consultarTuRUC(rucNormalizado);
  } catch (error) {
    console.error('Error al consultar RUC:', error);
    return {
      success: false,
      error: 'Error al consultar el RUC. Por favor, ingrese el nombre manualmente.'
    };
  }
}

/**
 * Consulta usando TuRUC API (https://turuc.com.py/api)
 * Esta API es pública y no requiere autenticación
 *
 * Endpoint: GET /api/contribuyente/{ruc}
 * Documentación: https://docs.turuc.com.py
 */
async function consultarTuRUC(ruc: string): Promise<RUCResponse> {
  try {
    // Usar el endpoint por query según la documentación: GET /api/contribuyente?ruc={ruc}
    // IMPORTANTE: Usar la URL completa de turuc.com.py, no localhost
    const url = `https://turuc.com.py/api/contribuyente?ruc=${encodeURIComponent(ruc)}`;

    console.log('[RUC API] Iniciando consulta RUC:', { ruc, url });
    console.log('[RUC API] Timestamp:', new Date().toISOString());

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
      },
    });

    console.log('[RUC API] Response status:', response.status);
    console.log('[RUC API] Response headers:', Object.fromEntries(response.headers.entries()));

    // Si no se encuentra (404), el contribuyente no existe
    if (response.status === 404) {
      console.log('[RUC API] RUC no encontrado (404)');
      return {
        success: false,
        error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
      };
    }

    // Si hay otro error HTTP
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RUC API] Error HTTP ${response.status} al consultar RUC ${ruc}:`, errorText.substring(0, 500));
      
      // Errores específicos de Cloudflare
      if (response.status === 522 || response.status === 524) {
        return {
          success: false,
          error: 'El servidor de consulta de RUC no está respondiendo en este momento. Por favor, intente más tarde o ingrese el nombre manualmente.'
        };
      }
      
      if (response.status === 503 || response.status === 502) {
        return {
          success: false,
          error: 'El servicio de consulta de RUC no está disponible temporalmente. Por favor, intente más tarde o ingrese el nombre manualmente.'
        };
      }
      
      return {
        success: false,
        error: `Error al consultar el RUC (${response.status}). Por favor, intente más tarde o ingrese el nombre manualmente.`
      };
    }

    const result = await response.json();
    console.log('[RUC API] Response data:', JSON.stringify(result, null, 2));
    
    // La API retorna { data: {...}, message: "" }
    // Según documentación, data contiene: doc, razonSocial, dv, ruc, estado, etc.
    if (result.data) {
      const razonSocial = result.data.razonSocial;
      console.log('[RUC API] Razon social encontrada:', razonSocial);
      if (razonSocial) {
        const respuesta = {
          success: true,
          nombre: razonSocial,
          razon_social: razonSocial,
          ruc: result.data.ruc || ruc
        };
        console.log('[RUC API] Respuesta exitosa:', respuesta);
        return respuesta;
      }
    }

    // Si hay mensaje de error en la respuesta
    if (result.message) {
      console.log('[RUC API] Mensaje de error en respuesta:', result.message);
      return {
        success: false,
        error: result.message || 'No se encontró información para este RUC.'
      };
    }

    // Si no hay datos válidos
    console.warn('[RUC API] Respuesta de API sin datos válidos para RUC:', ruc, result);
    return {
      success: false,
      error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
    };
  } catch (error: any) {
    console.error('[RUC API] Error capturado:', error);
    console.error('[RUC API] Error message:', error.message);
    console.error('[RUC API] Error stack:', error.stack);
    
        // Manejar errores de red
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
          console.error('[RUC API] Error de conexión:', error.code, error.message);
          return {
            success: false,
            error: 'Error de conexión. Verifique su conexión a internet o ingrese el nombre manualmente.'
          };
        }

        const errorMsg = `Error al consultar el RUC: ${error.message || 'Error desconocido'}. Por favor, ingrese el nombre manualmente.`;
        console.error('[RUC API] Error final:', errorMsg);
        return {
          success: false,
          error: errorMsg
        };
  }
}

/**
 * Función auxiliar para validar formato de RUC paraguayo
 * Formato aceptado: 1-8 dígitos opcionalmente seguidos de guión y dígito verificador
 * Ejemplos válidos: "80012345-5", "1234567", "80012345"
 */
export function validarRUC(ruc: string): boolean {
  if (!ruc || !ruc.trim()) return false;
  const rucLimpio = ruc.trim().replace(/\s/g, '');
  // Patrón según documentación: ^\d{1,8}(?:-\d)?$
  return /^\d{1,8}(?:-\d)?$/.test(rucLimpio);
}

