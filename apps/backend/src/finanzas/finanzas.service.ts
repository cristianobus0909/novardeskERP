import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class FinanzasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async getCuentas(): Promise<any> {
    return this.prisma.cuentaContable.findMany({
      where: { tenant_id: this.tenantContext.getTenantId()! },
      include: {
        planes_pago: {
          where: { activo: true }
        }
      }
    });
  }

  async createCuenta(data: { nombre: string; tipo: any }): Promise<any> {
    return this.prisma.cuentaContable.create({
      data: {
        tenant_id: this.tenantContext.getTenantId()!,
        nombre: data.nombre,
        tipo: data.tipo,
        activa: true
      }
    });
  }

  async toggleCuenta(id: number): Promise<any> {
    const cuenta = await this.prisma.cuentaContable.findUnique({ where: { id, tenant_id: this.tenantContext.getTenantId()! } });
    if (!cuenta) throw new BadRequestException('Cuenta no encontrada');

    return this.prisma.cuentaContable.update({
      where: { id },
      data: { activa: !cuenta.activa }
    });
  }

  async createPlan(cuentaId: number, data: { nombre: string; cuotas: number; recargo_porcentaje: number; comision_porcentaje: number }): Promise<any> {
    const cuenta = await this.prisma.cuentaContable.findUnique({ where: { id: cuentaId, tenant_id: this.tenantContext.getTenantId()! } });
    if (!cuenta) throw new BadRequestException('Cuenta no encontrada');

    return this.prisma.planPago.create({
      data: {
        cuenta_contable_id: cuentaId,
        nombre: data.nombre,
        cuotas: data.cuotas,
        recargo_porcentaje: data.recargo_porcentaje,
        comision_porcentaje: data.comision_porcentaje,
        activo: true
      }
    });
  }

  async deletePlan(id: number): Promise<any> {
    // Para no romper la integridad de ventas viejas, idealmente hacemos borrado lógico.
    return this.prisma.planPago.update({
      where: { id },
      data: { activo: false }
    });
  }
}
