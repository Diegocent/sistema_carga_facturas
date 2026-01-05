import { NextRequest, NextResponse } from 'next/server';
import { consultarRUC } from '@/lib/ruc-api';

// Forzar que esta ruta sea dinámica (no se ejecuta durante el build)
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// GET - Consultar información por RUC
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

// OPTIONS - Manejar preflight CORS
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

