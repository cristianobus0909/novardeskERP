import { IsString, IsOptional, IsEmail } from 'class-validator';

export class CreateClienteDto {
  @IsOptional()
  @IsString()
  tipo_documento?: string;

  @IsString()
  cuit_dni!: string;

  @IsString()
  razon_social!: string;

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
