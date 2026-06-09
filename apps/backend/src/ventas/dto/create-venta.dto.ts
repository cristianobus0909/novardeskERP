export class CreateVentaDetalleDto {
  variante_id!: number;
  cantidad!: number; // Se puede recibir como number y se mapea a Decimal en Prisma
  precio_unitario!: number;
  subtotal!: number;
}

export class CreateVentaDto {
  id_cliente?: string;
  nombre_cliente?: string;
  metodo_pago!: string;
  total!: number;
  detalles!: CreateVentaDetalleDto[];
}
