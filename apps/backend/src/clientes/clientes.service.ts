import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { CreateClienteDto } from './dto/create-cliente.dto';
import { UpdateClienteDto } from './dto/update-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async findAll() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.cliente.findMany({
      where: { tenant_id: tenantId },
      orderBy: { creado_el: 'desc' },
    });
  }

  async findOne(id: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cliente = await this.prisma.cliente.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID ${id} no encontrado`);
    }

    return cliente;
  }

  async create(dto: CreateClienteDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    // Verificar si ya existe el DNI/CUIT en el tenant
    const existe = await this.prisma.cliente.findUnique({
      where: {
        tenant_id_cuit_dni: {
          tenant_id: tenantId,
          cuit_dni: dto.cuit_dni
        }
      }
    });

    if (existe) {
      throw new BadRequestException('Ya existe un cliente con este DNI/CUIT');
    }

    return this.prisma.cliente.create({
      data: {
        tenant_id: tenantId,
        cuit_dni: dto.cuit_dni,
        razon_social: dto.razon_social,
        email: dto.email,
        telefono: dto.telefono,
        direccion: dto.direccion,
        condicion_iva: dto.condicion_iva || 'Consumidor Final',
      }
    });
  }

  async update(id: number, dto: UpdateClienteDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cliente = await this.findOne(id);

    // Si cambia el dni, verificar que no choque
    if (dto.cuit_dni && dto.cuit_dni !== cliente.cuit_dni) {
      const existe = await this.prisma.cliente.findUnique({
        where: {
          tenant_id_cuit_dni: {
            tenant_id: tenantId,
            cuit_dni: dto.cuit_dni
          }
        }
      });
      if (existe) {
        throw new BadRequestException('Ya existe otro cliente con este DNI/CUIT');
      }
    }

    return this.prisma.cliente.update({
      where: { id },
      data: dto
    });
  }

  async remove(id: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    await this.findOne(id); // Verifica si existe

    // Verificar si el cliente tiene ventas
    const ventas = await this.prisma.venta.count({
      where: { cliente_id: id }
    });

    if (ventas > 0) {
      throw new BadRequestException('No se puede eliminar el cliente porque tiene ventas asociadas');
    }

    return this.prisma.cliente.delete({
      where: { id }
    });
  }

  // ---- CUENTAS CORRIENTES ----

  async enableCuentaCorriente(clienteId: number, limite: number): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cliente = await this.findOne(clienteId);

    const existe = await this.prisma.cuentaCorriente.findUnique({
      where: { cliente_id: clienteId }
    });

    if (existe) {
      return this.prisma.cuentaCorriente.update({
        where: { id: existe.id },
        data: { limite_credito: limite, activa: true }
      });
    }

    return this.prisma.cuentaCorriente.create({
      data: {
        cliente_id: clienteId,
        tenant_id: tenantId,
        limite_credito: limite,
        saldo_actual: 0,
        activa: true
      }
    });
  }

  async getCuentaCorriente(clienteId: number): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.cuentaCorriente.findUnique({
      where: { cliente_id: clienteId },
      include: {
        movimientos: {
          orderBy: { fecha_movimiento: 'desc' },
          take: 50 // Traer los últimos 50 movimientos
        }
      }
    });
  }

  async registrarAbono(clienteId: number, abonoData: { monto: number; concepto: string; cuenta_contable_id?: number }): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const cuenta = await this.prisma.cuentaCorriente.findUnique({
      where: { cliente_id: clienteId }
    });

    if (!cuenta) {
      throw new BadRequestException('El cliente no tiene cuenta corriente');
    }

    if (abonoData.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Crear el movimiento (Abono)
      const movimiento = await tx.movimientoCuentaCorriente.create({
        data: {
          cuenta_corriente_id: cuenta.id,
          tipo_movimiento: 'ABONO',
          monto: abonoData.monto,
          concepto: abonoData.concepto,
        }
      });

      // 2. Descontar el saldo_actual (Deuda). El saldo_actual representa la deuda total (positivo = debe).
      // Un abono reduce la deuda.
      const cuentaActualizada = await tx.cuentaCorriente.update({
        where: { id: cuenta.id },
        data: {
          saldo_actual: {
            decrement: abonoData.monto
          }
        }
      });

      return cuentaActualizada;
    });
  }
}
