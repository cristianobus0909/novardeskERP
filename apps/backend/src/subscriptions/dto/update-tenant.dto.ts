import { IsString, IsOptional, MaxLength, IsUrl } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  razon_social?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cuit?: string;

  @IsString()
  @IsOptional()
  @MaxLength(200)
  domicilio_fiscal?: string;

  @IsString()
  @IsOptional()
  condicion_iva?: string;

  @IsString()
  @IsOptional()
  logo_url?: string;

  @IsString()
  @IsOptional()
  afip_crt?: string;

  @IsString()
  @IsOptional()
  afip_key?: string;

  @IsOptional()
  afip_punto_venta?: number;

  @IsOptional()
  afip_facturacion_automatica?: boolean;
}
