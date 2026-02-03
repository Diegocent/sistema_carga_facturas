import { NextRequest, NextResponse } from 'next/server';
import { consultarRUC } from '@/lib/ruc-api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Consulta información de un contribuyente por RUC utilizando la API de TuRUC.
 * 
 * @param request - Request de Next.js que debe contener el parámetro `ruc` en la query string
 * @returns NextResponse con:
 *   - 200: Información del contribuyente encontrada { success: true, nombre: string, razon_social: string, ruc: string }
 *   - 400: RUC no proporcionado o inválido { success: false, error: string }
 *   - 500: Error al consultar el RUC { success: false, error: string }
 * 
 * @example
 * GET /api/ruc?ruc=80012345-5
 * // Retorna: { success: true, nombre: "Empresa S.A.", razon_social: "Empresa S.A.", ruc: "80012345-5" }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const ruc = searchParams.get('ruc');

    console.log('[API RUC Route] Request recibido:', { ruc, searchParams: Object.fromEntries(searchParams.entries()) });

    if (!ruc) {
      console.log('[API RUC Route] RUC no proporcionado');
      return NextResponse.json(
        { success: false, error: 'RUC es requerido' },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    console.log('[API RUC Route] Consultando RUC:', ruc);
    const resultado = await consultarRUC(ruc);
    console.log('[API RUC Route] Resultado:', resultado);

    return NextResponse.json(resultado, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  } catch (error: any) {
    console.error('[API RUC Route] Error capturado:', error);
    console.error('[API RUC Route] Error message:', error.message);
    console.error('[API RUC Route] Error stack:', error.stack);
    return NextResponse.json(
      { success: false, error: `Error al consultar RUC: ${error.message || 'Error desconocido'}` },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

/**
 * Maneja las solicitudes preflight CORS para permitir consultas desde el frontend.
 * 
 * @returns NextResponse con headers CORS apropiados y status 200
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

