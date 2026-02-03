import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType } from 'docx';
import db from '@/lib/db';
import { Factura } from '@/types/factura';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Parsea precios desde un string que puede contener múltiples precios separados por salto de línea.
 * Acepta formato con punto como separador de miles (ej: 8.000, 10.000) y coma como separador decimal.
 * 
 * @param preciosString - String con precios separados por salto de línea
 * @returns Array de números parseados, filtrando valores inválidos o cero
 */
function parsearPrecios(preciosString: string): number[] {
  if (!preciosString || !preciosString.trim()) return [];
  return preciosString
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      // Remover espacios y caracteres no numéricos excepto punto y coma
      let cleaned = line.replace(/\s/g, '').replace(/[^\d.,]/g, '');
      
      // Si tiene coma, asumimos formato decimal (ej: 8000,50)
      if (cleaned.includes(',')) {
        cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      } else {
        // Si solo tiene puntos, pueden ser separadores de miles (ej: 8.000)
        const lastDotIndex = cleaned.lastIndexOf('.');
        if (lastDotIndex > 0 && cleaned.length - lastDotIndex === 4) {
          // Es separador de miles, removemos todos los puntos
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      return parseFloat(cleaned) || 0;
    })
    .filter(precio => precio > 0);
}

/**
 * Formatea precios para mostrar en el documento Word.
 * Convierte números a formato con punto como separador de miles y prefijo "Gs.".
 * 
 * @param preciosString - String con precios separados por salto de línea
 * @returns String formateado con precios separados por salto de línea, o "-" si no hay precios válidos
 */
function formatearPrecios(preciosString: string): string {
  if (!preciosString || !preciosString.trim()) return '-';
  const precios = parsearPrecios(preciosString);
  if (precios.length === 0) return '-';
  return precios
    .map(precio => {
      // Formatear con punto como separador de miles
      const numero = Math.round(precio).toString();
      const formateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      return `Gs. ${formateado}`;
    })
    .join('\n');
}

/**
 * Suma todos los precios de una factura.
 * 
 * @param preciosString - String con precios separados por salto de línea
 * @returns Suma total de todos los precios válidos
 */
function sumarPreciosFactura(preciosString: string): number {
  return parsearPrecios(preciosString).reduce((sum, precio) => sum + precio, 0);
}

/**
 * Genera un documento Word (.docx) con todas las facturas registradas en la base de datos.
 * 
 * El documento incluye:
 * - Título "Registro de Facturas"
 * - Total de facturas
 * - Tabla con todas las facturas (número, fecha, cliente, RUC, tipo, cantidad, descripción, costo)
 * - Fila de total con la suma de todos los costos (excluyendo facturas anuladas)
 * 
 * Las facturas anuladas se muestran con "ANULADA" en los campos de descripción y costo.
 * 
 * @returns NextResponse con:
 *   - 200: Documento Word generado exitosamente (Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document)
 *   - 400: No hay facturas para generar el documento
 *   - 500: Error al generar el documento
 */
export async function GET() {
  try {
    const facturasRaw = await db.prepare(`
      SELECT * FROM facturas 
      ORDER BY 
        CASE WHEN fecha_emision IS NULL THEN 0 ELSE 1 END DESC,
        fecha_emision DESC, 
        created_at DESC
    `).all() as any[];
    const facturas = facturasRaw.map(f => ({
      ...f,
      es_persona_juridica: f.es_persona_juridica === 1 || f.es_persona_juridica === true || f.es_persona_juridica,
      es_anulada: f.es_anulada === 1 || f.es_anulada === true || f.es_anulada || false
    })) as Factura[];

    if (facturas.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No hay facturas para generar el documento' },
        { status: 400 }
      );
    }

    const tableRows: TableRow[] = [
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Número Factura', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Fecha Emisión', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 12, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Cliente', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'RUC', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Tipo', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 10, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Cantidad', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 8, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Descripción', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'Costo Final', bold: true })],
              alignment: AlignmentType.CENTER,
            })],
            width: { size: 11, type: WidthType.PERCENTAGE },
            shading: { fill: 'D9D9D9' },
          }),
        ],
      }),
    ];

    facturas.forEach((factura) => {
      tableRows.push(
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph(factura.numero_factura)],
            }),
            new TableCell({
              children: [new Paragraph((() => {
                if (factura.es_anulada || !factura.fecha_emision || factura.fecha_emision.trim() === '') {
                  return '-';
                }
                const [year, month, day] = factura.fecha_emision.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                return date.toLocaleDateString('es-PY');
              })())],
            }),
            new TableCell({
              children: [new Paragraph(factura.nombre_cliente)],
            }),
            new TableCell({
              children: [new Paragraph(factura.ruc)],
            }),
            new TableCell({
              children: [new Paragraph(factura.es_persona_juridica ? 'Jurídica' : 'Física')],
            }),
            new TableCell({
              children: [new Paragraph(factura.cantidad.toString())],
            }),
            new TableCell({
              children: [new Paragraph(
                factura.es_anulada ? 'ANULADA' : (factura.descripcion || '-')
              )],
            }),
            new TableCell({
              children: [new Paragraph(
                factura.es_anulada ? 'ANULADA' : formatearPrecios(factura.costo_final || '')
              )],
            }),
          ],
        })
      );
    });

    const total = facturas
      .filter(f => !f.es_anulada)
      .reduce((sum, factura) => sum + sumarPreciosFactura(factura.costo_final || ''), 0);
    tableRows.push(
      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: 'TOTAL', bold: true })],
              alignment: AlignmentType.RIGHT,
            })],
            columnSpan: 7,
            shading: { fill: 'E7E6E6' },
          }),
          new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ text: new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(total), bold: true })],
              alignment: AlignmentType.RIGHT,
            })],
            shading: { fill: 'E7E6E6' },
          }),
        ],
      })
    );

    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [new TextRun({ text: 'Registro de Facturas', bold: true, size: 32 })],
              alignment: AlignmentType.CENTER,
              spacing: { after: 400 },
            }),
            new Paragraph({
              children: [new TextRun({ text: `Total de facturas: ${facturas.length}`, size: 24 })],
              spacing: { after: 200 },
            }),
            new Table({
              rows: tableRows,
              width: { size: 100, type: WidthType.PERCENTAGE },
            }),
          ],
        },
      ],
    });

    const buffer = await Packer.toBuffer(doc);

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="facturas_${new Date().toISOString().split('T')[0]}.docx"`,
      },
    });
  } catch (error) {
    console.error('Error al generar documento Word:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar documento Word' },
      { status: 500 }
    );
  }
}

