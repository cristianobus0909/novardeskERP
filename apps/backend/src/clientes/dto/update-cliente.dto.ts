import { IsString, IsOptional, IsEmail } from 'class-validator';

export class UpdateClienteDto {
  @IsOptional()
  @IsString()
  tipo_documento?: string;

  @IsOptional()
  @IsString()
  cuit_dni?: string;

  @IsOptional()
  @IsString()
  razon_social?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  condicion_iva?: string;
}
