import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';

@Injectable()
export class NotificacionesService {
  private readonly logger = new Logger(NotificacionesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async getNotificaciones() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return [];

    return this.prisma.notificacion.findMany({
      where: { tenant_id: tenantId },
      orderBy: { creado_el: 'desc' },
      take: 50,
    });
  }

  async getUnreadCount() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return { unread: 0 };

    const count = await this.prisma.notificacion.count({
      where: { tenant_id: tenantId, leida: false },
    });
    return { unread: count };
  }

  async markAsRead(id: number) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return null;

    return this.prisma.notificacion.update({
      where: { id, tenant_id: tenantId },
      data: { leida: true },
    });
  }

  async markAllAsRead() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) return { count: 0 };

    return this.prisma.notificacion.updateMany({
      where: { tenant_id: tenantId, leida: false },
      data: { leida: true },
    });
  }
}
