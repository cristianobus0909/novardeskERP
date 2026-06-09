import { Controller, Get, Post, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextService } from '../common/context/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';

@UseGuards(JwtAuthGuard)
@Controller('tenants')
export class TenantsController {
  constructor(
    private readonly tenantContext: TenantContextService,
    private readonly prisma: PrismaService,
    private readonly mercadopagoService: MercadoPagoService
  ) {}

  @Get('my-plan')
  async getMyPlan() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('No se pudo identificar el Tenant activo');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
    });

    if (!tenant) {
      throw new UnauthorizedException('Tenant no encontrado');
    }

    let dias_restantes = 0;
    if (tenant.estado_plan === 'TRIAL' && tenant.fin_prueba) {
      const diffTime = tenant.fin_prueba.getTime() - Date.now();
      dias_restantes = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return {
      id: tenant.id,
      razon_social: tenant.razon_social,
      cuit: tenant.cuit,
      estado_plan: tenant.estado_plan,
      mp_suscripcion_id: tenant.mp_suscripcion_id,
      fin_prueba: tenant.fin_prueba,
      fecha_proximo_cobro: tenant.fecha_proximo_cobro,
      dias_restantes,
    };
  }

  @Post('subscribe')
  async subscribe() {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    if (!tenantId || !userId) {
      throw new UnauthorizedException('Datos de sesión insuficientes');
    }

    // El interceptor filtra por tenantId, por lo que la búsqueda de User es segura
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.mercadopagoService.createSubscriptionPreference(tenantId, user.email);
  }
}
