import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { CreateMovimientoDto } from './dto/create-movimiento.dto';
import { CreateMovimientoLoteDto } from './dto/create-movimiento-lote.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('inventario')
export class InventarioController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get('depositos')
  getDepositos(): Promise<any[]> {
    return this.inventarioService.getDepositos();
  }

  @Get('historial')
  getHistorial(@Query('variante_id') varianteId?: string): Promise<any[]> {
    return this.inventarioService.getHistorial(varianteId ? Number(varianteId) : undefined);
  }

  @Permissions('gestionar_catalogo')
  @Post('movimientos')
  registrarMovimiento(@Body() dto: CreateMovimientoDto, @Request() req: any): Promise<any> {
    return this.inventarioService.registrarMovimiento(dto, req.user.id);
  }

  @Permissions('gestionar_catalogo')
  @Post('movimientos/lote')
  registrarMovimientoLote(@Body() dto: CreateMovimientoLoteDto, @Request() req: any): Promise<any> {
    return this.inventarioService.registrarMovimientoLote(dto, req.user.id);
  }
}
