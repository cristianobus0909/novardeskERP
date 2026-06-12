import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CerrarCajaDto {
  @IsNumber()
  declarado_caja!: number;

  @IsNumber()
  declarado_extraccion!: number;

  @IsNumber()
  declarado_tarjeta_debito!: number;

  @IsNumber()
  declarado_tarjeta_credito!: number;

  @IsNumber()
  declarado_transferencia!: number;

  @IsNumber()
  declarado_mercadopago!: number;

  @IsOptional()
  @IsString()
  notas_cierre?: string;
}
