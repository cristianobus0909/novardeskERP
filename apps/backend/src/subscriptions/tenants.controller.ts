import { Controller, Get, Post, Patch, Body, UseGuards, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantContextService } from '../common/context/tenant-context.service';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import { UpdateTenantDto } from './dto/update-tenant.dto';

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
      plan_tier: (tenant as any).plan_tier || 'TRIAL',
      mp_suscripcion_id: tenant.mp_suscripcion_id,
      fin_prueba: tenant.fin_prueba,
      fecha_proximo_cobro: tenant.fecha_proximo_cobro,
      dias_restantes,
      afip_facturacion_automatica: tenant.afip_facturacion_automatica,
    };
  }

  @Post('subscribe')
  async subscribe(@Body() body: { tier: string }) {
    const tenantId = this.tenantContext.getTenantId();
    const userId = this.tenantContext.getUserId();

    if (!tenantId || !userId) {
      throw new UnauthorizedException('Datos de sesión insuficientes');
    }
    
    const { tier } = body;
    if (!tier || !['BASICO', 'PREMIUM', 'FULL'].includes(tier)) {
      throw new BadRequestException('Plan seleccionado inválido');
    }

    // El interceptor filtra por tenantId, por lo que la búsqueda de User es segura
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    return this.mercadopagoService.createSubscriptionPreference(tenantId, user.email, tier);
  }

  @Patch('profile')
  async updateProfile(@Body() updateDto: UpdateTenantDto) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) {
      throw new UnauthorizedException('No se pudo identificar el Tenant activo');
    }

    const tenant = await this.prisma.tenant.update({
      where: { id: tenantId },
      data: updateDto,
    });

    return {
      message: 'Datos de la empresa actualizados correctamente',
      tenant: {
        id: tenant.id,
        razon_social: tenant.razon_social,
        cuit: tenant.cuit,
        domicilio_fiscal: tenant.domicilio_fiscal,
        condicion_iva: tenant.condicion_iva,
        afip_punto_venta: tenant.afip_punto_venta,
        afip_crt: tenant.afip_crt,
        estado_plan: tenant.estado_plan,
        afip_facturacion_automatica: tenant.afip_facturacion_automatica,
      },
    };
  }
}
