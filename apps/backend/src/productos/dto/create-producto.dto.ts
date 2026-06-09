export class CreateProductoVarianteDto {
  sku!: string;
  codigo_barras?: string;
  precio_venta!: number; // Prisma Decimal se puede recibir como number
  stock_actual!: number; // Prisma Decimal se puede recibir como number
  atributos_extra?: Record<string, any>; // Atributos dinámicos en formato JSON
}

export class CreateProductoDto {
  nombre!: string;
  descripcion?: string;
  categoria?: string;
  marca?: string;
  es_servicio?: boolean;
  variantes!: CreateProductoVarianteDto[];
}
