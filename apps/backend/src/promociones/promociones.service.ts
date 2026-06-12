import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { Promocion } from '@repo/database';

@Injectable()
export class PromocionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async findAll(): Promise<Promocion[]> {
    return this.prisma.promocion.findMany({
      where: { tenant_id: this.tenantContext.getTenantId() },
      orderBy: { creado_el: 'desc' }
    });
  }

  async findActive(): Promise<Promocion[]> {
    const now = new Date();
    return this.prisma.promocion.findMany({
      where: { 
        tenant_id: this.tenantContext.getTenantId(),
        activa: true,
        OR: [
          { fecha_inicio: null, fecha_fin: null },
          { fecha_inicio: { lte: now }, fecha_fin: { gte: now } }
        ]
      }
    });
  }

  async create(data: any): Promise<Promocion> {
    // Convierte el valor a tipo numérico de Prisma si es monto fijo
    return this.prisma.promocion.create({
      data: {
        ...data,
        tenant_id: this.tenantContext.getTenantId()
      }
    });
  }

  async toggleActive(id: number): Promise<Promocion> {
    const p = await this.prisma.promocion.findUnique({ where: { id } });
    if (!p || p.tenant_id !== this.tenantContext.getTenantId()) {
      throw new NotFoundException('Promoción no encontrada');
    }

    return this.prisma.promocion.update({
      where: { id },
      data: { activa: !p.activa }
    });
  }

  async remove(id: number): Promise<Promocion> {
    const p = await this.prisma.promocion.findUnique({ where: { id } });
    if (!p || p.tenant_id !== this.tenantContext.getTenantId()) {
      throw new NotFoundException('Promoción no encontrada');
    }
    return this.prisma.promocion.delete({ where: { id } });
  }
}
