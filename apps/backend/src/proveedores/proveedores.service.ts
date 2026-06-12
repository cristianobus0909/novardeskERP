import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class ProveedoresService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async create(data: any) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');
    
    return this.prisma.proveedor.create({
      data: {
        ...data,
        tenant_id: tenantId,
      },
    });
  }

  async findAll() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.proveedor.findMany({
      where: { tenant_id: tenantId },
      orderBy: { razon_social: 'asc' },
    });
  }

  async findOne(id: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    const proveedor = await this.prisma.proveedor.findFirst({
      where: { id, tenant_id: tenantId },
    });

    if (!proveedor) throw new NotFoundException('Proveedor no encontrado');
    return proveedor;
  }

  async update(id: number, data: any) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.proveedor.update({
      where: { id, tenant_id: tenantId },
      data,
    });
  }

  async remove(id: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant');

    return this.prisma.proveedor.delete({
      where: { id, tenant_id: tenantId },
    });
  }
}
