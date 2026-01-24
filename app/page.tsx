'use client';

import { useState, useEffect, useCallback } from 'react';
import { Factura } from '@/types/factura';
import { logInfo, logError, logWarn } from '@/lib/logger';

// Función auxiliar para parsear precios desde string (separados por salto de línea)
// Acepta formato con punto como separador de miles: 8.000, 10.000, etc.
const parsearPrecios = (preciosString: string): number[] => {
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
        // Contamos los puntos: si el último punto está seguido de 3 dígitos, es separador de miles
        const lastDotIndex = cleaned.lastIndexOf('.');
        if (lastDotIndex > 0 && cleaned.length - lastDotIndex === 4) {
          // Es separador de miles, removemos todos los puntos
          cleaned = cleaned.replace(/\./g, '');
        }
      }
      
      return parseFloat(cleaned) || 0;
    })
    .filter(precio => precio > 0);
};

// Función auxiliar para formatear precios para mostrar
// Muestra con punto como separador de miles
const formatearPrecios = (preciosString: string): string => {
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
};

// Función auxiliar para sumar todos los precios de una factura
const sumarPreciosFactura = (preciosString: string): number => {
  return parsearPrecios(preciosString).reduce((sum, precio) => sum + precio, 0);
};


export default function Home() {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchingRUC, setSearchingRUC] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [logFilter, setLogFilter] = useState<{ category?: 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system'; level?: 'error' | 'warn' | 'info' }>({});
  
  const [formData, setFormData] = useState({
    numero_factura: '',
    fecha_emision: new Date().toISOString().split('T')[0],
    nombre_cliente: '',
    ruc: '',
    es_persona_juridica: true,
    cantidad: '',
    descripcion: '',
    costo_final: '',
    es_anulada: false,
  });

  // Detectar si estamos en Tauri
  const isTauri = typeof window !== 'undefined' && (window as any).__TAURI__ !== undefined;

  const cargarSiguienteNumero = useCallback(async () => {
    try {
      logInfo('frontend', 'Iniciando carga de siguiente número de factura', { isTauri });
      let siguienteNumero = '1';
      
      if (isTauri) {
        // Usar comando de Tauri
        const { invoke } = await import('@tauri-apps/api/tauri');
        logInfo('frontend', 'Llamando comando Tauri: get_siguiente_numero');
        try {
          siguienteNumero = await invoke('get_siguiente_numero');
          logInfo('frontend', 'Siguiente número obtenido desde Tauri', { siguienteNumero });
          setFormData(prev => ({ ...prev, numero_factura: siguienteNumero }));
        } catch (tauriError: any) {
          logError('tauri', 'Error en comando Tauri get_siguiente_numero', {
            error: tauriError,
            message: tauriError?.message || String(tauriError)
          });
          throw tauriError;
        }
      } else {
        // Usar API route
        logInfo('frontend', 'Consultando API route: /api/facturas?siguiente=true');
        const response = await fetch('/api/facturas?siguiente=true');
        logInfo('frontend', 'Respuesta recibida de API', { 
          status: response.status, 
          ok: response.ok,
          contentType: response.headers.get('content-type')
        });
        const data = await response.json();
        
        if (data.success && data.siguiente_numero) {
          logInfo('frontend', 'Siguiente número obtenido desde API', { siguienteNumero: data.siguiente_numero });
          setFormData(prev => ({ ...prev, numero_factura: data.siguiente_numero }));
        } else {
          logWarn('frontend', 'API no devolvió siguiente número válido', { data });
        }
      }
    } catch (error: any) {
      logError('frontend', 'Error al cargar siguiente número de factura', { 
        error: error.message, 
        stack: error.stack,
        isTauri 
      });
      console.error('Error al cargar siguiente número:', error);
    }
  }, [isTauri]);

  const cargarFacturas = useCallback(async () => {
    try {
      logInfo('frontend', 'Iniciando carga de facturas', { isTauri });
      setLoading(true);
      
      if (isTauri) {
        // Usar comando de Tauri
        const { invoke } = await import('@tauri-apps/api/tauri');
        logInfo('frontend', 'Llamando comando Tauri: get_facturas');
        const startTime = Date.now();
        try {
          const facturasData: Factura[] = await invoke('get_facturas');
          const duration = Date.now() - startTime;
          logInfo('frontend', 'Facturas cargadas desde Tauri', { 
            cantidad: facturasData.length,
            duracion_ms: duration
          });
          setFacturas(facturasData);
        } catch (tauriError: any) {
          const errorMessage = tauriError?.message || tauriError?.toString() || String(tauriError);
          logError('tauri', 'Error en comando Tauri get_facturas', {
            error: tauriError,
            message: errorMessage,
            duracion_ms: Date.now() - startTime,
            errorType: typeof tauriError,
            errorKeys: Object.keys(tauriError || {})
          });
          setMessage({ 
            type: 'error', 
            text: `Error al cargar facturas: ${errorMessage}. Revisa los logs para más detalles.` 
          });
          // No lanzar el error, solo mostrar el mensaje
          return;
        }
      } else {
        // Usar API route
        logInfo('frontend', 'Consultando API route: /api/facturas');
        const startTime = Date.now();
        const response = await fetch('/api/facturas');
        const duration = Date.now() - startTime;
        logInfo('frontend', 'Respuesta recibida de API', { 
          status: response.status, 
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          duracion_ms: duration
        });
        const data = await response.json();
        
        if (data.success) {
          logInfo('frontend', 'Facturas cargadas desde API', { 
            cantidad: data.data?.length || 0 
          });
          setFacturas(data.data);
        } else {
          logError('frontend', 'Error en respuesta de API al cargar facturas', { 
            error: data.error,
            data 
          });
          setMessage({ type: 'error', text: 'Error al cargar facturas' });
        }
      }
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Error desconocido';
      logError('frontend', 'Error al cargar facturas', { 
        error: errorMessage, 
        stack: error.stack,
        isTauri,
        errorName: error.name,
        errorCode: error.code,
        fullError: error
      });
      console.error('Error al cargar facturas:', error);
      setMessage({ 
        type: 'error', 
        text: `Error al cargar facturas: ${errorMessage}. Revisa los logs para más detalles.` 
      });
    } finally {
      setLoading(false);
    }
  }, [isTauri]);

  // Cargar facturas y siguiente número al montar el componente
  useEffect(() => {
    cargarFacturas();
    cargarSiguienteNumero();
  }, [cargarFacturas, cargarSiguienteNumero]);

  const consultarRUC = async () => {
    if (!formData.ruc || formData.ruc.trim().length < 5) {
      setMessage({ type: 'error', text: 'Por favor ingrese un RUC válido (mínimo 5 dígitos)' });
      return;
    }

    try {
      setSearchingRUC(true);
      setMessage(null);
      
      const rucLimpio = formData.ruc.trim();
      
      // Siempre usar consulta directa al API de TuRUC según documentación
      const { consultarRUCDirecto } = await import('@/lib/ruc-client');
      const data = await consultarRUCDirecto(rucLimpio);

      if (data.success && data.nombre) {
        setFormData(prev => ({ ...prev, nombre_cliente: data.nombre || data.razon_social || '' }));
        setMessage({ type: 'success', text: 'RUC consultado correctamente' });
      } else {
        const errorMsg = data.error || 'No se pudo encontrar información para este RUC. Puede ingresar el nombre manualmente.';
        setMessage({ type: 'info', text: errorMsg });
      }
    } catch (error: any) {
      console.error('[Frontend] Error al consultar RUC:', error);
      setMessage({ type: 'error', text: `Error al consultar RUC: ${error.message || 'Error desconocido'}. Puede ingresar el nombre manualmente.` });
    } finally {
      setSearchingRUC(false);
    }
  };

  const handleEdit = (factura: Factura) => {
    setEditingId(factura.id || null);
    setFormData({
      numero_factura: factura.numero_factura,
      fecha_emision: factura.fecha_emision || new Date().toISOString().split('T')[0],
      nombre_cliente: factura.nombre_cliente || '',
      ruc: factura.ruc || '',
      es_persona_juridica: factura.es_persona_juridica,
      cantidad: factura.cantidad ? factura.cantidad.toString() : '',
      descripcion: factura.descripcion || '',
      costo_final: factura.costo_final || '',
      es_anulada: factura.es_anulada || false,
    });
    // Scroll al formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    cargarSiguienteNumero();
    setFormData({
      numero_factura: '',
      fecha_emision: new Date().toISOString().split('T')[0],
      nombre_cliente: '',
      ruc: '',
      es_persona_juridica: true,
      cantidad: '',
      descripcion: '',
      costo_final: '',
      es_anulada: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      // Si es anulada, solo validar número de factura
      if (formData.es_anulada) {
        if (!formData.numero_factura.trim()) {
          setMessage({ type: 'error', text: 'El número de factura es obligatorio' });
          setSubmitting(false);
          return;
        }
      } else {
        // Validaciones para facturas no anuladas
        if (!formData.numero_factura.trim() || !formData.fecha_emision || !formData.nombre_cliente.trim() || !formData.ruc.trim()) {
          setMessage({ type: 'error', text: 'Los campos básicos son obligatorios para facturas no anuladas' });
          setSubmitting(false);
          return;
        }
        if (!formData.descripcion.trim() || !formData.costo_final.trim()) {
          setMessage({ type: 'error', text: 'Descripción y costo final son obligatorios para facturas no anuladas' });
          setSubmitting(false);
          return;
        }
      }

      const facturaData = {
        numero_factura: formData.numero_factura.trim(),
        fecha_emision: formData.es_anulada ? '' : formData.fecha_emision,
        nombre_cliente: formData.es_anulada ? '' : formData.nombre_cliente.trim(),
        ruc: formData.es_anulada ? '' : formData.ruc.trim(),
        es_persona_juridica: formData.es_persona_juridica,
        cantidad: formData.es_anulada ? '' : formData.cantidad.trim(),
        descripcion: formData.es_anulada ? null : (formData.descripcion.trim() || null),
        costo_final: formData.es_anulada ? null : (formData.costo_final.trim() || null),
        es_anulada: formData.es_anulada,
      };

      if (editingId !== null) {
        // Actualizar factura existente
        if (isTauri) {
          try {
            const { invoke } = await import('@tauri-apps/api/tauri');
            await invoke('update_factura', { id: editingId, factura: facturaData });
            setMessage({ type: 'success', text: 'Factura actualizada exitosamente' });
            setEditingId(null);
            handleCancelEdit();
            cargarFacturas();
          } catch (error: any) {
            setMessage({ type: 'error', text: error || 'Error al actualizar factura' });
          }
        } else {
          // Usar API REST para actualizar factura en versión web
          try {
            const response = await fetch(`/api/facturas/${editingId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(facturaData),
            });

            const result = await response.json();

            if (result.success) {
              setMessage({ type: 'success', text: 'Factura actualizada exitosamente' });
              setEditingId(null);
              handleCancelEdit();
              cargarFacturas();
            } else {
              setMessage({ type: 'error', text: result.error || 'Error al actualizar factura' });
            }
          } catch (error: any) {
            setMessage({ type: 'error', text: error.message || 'Error al actualizar factura' });
          }
        }
      } else {
        // Crear nueva factura
        if (isTauri) {
          try {
            const { invoke } = await import('@tauri-apps/api/tauri');
            await invoke('create_factura', { factura: facturaData });
            setMessage({ type: 'success', text: 'Factura creada exitosamente' });
            
            // Cargar el siguiente número de factura
            const siguienteNumero = await invoke('get_siguiente_numero') as string;
            
            setFormData({
              numero_factura: siguienteNumero,
              fecha_emision: new Date().toISOString().split('T')[0],
              nombre_cliente: '',
              ruc: '',
              es_persona_juridica: true,
              cantidad: '',
              descripcion: '',
              costo_final: '',
              es_anulada: false,
            });
            cargarFacturas();
          } catch (error: any) {
            setMessage({ type: 'error', text: error || 'Error al crear factura' });
          }
        } else {
          // Usar API route
          const response = await fetch('/api/facturas', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(facturaData),
          });

          const data = await response.json();

          if (data.success) {
            setMessage({ type: 'success', text: 'Factura creada exitosamente' });
            // Cargar el siguiente número de factura
            const siguienteResponse = await fetch('/api/facturas?siguiente=true');
            const siguienteData = await siguienteResponse.json();
            const siguienteNumero = siguienteData.success ? siguienteData.siguiente_numero : '';
            
            setFormData({
              numero_factura: siguienteNumero,
              fecha_emision: new Date().toISOString().split('T')[0],
              nombre_cliente: '',
              ruc: '',
              es_persona_juridica: true,
              cantidad: '',
              descripcion: '',
              costo_final: '',
              es_anulada: false,
            });
            cargarFacturas();
          } else {
            setMessage({ type: 'error', text: data.error || 'Error al crear factura' });
          }
        }
      }
    } catch (error) {
      console.error('Error al guardar factura:', error);
      setMessage({ type: 'error', text: 'Error al guardar factura' });
    } finally {
      setSubmitting(false);
    }
  };

  const generarWord = async () => {
    try {
      if (facturas.length === 0) {
        setMessage({ type: 'error', text: 'No hay facturas para generar el documento' });
        return;
      }

      console.log('[GenerarWord] Iniciando generación de Word con', facturas.length, 'facturas');
      
      // Importar librería docx dinámicamente
      let Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, AlignmentType;
      
      try {
        const docxModule = await import('docx');
        Document = docxModule.Document;
        Packer = docxModule.Packer;
        Paragraph = docxModule.Paragraph;
        Table = docxModule.Table;
        TableCell = docxModule.TableCell;
        TableRow = docxModule.TableRow;
        WidthType = docxModule.WidthType;
        TextRun = docxModule.TextRun;
        AlignmentType = docxModule.AlignmentType;
        console.log('[GenerarWord] Librería docx importada correctamente');
      } catch (error: any) {
        console.error('[GenerarWord] Error al importar docx:', error);
        setMessage({ type: 'error', text: `Error al cargar librería docx: ${error.message || 'Error desconocido'}` });
        return;
      }

      // Crear tabla con encabezados
      const tableRows: any[] = [
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

      // Agregar filas de datos usando las facturas actuales del estado
      facturas.forEach((factura) => {
        tableRows.push(
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph(factura.numero_factura)],
              }),
              new TableCell({
                children: [new Paragraph((() => {
                  // Para facturas anuladas, fecha_emision puede ser null
                  if (factura.es_anulada || !factura.fecha_emision || factura.fecha_emision.trim() === '') {
                    return '-';
                  }
                  // Parsear fecha en hora local para evitar problemas de zona horaria
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
                children: [new Paragraph(factura.cantidad || '-')],
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

      // Calcular total
      const total = facturas
        .filter(f => !f.es_anulada)
        .reduce((sum, factura) => sum + sumarPreciosFactura(factura.costo_final || ''), 0);
      
      const numero = Math.round(total).toString();
      const formateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      const totalFormateado = `Gs. ${formateado}`;

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
                children: [new TextRun({ text: totalFormateado, bold: true })],
                alignment: AlignmentType.RIGHT,
              })],
              shading: { fill: 'E7E6E6' },
            }),
          ],
        })
      );

      // Crear documento
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

      // Generar buffer y descargar usando método nativo (funciona mejor en Tauri)
      console.log('[GenerarWord] Generando blob del documento...');
      const blob = await Packer.toBlob(doc);
      console.log('[GenerarWord] Blob generado, tamaño:', blob.size);
      
      const fileName = `facturas_${new Date().toISOString().split('T')[0]}.docx`;
      console.log('[GenerarWord] Descargando archivo:', fileName);
      
      // Usar método nativo del navegador para descargar (funciona en Tauri)
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      console.log('[GenerarWord] Documento generado exitosamente');
      setMessage({ type: 'success', text: 'Documento Word generado exitosamente' });
    } catch (error: any) {
      console.error('[GenerarWord] Error completo:', error);
      console.error('[GenerarWord] Stack:', error?.stack);
      const errorMessage = error?.message || 'Error desconocido';
      setMessage({ type: 'error', text: `Error al generar documento Word: ${errorMessage}. Por favor, revisa la consola (F12) para más detalles.` });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Gestión de Facturas</h1>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <h2>Nueva Factura</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="numero_factura">Número de Factura *</label>
              <input
                type="text"
                id="numero_factura"
                name="numero_factura"
                value={formData.numero_factura}
                onChange={handleInputChange}
                required
              />
            </div>

           <div className="form-group">
             <label htmlFor="fecha_emision">Fecha de Emisión {!formData.es_anulada && '*'}</label>
             <input
               type="date"
               id="fecha_emision"
               name="fecha_emision"
               value={formData.fecha_emision}
               onChange={handleInputChange}
               disabled={formData.es_anulada}
               required={!formData.es_anulada}
             />
           </div>
          </div>

           <div className="form-group">
             <label htmlFor="ruc">RUC {!formData.es_anulada && '*'}</label>
             <div className="ruc-search">
               <input
                 type="text"
                 id="ruc"
                 name="ruc"
                 value={formData.ruc}
                 onChange={handleInputChange}
                 placeholder="Ingrese el RUC"
                 disabled={formData.es_anulada}
                 required={!formData.es_anulada}
               />
               <button
                 type="button"
                 onClick={consultarRUC}
                 className="btn btn-secondary"
                 disabled={searchingRUC || !formData.ruc || formData.es_anulada}
               >
                 {searchingRUC ? <span className="loading"></span> : 'Consultar RUC'}
               </button>
             </div>
           </div>

           <div className="form-group">
             <label htmlFor="nombre_cliente">Nombre del Cliente / Razón Social {!formData.es_anulada && '*'}</label>
             <input
               type="text"
               id="nombre_cliente"
               name="nombre_cliente"
               value={formData.nombre_cliente}
               onChange={handleInputChange}
               disabled={formData.es_anulada}
               required={!formData.es_anulada}
             />
           </div>

           <div className="form-group">
             <label htmlFor="es_persona_juridica">Tipo de Contribuyente {!formData.es_anulada && '*'}</label>
             <select
               id="es_persona_juridica"
               name="es_persona_juridica"
               value={formData.es_persona_juridica ? 'true' : 'false'}
               onChange={(e) => setFormData(prev => ({ ...prev, es_persona_juridica: e.target.value === 'true' }))}
               disabled={formData.es_anulada}
               required={!formData.es_anulada}
               style={{ width: '100%', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '1rem' }}
             >
               <option value="true">Persona Jurídica (Empresa)</option>
               <option value="false">Persona Física</option>
             </select>
           </div>

           <div className="form-row">
             <div className="form-group">
               <label htmlFor="cantidad">Cantidad {!formData.es_anulada && '*'}</label>
               <textarea
                 id="cantidad"
                 name="cantidad"
                 value={formData.cantidad}
                 onChange={handleInputChange}
                 placeholder={formData.es_anulada ? 'No aplica para facturas anuladas' : 'Ingrese la cantidad. Para múltiples cantidades, use una línea por cada cantidad.'}
                 rows={3}
                 disabled={formData.es_anulada}
                 required={!formData.es_anulada}
               />
               {!formData.es_anulada && (
                 <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>
                   Puede ingresar múltiples cantidades, una por línea
                 </small>
               )}
             </div>

             <div className="form-group">
               <label htmlFor="costo_final">Costo Final (Gs.) {!formData.es_anulada && '*'}</label>
               <textarea
                 id="costo_final"
                 name="costo_final"
                 value={formData.costo_final}
                 onChange={handleInputChange}
                 placeholder={formData.es_anulada ? 'No aplica para facturas anuladas' : 'Ingrese el precio. Para múltiples precios, use una línea por cada precio.'}
                 rows={3}
                 disabled={formData.es_anulada}
                 required={!formData.es_anulada}
               />
               {!formData.es_anulada && (
                 <small style={{ display: 'block', marginTop: '0.25rem', color: '#6b7280' }}>
                   Puede ingresar múltiples precios, uno por línea
                 </small>
               )}
             </div>
           </div>

           <div className="form-group">
             <label>
               <input
                 type="checkbox"
                 checked={formData.es_anulada}
                 onChange={(e) => {
                   const esAnulada = e.target.checked;
                   setFormData(prev => ({
                     ...prev,
                     es_anulada: esAnulada,
                     // Si se marca como anulada, limpiar campos opcionales
                     fecha_emision: esAnulada ? '' : prev.fecha_emision || new Date().toISOString().split('T')[0],
                     nombre_cliente: esAnulada ? '' : prev.nombre_cliente,
                     ruc: esAnulada ? '' : prev.ruc,
                     cantidad: esAnulada ? '' : prev.cantidad,
                     descripcion: esAnulada ? '' : prev.descripcion,
                     costo_final: esAnulada ? '' : prev.costo_final,
                   }));
                 }}
                 style={{ marginRight: '0.5rem' }}
               />
               Factura Anulada
             </label>
             {formData.es_anulada && (
               <small style={{ display: 'block', marginTop: '0.25rem', color: '#dc2626', fontStyle: 'italic' }}>
                 Las facturas anuladas solo requieren el número de factura. Los demás campos se deshabilitan.
               </small>
             )}
           </div>

          <div className="form-group">
            <label htmlFor="descripcion">Descripción de la Venta {!formData.es_anulada && '*'}</label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleInputChange}
              disabled={formData.es_anulada}
              required={!formData.es_anulada}
              placeholder={formData.es_anulada ? 'No aplica para facturas anuladas' : 'Ingrese la descripción de la venta'}
            />
          </div>

          <div className="btn-group">
            {editingId !== null && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="btn btn-secondary"
                disabled={submitting}
              >
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Guardando...' : editingId !== null ? 'Actualizar Factura' : 'Guardar Factura'}
            </button>
          </div>
        </form>
      </div>

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Facturas Registradas ({facturas.length})</h2>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              onClick={() => setShowLogs(true)} 
              className="btn btn-secondary"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              title="Ver logs del sistema"
            >
              📋 Logs
            </button>
            <button onClick={generarWord} className="btn btn-success" disabled={facturas.length === 0}>
              Generar Word
            </button>
          </div>
        </div>

        {loading ? (
          <p>Cargando facturas...</p>
        ) : facturas.length === 0 ? (
          <p>No hay facturas registradas</p>
        ) : (
          <div className="table-container">
            <table>
               <thead>
                 <tr>
                   <th>N° Factura</th>
                   <th>Fecha</th>
                   <th>Cliente</th>
                   <th>RUC</th>
                   <th>Tipo</th>
                   <th>Cantidad</th>
                   <th>Descripción</th>
                   <th>Costo Final</th>
                   <th>Acciones</th>
                 </tr>
               </thead>
               <tbody>
                 {facturas.map((factura) => (
                   <tr key={factura.id}>
                    <td>{factura.numero_factura}</td>
                    <td>
                      {factura.es_anulada || !factura.fecha_emision || factura.fecha_emision.trim() === '' ? (
                        '-'
                      ) : (() => {
                        // Parsear fecha en hora local para evitar problemas de zona horaria
                        const [year, month, day] = factura.fecha_emision.split('-').map(Number);
                        const date = new Date(year, month - 1, day);
                        return date.toLocaleDateString('es-PY');
                      })()}
                    </td>
                     <td>{factura.es_anulada ? '-' : factura.nombre_cliente}</td>
                     <td>{factura.es_anulada ? '-' : factura.ruc}</td>
                     <td>{factura.es_anulada ? '-' : (factura.es_persona_juridica ? 'Jurídica' : 'Física')}</td>
                     <td style={{ whiteSpace: 'pre-line' }}>
                      {factura.es_anulada ? '-' : (factura.cantidad || '-')}
                    </td>
                     <td>
                       {factura.es_anulada ? (
                         <span style={{ color: '#dc2626', fontStyle: 'italic', fontWeight: 'bold' }}>ANULADA</span>
                       ) : (
                         factura.descripcion || '-'
                       )}
                     </td>
                     <td style={{ whiteSpace: 'pre-line' }}>
                       {factura.es_anulada ? (
                         <span style={{ color: '#dc2626', fontStyle: 'italic' }}>ANULADA</span>
                       ) : (
                         formatearPrecios(factura.costo_final || '')
                       )}
                     </td>
                     <td>
                       <button
                         onClick={() => handleEdit(factura)}
                         className="btn btn-secondary"
                         style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                       >
                         Editar
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
               <tfoot>
                 <tr style={{ fontWeight: 'bold', backgroundColor: '#f9fafb' }}>
                   <td colSpan={8} style={{ textAlign: 'right' }}>Total:</td>
                   <td>
                     {(() => {
                       const total = facturas
                         .filter(f => !f.es_anulada)
                         .reduce((sum, factura) => sum + sumarPreciosFactura(factura.costo_final || ''), 0);
                       const numero = Math.round(total).toString();
                       const formateado = numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
                       return `Gs. ${formateado}`;
                     })()}
                   </td>
                 </tr>
               </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Logs */}
      {showLogs && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setShowLogs(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '1.5rem',
              maxWidth: '90vw',
              maxHeight: '90vh',
              width: '800px',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>Logs del Sistema</h2>
              <button 
                onClick={() => setShowLogs(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '0.25rem 0.5rem',
                }}
              >
                ×
              </button>
            </div>

            <LogsViewer 
              filter={logFilter}
              onFilterChange={setLogFilter}
              onClose={() => setShowLogs(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para visualizar logs
function LogsViewer({ filter, onFilterChange, onClose }: {
  filter: { category?: 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system'; level?: 'error' | 'warn' | 'info' };
  onFilterChange: (filter: { category?: 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system'; level?: 'error' | 'warn' | 'info' }) => void;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      try {
        const { getLogs, getLogsFiltered, getLogStats } = await import('@/lib/logger');
        const allStats = getLogStats();
        setStats(allStats);
        
        const filteredLogs = getLogsFiltered({
          category: filter.category,
          level: filter.level,
          limit: 500
        });
        setLogs(filteredLogs);
      } catch (error) {
        console.error('Error al cargar logs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [filter]);

  const handleDownload = async () => {
    const { downloadLogs } = await import('@/lib/logger');
    if (filter.category || filter.level) {
      downloadLogs({
        category: filter.category,
        level: filter.level
      });
    } else {
      downloadLogs();
    }
  };

  const handleClear = async () => {
    if (confirm('¿Está seguro de que desea limpiar todos los logs?')) {
      const { clearLogs } = await import('@/lib/logger');
      clearLogs();
      setLogs([]);
      setStats({ total: 0, byLevel: { info: 0, warn: 0, error: 0 }, byCategory: {} });
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return '#dc2626';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return '#6b7280';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      database: '#8b5cf6',
      api: '#06b6d4',
      frontend: '#10b981',
      ruc: '#f59e0b',
      tauri: '#ef4444',
      system: '#6b7280',
    };
    return colors[category] || '#6b7280';
  };

  if (loading) {
    return <div>Cargando logs...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Estadísticas */}
      {stats && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.5rem',
          marginBottom: '1rem',
          padding: '0.75rem',
          backgroundColor: '#f9fafb',
          borderRadius: '6px',
        }}>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.total}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Errores</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.byLevel.error}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Advertencias</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#f59e0b' }}>{stats.byLevel.warn}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Información</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#3b82f6' }}>{stats.byLevel.info}</div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select
          value={filter.category || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFilterChange({ 
              ...filter, 
              category: value ? (value as 'database' | 'api' | 'frontend' | 'ruc' | 'tauri' | 'system') : undefined 
            });
          }}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        >
          <option value="">Todas las categorías</option>
          <option value="database">Base de Datos</option>
          <option value="api">API</option>
          <option value="frontend">Frontend</option>
          <option value="ruc">RUC</option>
          <option value="tauri">Tauri</option>
          <option value="system">Sistema</option>
        </select>
        <select
          value={filter.level || ''}
          onChange={(e) => {
            const value = e.target.value;
            onFilterChange({ 
              ...filter, 
              level: value ? (value as 'error' | 'warn' | 'info') : undefined 
            });
          }}
          style={{ padding: '0.5rem', border: '1px solid #d1d5db', borderRadius: '6px' }}
        >
          <option value="">Todos los niveles</option>
          <option value="error">Errores</option>
          <option value="warn">Advertencias</option>
          <option value="info">Información</option>
        </select>
        <button onClick={handleDownload} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          Descargar
        </button>
        <button onClick={handleClear} className="btn btn-secondary" style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}>
          Limpiar
        </button>
      </div>

      {/* Lista de logs */}
      <div style={{ 
        flex: 1, 
        overflowY: 'auto', 
        border: '1px solid #e5e7eb', 
        borderRadius: '6px',
        padding: '0.5rem',
        backgroundColor: '#f9fafb',
      }}>
        {logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            No hay logs para mostrar
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '0.75rem',
                marginBottom: '0.5rem',
                backgroundColor: 'white',
                borderRadius: '4px',
                borderLeft: `4px solid ${getLevelColor(log.level)}`,
                fontSize: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <span style={{ 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    fontWeight: 'bold',
                    color: 'white',
                    backgroundColor: getLevelColor(log.level)
                  }}>
                    {log.level.toUpperCase()}
                  </span>
                  <span style={{ 
                    padding: '0.125rem 0.5rem', 
                    borderRadius: '4px', 
                    fontSize: '0.75rem',
                    color: 'white',
                    backgroundColor: getCategoryColor(log.category)
                  }}>
                    {log.category}
                  </span>
                </div>
                <span style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                  {new Date(log.timestamp).toLocaleString('es-PY')}
                </span>
              </div>
              <div style={{ marginBottom: '0.25rem', fontWeight: '500' }}>
                {log.message}
              </div>
              {log.data && (
                <details style={{ marginTop: '0.5rem' }}>
                  <summary style={{ cursor: 'pointer', color: '#6b7280', fontSize: '0.75rem' }}>
                    Ver detalles
                  </summary>
                  <pre style={{ 
                    marginTop: '0.5rem', 
                    padding: '0.5rem', 
                    backgroundColor: '#f3f4f6', 
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    overflow: 'auto',
                    maxHeight: '200px'
                  }}>
                    {JSON.stringify(log.data, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

