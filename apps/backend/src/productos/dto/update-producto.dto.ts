export class UpdateProductoVarianteDto {
  id?: number;
  sku?: string;
  codigo_barras?: string;
  precio_venta?: number;
  costo?: number; // Precio de costo
  stock_actual?: number;
  stock_minimo?: number;
  atributos_extra?: Record<string, any>;
}

export class UpdateProductoDto {
  nombre?: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  es_servicio?: boolean;
  unidad_medida?: string;
  variantes?: UpdateProductoVarianteDto[];
}
