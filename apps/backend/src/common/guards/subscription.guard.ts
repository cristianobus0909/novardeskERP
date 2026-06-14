import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SUBSCRIPTION_TIERS_KEY } from '../decorators/subscription-tiers.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredTiers = this.reflector.getAllAndOverride<string[]>(SUBSCRIPTION_TIERS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Si el endpoint no requiere planes específicos, permitimos el acceso
    if (!requiredTiers || requiredTiers.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user || !user.tenantId) {
      return false;
    }

    // Buscar el tenant para verificar su plan_tier y estado_plan
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
    });

    if (!tenant) {
      return false;
    }

    // Si el plan está impago (PAST_DUE) o cancelado, rechazar acceso
    if (tenant.estado_plan === 'PAST_DUE' || tenant.estado_plan === 'CANCELED') {
      throw new ForbiddenException(
        'El acceso a este módulo está restringido. Por favor regularice su estado de facturación.'
      );
    }

    const hasTier = requiredTiers.includes(tenant.plan_tier);

    if (!hasTier) {
      throw new ForbiddenException(
        `Esta funcionalidad requiere un plan ${requiredTiers.join(' o ')}. Tu plan actual es ${tenant.plan_tier}.`
      );
    }

    return true;
  }
}
