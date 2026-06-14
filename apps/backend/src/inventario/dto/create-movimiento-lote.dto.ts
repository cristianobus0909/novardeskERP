import { IsString, IsNumber, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMovimientoStock } from './create-movimiento.dto';

class MovimientoLoteItem {
  @IsNumber()
  variante_id!: number;

  @IsNumber()
  cantidad!: number;
}

export class CreateMovimientoLoteDto {
  @IsNumber()
  deposito_id!: number;

  @IsEnum(TipoMovimientoStock)
  tipo!: TipoMovimientoStock;

  @IsString()
  @IsOptional()
  concepto?: string;

  @IsString()
  @IsOptional()
  comprobante?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MovimientoLoteItem)
  items!: MovimientoLoteItem[];
}
