export interface Factura {
  id?: number;
  numero_factura: string;
  fecha_emision: string;
  nombre_cliente: string;
  ruc: string;
  es_persona_juridica: boolean;
  cantidad: string; // Permite múltiples cantidades separadas por salto de línea
  descripcion?: string;
  costo_final?: string; // Permite múltiples precios separados por salto de línea
  es_anulada?: boolean;
  created_at?: string;
}

export interface RUCResponse {
  nombre?: string;
  razon_social?: string;
  ruc?: string;
  success: boolean;
  error?: string;
}

