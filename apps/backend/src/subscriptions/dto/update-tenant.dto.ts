import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateTenantDto {
  @IsString()
  @IsOptional()
  @MaxLength(100)
  razon_social?: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  cuit?: string;
}
