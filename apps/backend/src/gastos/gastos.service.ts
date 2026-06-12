import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class GastosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(userId: number, data: any): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    // Intentar buscar la caja abierta del usuario
    const cajaAbierta = await this.prisma.cajaTurno.findFirst({
      where: {
        tenant_id: tenantId,
        user_id: userId,
        estado: 'ABIERTA',
      },
    });

    return this.prisma.gasto.create({
      data: {
        ...data,
        monto: Number(data.monto),
        fecha: new Date(data.fecha),
        tenant_id: tenantId,
        caja_turno_id: cajaAbierta?.id, // Asocia a la caja actual si hay una
      },
    });
  }

  async findAll(): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.gasto.findMany({
      where: { tenant_id: tenantId },
      orderBy: { fecha: 'desc' },
      include: {
        proveedor: true,
      },
    });
  }

  async remove(id: number): Promise<any> {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.gasto.delete({
      where: { id, tenant_id: tenantId },
    });
  }
}
