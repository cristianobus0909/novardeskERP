import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseIntPipe, Put } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('clientes')
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Permissions('crear_cliente')
  create(@Body() createClienteDto: CreateClienteDto) {
    return this.clientesService.create(createClienteDto);
  }

  @Get()
  @Permissions('ver_clientes')
  findAll() {
    return this.clientesService.findAll();
  }

  @Get(':id')
  @Permissions('ver_clientes')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.findOne(id);
  }

  @Patch(':id')
  @Permissions('editar_cliente')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateClienteDto: UpdateClienteDto) {
    return this.clientesService.update(id, updateClienteDto);
  }

  @Delete(':id')
  @Permissions('eliminar_cliente')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.remove(id);
  }

  // ---- CUENTAS CORRIENTES ----

  @Post(':id/cuenta-corriente')
  @Permissions('settings:write') // Solo admin puede activar crédito
  async enableCuentaCorriente(@Param('id', ParseIntPipe) id: number, @Body('limite_credito') limite: number) {
    return this.clientesService.enableCuentaCorriente(id, limite);
  }

  @Get(':id/cuenta-corriente')
  @Permissions('ver_clientes') 
  async getCuentaCorriente(@Param('id', ParseIntPipe) id: number) {
    return this.clientesService.getCuentaCorriente(id);
  }

  @Post(':id/cuenta-corriente/abono')
  @Permissions('cobrar_venta') // El cajero recibe el pago
  async registrarAbono(
    @Param('id', ParseIntPipe) id: number, 
    @Body() abonoData: { monto: number; concepto: string; cuenta_contable_id?: number }
  ) {
    return this.clientesService.registrarAbono(id, abonoData);
  }
}
