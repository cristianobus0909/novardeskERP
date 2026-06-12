import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { FinanzasService } from './finanzas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';

@Controller('finanzas')
@UseGuards(JwtAuthGuard)
export class FinanzasController {
  constructor(private readonly finanzasService: FinanzasService) {}

  @Get('cuentas')
  @Permissions('pos:access') // Todos pueden ver las cuentas para cobrar
  async getCuentas() {
    return this.finanzasService.getCuentas();
  }

  @Post('cuentas')
  @Permissions('settings:write')
  async createCuenta(@Body() createDto: any) {
    return this.finanzasService.createCuenta(createDto);
  }

  @Put('cuentas/:id/toggle')
  @Permissions('settings:write')
  async toggleCuenta(@Param('id') id: string) {
    return this.finanzasService.toggleCuenta(+id);
  }

  @Post('cuentas/:id/planes')
  @Permissions('settings:write')
  async createPlan(@Param('id') cuentaId: string, @Body() planDto: any) {
    return this.finanzasService.createPlan(+cuentaId, planDto);
  }

  @Delete('planes/:id')
  @Permissions('settings:write')
  async deletePlan(@Param('id') id: string) {
    return this.finanzasService.deletePlan(+id);
  }
}
