/**
 * Interfaz que representa una factura en el sistema.
 */
export interface Factura {
  /** ID único de la factura (generado automáticamente por la base de datos) */
  id?: number;
  /** Número de factura (debe ser único) */
  numero_factura: string;
  /** Fecha de emisión en formato YYYY-MM-DD (null para facturas anuladas) */
  fecha_emision: string;
  /** Nombre del cliente o razón social */
  nombre_cliente: string;
  /** RUC del cliente */
  ruc: string;
  /** Indica si es persona jurídica (true) o física (false) */
  es_persona_juridica: boolean;
  /** Cantidad de productos/servicios (permite múltiples cantidades separadas por salto de línea) */
  cantidad: string;
  /** Descripción de la venta (opcional para facturas anuladas) */
  descripcion?: string;
  /** Costo final en guaraníes (permite múltiples precios separados por salto de línea, opcional para facturas anuladas) */
  costo_final?: string;
  /** Indica si la factura está anulada */
  es_anulada?: boolean;
  /** Fecha de creación del registro */
  created_at?: string;
}

/**
 * Interfaz que representa la respuesta de una consulta de RUC.
 */
export interface RUCResponse {
  /** Nombre o razón social del contribuyente (si la consulta fue exitosa) */
  nombre?: string;
  /** Razón social del contribuyente (si la consulta fue exitosa) */
  razon_social?: string;
  /** RUC consultado (si la consulta fue exitosa) */
  ruc?: string;
  /** Indica si la consulta fue exitosa */
  success: boolean;
  /** Mensaje de error (si la consulta falló) */
  error?: string;
}

