import { Controller, Get, Post, Body, Delete, Param, UseGuards } from '@nestjs/common';
import { GastosService } from './gastos.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('gastos')
export class GastosController {
  constructor(private readonly gastosService: GastosService) {}

  @Post()
  create(@CurrentUser('id') userId: number, @Body() createGastoDto: any): Promise<any> {
    return this.gastosService.create(userId, createGastoDto);
  }

  @Get()
  findAll(): Promise<any> {
    return this.gastosService.findAll();
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<any> {
    return this.gastosService.remove(+id);
  }
}
