import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantContextService } from '../common/context/tenant-context.service';
import { MercadoPagoConfig, Payment, Preference, Point } from 'mercadopago';

@Injectable()
export class MPService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService
  ) {}

  async saveConfig(accessToken: string, cajaId: string) {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant id in context');

    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        mp_access_token: accessToken,
        mp_caja_id: cajaId,
      },
    });

    return { success: true, message: 'Configuración de Mercado Pago guardada exitosamente.' };
  }

  async getConfig() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant id in context');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { mp_access_token: true, mp_caja_id: true }
    });

    return {
      mp_access_token: tenant?.mp_access_token ? '****' + tenant.mp_access_token.slice(-4) : null,
      mp_caja_id: tenant?.mp_caja_id || null,
      isConfigured: !!(tenant?.mp_access_token && tenant?.mp_caja_id)
    };
  }

  private async getMpClient() {
    const tenantId = this.tenantContext.getTenantId();
    if (!tenantId) throw new BadRequestException('No tenant id in context');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.mp_access_token) {
      throw new BadRequestException('Mercado Pago no está configurado para este comercio.');
    }

    return new MercadoPagoConfig({ accessToken: tenant.mp_access_token });
  }

  async createQrIntent(orderDto: { external_reference: string; total_amount: number; title: string }) {
    // ESTA ES UNA SIMULACIÓN. Para implementar un QR Dinámico real en MP
    // se utiliza la API de In-Store Orders.
    // Como acordamos, localmente usaremos un simulador para la UI.
    
    // Validamos que existan las credenciales
    await this.getMpClient(); 
    const tenant = await this.prisma.tenant.findUnique({ where: { id: this.tenantContext.getTenantId() }});

    return {
      success: true,
      qr_data: `MOCK_QR_DATA_${orderDto.external_reference}_${tenant?.mp_caja_id}`,
      external_reference: orderDto.external_reference,
      mode: 'QR_SIMULATED'
    };
  }

  async createPosIntent(orderDto: { external_reference: string; total_amount: number; title: string }) {
    const client = await this.getMpClient();
    const tenant = await this.prisma.tenant.findUnique({ where: { id: this.tenantContext.getTenantId() }});
    
    if (!tenant?.mp_caja_id) {
      throw new BadRequestException('Falta configurar el ID de la Caja (Device ID) para Smart POS.');
    }

    // SIMULACIÓN DE POINT
    // Para enviar el cobro real a Point Smart vía API:
    // const point = new Point(client);
    // return await point.createIntent({ device_id: tenant.mp_caja_id, payment: { amount: orderDto.total_amount } ... })
    
    return {
      success: true,
      message: 'Intención de pago enviada al Lector Smart POS',
      device_id: tenant.mp_caja_id,
      external_reference: orderDto.external_reference,
      mode: 'POS_SIMULATED'
    };
  }

  async processWebhook(body: any) {
    // Si estuviéramos en un webhook real, aquí verificaríamos `body.action === 'payment.created'`
    // y usaríamos la API de MP para buscar el pago por su ID y validar su estado (`approved`).
    // Tras validar que fue aprobado, lanzaríamos un evento en NestJS (EventEmitter) o actualizaríamos el estado en DB.
    
    console.log('[MP Webhook Processor] Procesando notificación simulada...');
    return true;
  }
}
