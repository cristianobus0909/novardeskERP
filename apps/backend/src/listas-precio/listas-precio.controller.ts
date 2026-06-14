import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SubscriptionGuard } from '../common/guards/subscription.guard';
import { SubscriptionTiers } from '../common/decorators/subscription-tiers.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard, SubscriptionGuard)
@SubscriptionTiers('PREMIUM', 'FULL')
@Controller('listas-precio')
export class ListasPrecioController {
  constructor(private readonly listasPrecioService: ListasPrecioService) {}

  @Get()
  findAll(): Promise<any[]> {
    return this.listasPrecioService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<any> {
    return this.listasPrecioService.findOne(+id);
  }

  @Permissions('gestionar_catalogo')
  @Post()
  create(@Body() dto: any): Promise<any> {
    return this.listasPrecioService.create(dto);
  }

  @Permissions('gestionar_catalogo')
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: any): Promise<any> {
    return this.listasPrecioService.update(+id, dto);
  }

  @Permissions('gestionar_catalogo')
  @Delete(':id')
  remove(@Param('id') id: string): Promise<any> {
    return this.listasPrecioService.remove(+id);
  }
}
