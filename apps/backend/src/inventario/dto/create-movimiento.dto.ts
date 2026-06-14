import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';

export enum TipoMovimientoStock {
  ENTRADA_COMPRA = 'ENTRADA_COMPRA',
  ENTRADA_AJUSTE = 'ENTRADA_AJUSTE',
  SALIDA_VENTA = 'SALIDA_VENTA',
  SALIDA_AJUSTE = 'SALIDA_AJUSTE',
  TRASLADO = 'TRASLADO',
  REMITO_ENTREGA = 'REMITO_ENTREGA'
}

export class CreateMovimientoDto {
  @IsNumber()
  variante_id!: number;

  @IsNumber()
  deposito_id!: number;

  @IsEnum(TipoMovimientoStock)
  tipo!: TipoMovimientoStock;

  @IsNumber()
  cantidad!: number;

  @IsString()
  @IsOptional()
  concepto?: string;

  @IsString()
  @IsOptional()
  comprobante?: string;
}
