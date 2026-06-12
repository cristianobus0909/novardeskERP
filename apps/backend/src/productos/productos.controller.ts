import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @Permissions('productos:write')
  create(@Body() createProductoDto: CreateProductoDto): Promise<any> {
    return this.productosService.create(createProductoDto);
  }

  @Get()
  @Permissions('productos:read')
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ): Promise<any> {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.productosService.findAll(pageNum, limitNum);
  }

  // Nota de Arquitectura: Ubicar esta ruta estática antes de '/:id' para evitar conflictos de ruteo
  @Get('variante/buscar')
  @Permissions('productos:read')
  findVariant(@Query('q') q: string): Promise<any> {
    return this.productosService.findVariantBySkuOrBarcode(q);
  }

  @Get(':id')
  @Permissions('productos:read')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.productosService.findOne(id);
  }

  @Patch(':id')
  @Permissions('productos:write')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductoDto: UpdateProductoDto): Promise<any> {
    return this.productosService.update(id, updateProductoDto);
  }

  @Delete(':id')
  @Permissions('productos:write')
  remove(@Param('id', ParseIntPipe) id: number): Promise<any> {
    return this.productosService.remove(id);
  }
}
