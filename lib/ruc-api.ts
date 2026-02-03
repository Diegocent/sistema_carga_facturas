import { RUCResponse } from '@/types/factura';

/**
 * Consulta información de un contribuyente por RUC en Paraguay.
 * Utiliza la API pública de TuRUC (https://turuc.com.py/api).
 * 
 * @param ruc - Número de RUC a consultar (puede incluir guión, ej: "80012345-5" o "800123455")
 * @returns Promise con la respuesta de la consulta:
 *   - Si es exitosa: { success: true, nombre: string, razon_social: string, ruc: string }
 *   - Si falla: { success: false, error: string }
 * 
 * @example
 * const resultado = await consultarRUC("80012345-5");
 * if (resultado.success) {
 *   console.log(resultado.nombre); // "Empresa S.A."
 * }
 */
export async function consultarRUC(ruc: string): Promise<RUCResponse> {
  try {
    const rucLimpio = ruc.trim();
    const rucNormalizado = rucLimpio.replace(/\s/g, '');
    
    if (!rucNormalizado || rucNormalizado.length < 1 || rucNormalizado.length > 10 || !/^\d{1,8}(?:-\d)?$/.test(rucNormalizado)) {
      return {
        success: false,
        error: 'RUC inválido. Debe tener entre 1 y 10 caracteres, formato válido: 1-8 dígitos opcionalmente seguido de guión y un dígito verificador (ej: 80012345-5 o 5294124-8).'
      };
    }

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
 * Consulta información de RUC usando la API de TuRUC.
 * Esta API es pública y no requiere autenticación.
 * 
 * Endpoint: GET /api/contribuyente?ruc={ruc}
 * Documentación: https://docs.turuc.com.py
 * 
 * @param ruc - RUC normalizado (sin espacios, puede tener guión)
 * @returns Promise con la respuesta de la API
 */
async function consultarTuRUC(ruc: string): Promise<RUCResponse> {
  try {
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

    if (response.status === 404) {
      console.log('[RUC API] RUC no encontrado (404)');
      return {
        success: false,
        error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
      };
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[RUC API] Error HTTP ${response.status} al consultar RUC ${ruc}:`, errorText.substring(0, 500));
      
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

    if (result.message) {
      console.log('[RUC API] Mensaje de error en respuesta:', result.message);
      return {
        success: false,
        error: result.message || 'No se encontró información para este RUC.'
      };
    }

    console.warn('[RUC API] Respuesta de API sin datos válidos para RUC:', ruc, result);
    return {
      success: false,
      error: 'No se encontró información para este RUC. Verifique el número o ingrese el nombre manualmente.'
    };
  } catch (error: any) {
    console.error('[RUC API] Error capturado:', error);
    console.error('[RUC API] Error message:', error.message);
    console.error('[RUC API] Error stack:', error.stack);
    
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
 * Valida el formato de un RUC paraguayo.
 * 
 * Formato aceptado: 1-8 dígitos opcionalmente seguidos de guión y dígito verificador.
 * 
 * @param ruc - RUC a validar
 * @returns true si el formato es válido, false en caso contrario
 * 
 * @example
 * validarRUC("80012345-5") // true
 * validarRUC("1234567") // true
 * validarRUC("abc") // false
 */
export function validarRUC(ruc: string): boolean {
  if (!ruc || !ruc.trim()) return false;
  const rucLimpio = ruc.trim().replace(/\s/g, '');
  // Patrón según documentación: ^\d{1,8}(?:-\d)?$
  return /^\d{1,8}(?:-\d)?$/.test(rucLimpio);
}

