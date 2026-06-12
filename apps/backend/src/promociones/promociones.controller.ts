import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { PromocionesService } from './promociones.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Promocion } from '@repo/database';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('promociones')
export class PromocionesController {
  constructor(private readonly promocionesService: PromocionesService) {}

  @Get('activas')
  findActive(): Promise<Promocion[]> {
    return this.promocionesService.findActive();
  }

  @Roles('Administrador')
  @Get()
  findAll(): Promise<Promocion[]> {
    return this.promocionesService.findAll();
  }

  @Roles('Administrador')
  @Post()
  create(@Body() data: any): Promise<Promocion> {
    return this.promocionesService.create(data);
  }

  @Roles('Administrador')
  @Patch(':id/toggle')
  toggleActive(@Param('id') id: string): Promise<Promocion> {
    return this.promocionesService.toggleActive(+id);
  }

  @Roles('Administrador')
  @Delete(':id')
  remove(@Param('id') id: string): Promise<Promocion> {
    return this.promocionesService.remove(+id);
  }
}
