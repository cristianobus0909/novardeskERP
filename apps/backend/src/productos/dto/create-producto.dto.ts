export class CreateProductoVarianteDto {
  sku!: string;
  codigo_barras?: string;
  precio_venta!: number; // Prisma Decimal se puede recibir como number
  costo?: number; // Precio de costo
  stock_actual!: number; // Prisma Decimal se puede recibir como number
  stock_minimo?: number; // Para el nivel de alerta de stock
  atributos_extra?: Record<string, any>; // Atributos dinámicos en formato JSON
}

export class CreateProductoDto {
  nombre!: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  es_servicio?: boolean;
  unidad_medida?: string;
  variantes!: CreateProductoVarianteDto[];
}
