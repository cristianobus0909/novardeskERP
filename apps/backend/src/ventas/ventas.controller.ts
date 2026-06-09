import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('ventas')
export class VentasController {
  constructor(private readonly ventasService: VentasService) {}

  @Post()
  @Permissions('pos:access')
  create(
    @CurrentUser('id') userId: number,
    @Body() createVentaDto: CreateVentaDto
  ): Promise<any> {
    return this.ventasService.create(userId, createVentaDto);
  }

  @Get()
  @Permissions('ventas:read')
  findAll(): Promise<any> {
    return this.ventasService.findAll();
  }

  @Get(':id')
  @Permissions('ventas:read')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.ventasService.findOne(id);
  }
}
