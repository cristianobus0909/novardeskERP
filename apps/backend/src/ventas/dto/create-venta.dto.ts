import { IsNumber, IsOptional, IsString, Min, IsArray, ValidateNested, IsBoolean } from 'class-validator';

export class CreateVentaDetalleDto {
  variante_id!: number;
  cantidad!: number; // Se puede recibir como number y se mapea a Decimal en Prisma
  precio_unitario!: number;
  subtotal!: number;
}

export class CreateVentaPagoDto {
  metodo_pago!: string;
  monto!: number;
  cuenta_contable_id?: number;
  plan_pago_id?: number;
}

export class CreateVentaDto {
  @IsOptional()
  @IsNumber()
  cliente_id?: number;

  @IsOptional()
  @IsString()
  id_cliente?: string; // Por compatibilidad o si se tipea a mano

  @IsOptional()
  @IsString()
  nombre_cliente?: string; // "Consumidor Final"

  @IsOptional()
  @IsString()
  metodo_pago?: string;

  @IsOptional()
  pagos?: CreateVentaPagoDto[];

  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @IsOptional()
  @IsNumber()
  descuento_monto?: number;

  @IsOptional()
  @IsString()
  descuento_motivo?: string;

  @IsOptional()
  @IsNumber()
  cupon_id?: number;

  @IsOptional()
  @IsNumber()
  promocion_id?: number;

  @IsNumber()
  @Min(0)
  total!: number;

  @IsArray()
  @ValidateNested({ each: true })
  detalles!: CreateVentaDetalleDto[];
}
