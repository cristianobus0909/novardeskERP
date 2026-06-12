import { Controller, Get, Post, Body, Param, UseGuards, ParseIntPipe, Query } from '@nestjs/common';
import { VentasService } from './ventas.service';
import { CreateVentaDto } from './dto/create-venta.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
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
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<any> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.ventasService.findAll(pageNum, limitNum);
  }
  @Get('stats')
  getStats(): Promise<any> {
    return this.ventasService.getDashboardStats();
  }

  @Get(':id')
  @Permissions('ventas:read')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.ventasService.findOne(id);
  }
}
