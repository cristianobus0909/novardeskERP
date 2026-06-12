import { Controller, Post, Body, Headers, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from './mercadopago.service';
import * as crypto from 'crypto';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);
  private readonly webhookSecret = process.env.MP_WEBHOOK_SECRET || 'test_webhook_secret_key';

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadopagoService: MercadoPagoService
  ) {}

  @Post('mercadopago')
  async handleMercadoPagoWebhook(
    @Body() body: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
    @Headers('x-bypass-signature') xBypassSignature?: string
  ) {
    this.logger.log(`Webhook recibido de Mercado Pago: ${JSON.stringify(body)}`);

    const type = body.type || body.topic;
    const action = body.action;
    
    // Obtenemos el ID del recurso (suscripción / preapproval)
    const resourceId = body.data?.id || body.id;

    if (!resourceId) {
      this.logger.warn('Webhook recibido sin ID de recurso');
      return { received: true, reason: 'No resource ID found' };
    }

    // 1. Validación de Firma Criptográfica
    if (xBypassSignature === 'true') {
      this.logger.warn('Bypaseando validación de firma por header x-bypass-signature');
    } else {
      const isSignatureValid = this.verifyWebhookSignature(xSignature, xRequestId, resourceId);
      if (!isSignatureValid) {
        this.logger.error('Firma de webhook inválida detectada!');
        throw new BadRequestException('Firma de webhook inválida');
      }
      this.logger.log('Firma de webhook validada exitosamente');
    }

    // 2. Procesar evento de tipo preapproval (suscripción)
    if (type === 'preapproval' || action?.startsWith('preapproval')) {
      try {
        const details = await this.mercadopagoService.getSubscriptionDetails(resourceId);
        
        let tenantIdStr = details.external_reference;
        let tenantId: number | null = null;
        let incomingTier: 'BASICO' | 'PREMIUM' | 'FULL' | null = null;

        if (tenantIdStr) {
          const parts = tenantIdStr.split('_');
          tenantId = parseInt(parts[0], 10);
          if (parts[1] && ['BASICO', 'PREMIUM', 'FULL'].includes(parts[1])) {
            incomingTier = parts[1] as any;
          }
        }

        let tenant = null;
        if (tenantId && !isNaN(tenantId)) {
          tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        }

        if (!tenant) {
          // Si no vino en external_reference, buscamos por mp_suscripcion_id previo
          tenant = await this.prisma.tenant.findFirst({
            where: { mp_suscripcion_id: resourceId },
          });
        }

        if (!tenant) {
          this.logger.error(`No se encontró inquilino para la suscripción ID: ${resourceId}`);
          return { received: true, status: 'Tenant not found' };
        }

        // Mapear estado de Mercado Pago a EstadoPlan
        // authorized -> ACTIVE, past_due -> PAST_DUE, cancelled -> CANCELED
        let estado_plan: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' | 'TRIAL' = 'ACTIVE';
        if (details.status === 'past_due') {
          estado_plan = 'PAST_DUE';
        } else if (details.status === 'cancelled') {
          estado_plan = 'CANCELED';
        }

        // Update DB
        const updateData: any = {
          estado_plan,
          mp_suscripcion_id: details.id,
          fecha_proximo_cobro: details.next_payment_date ? new Date(details.next_payment_date) : null,
        };

        if (incomingTier && estado_plan === 'ACTIVE') {
          updateData.plan_tier = incomingTier;
        }

        await this.prisma.tenant.update({
          where: { id: tenant.id },
          data: updateData
        });

        this.logger.log(`Tenant ${tenant.id} (${tenant.razon_social}) actualizado a plan ${estado_plan}`);
        return { success: true, tenant_id: tenant.id, estado_plan };
      } catch (err: any) {
        this.logger.error(`Error al procesar los detalles de suscripción: ${err.message}`);
        throw new BadRequestException(`Error interno procesando webhook: ${err.message}`);
      }
    }

    return { received: true, type };
  }

  private verifyWebhookSignature(xSignature?: string, xRequestId?: string, resourceId?: string): boolean {
    if (!xSignature) {
      this.logger.warn('Falta header x-signature');
      return false;
    }

    try {
      const parts = xSignature.split(',');
      let ts = '';
      let v1 = '';
      for (const part of parts) {
        const [key, value] = part.trim().split('=');
        if (key === 'ts') ts = value || '';
        if (key === 'v1') v1 = value || '';
      }

      if (!ts || !v1) {
        this.logger.warn(`Formato de x-signature inválido: ${xSignature}`);
        return false;
      }

      // La firma en Mercado Pago se arma con:
      // "id:[resourceId];request-id:[x-request-id];ts:[timestamp];"
      const manifest = `id:${resourceId};request-id:${xRequestId || ''};ts:${ts};`;
      
      const calculated = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(manifest)
        .digest('hex');

      return calculated === v1;
    } catch (e: any) {
      this.logger.error(`Error calculando firma HMAC: ${e.message}`);
      return false;
    }
  }
}
