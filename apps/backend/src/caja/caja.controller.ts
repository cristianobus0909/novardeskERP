import { Controller, Get, Post, Body, UseGuards, Query } from '@nestjs/common';
import { CajaService } from './caja.service';
import { AbrirCajaDto } from './dto/abrir-caja.dto';
import { CerrarCajaDto } from './dto/cerrar-caja.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('caja')
export class CajaController {
  constructor(private readonly cajaService: CajaService) {}

  @Get('estado')
  getEstado(@CurrentUser('id') userId: number): Promise<any> {
    return this.cajaService.getEstadoCaja(userId);
  }

  @Get('historial')
  getHistorial(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<any> {
    return this.cajaService.getHistorialCaja(Number(page), Number(limit));
  }

  @Get('libro')
  getLibroCaja(
    @Query('fecha_desde') fechaDesde?: string,
    @Query('fecha_hasta') fechaHasta?: string,
  ): Promise<any> {
    return this.cajaService.getLibroCaja(fechaDesde, fechaHasta);
  }

  @Get('cierre-resumen')
  getCierreResumen(@CurrentUser('id') userId: number): Promise<any> {
    return this.cajaService.getCierreResumen(userId);
  }

  @Post('abrir')
  abrirCaja(
    @CurrentUser('id') userId: number,
    @Body() dto: AbrirCajaDto
  ): Promise<any> {
    return this.cajaService.abrirCaja(userId, dto);
  }

  @Post('cerrar')
  cerrarCaja(
    @CurrentUser('id') userId: number,
    @Body() dto: CerrarCajaDto
  ): Promise<any> {
    return this.cajaService.cerrarCaja(userId, dto);
  }
}
