import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private readonly accessToken = process.env.MP_ACCESS_TOKEN || 'TEST-123456789-development-token';

  private isMockMode(): boolean {
    return this.accessToken === 'TEST-123456789-development-token';
  }

  async createSubscriptionPreference(tenantId: number, email: string) {
    this.logger.log(`Creando preferencia de suscripción para Tenant ${tenantId} (${email})`);

    if (this.isMockMode()) {
      this.logger.log('Modo simulador: Retornando URL de checkout simulada');
      return {
        id: `sub_active_${tenantId}_${Math.floor(Math.random() * 1000)}`,
        init_point: `http://localhost:3001/mock-checkout?preapproval_id=sub_active_${tenantId}_${Math.floor(Math.random() * 1000)}&tenant_id=${tenantId}`,
      };
    }

    try {
      const response = await fetch('https://api.mercadopago.com/preapproval', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          back_url: 'http://localhost:3001/subscription',
          reason: 'Suscripción NovarDesk ERP - Plan Premium',
          auto_recurring: {
            frequency: 1,
            frequency_type: 'months',
            transaction_amount: 2500,
            currency_id: 'ARS',
          },
          payer_email: email,
          external_reference: tenantId.toString(),
          status: 'pending',
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mercado Pago API error: ${errText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        init_point: data.init_point,
      };
    } catch (error: any) {
      this.logger.error(`Error al crear suscripción en Mercado Pago: ${error.message}`);
      throw error;
    }
  }

  async getSubscriptionDetails(subscriptionId: string) {
    this.logger.log(`Obteniendo detalles de la suscripción: ${subscriptionId}`);

    if (this.isMockMode() || subscriptionId.startsWith('sub_')) {
      this.logger.log('Modo simulador: Retornando detalles simulados');
      const parts = subscriptionId.split('_');
      // sub_[state]_[tenantId]_[random]
      const state = parts[1] || 'active';
      const tenantId = parts[2] || '1';

      let status = 'authorized';
      if (state === 'pastdue') status = 'past_due';
      if (state === 'cancelled') status = 'cancelled';

      const nextPayment = new Date();
      nextPayment.setDate(nextPayment.getDate() + 30);

      return {
        id: subscriptionId,
        status: status,
        external_reference: tenantId,
        next_payment_date: status === 'cancelled' ? null : nextPayment.toISOString(),
      };
    }

    try {
      const response = await fetch(`https://api.mercadopago.com/preapproval/${subscriptionId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Mercado Pago API error: ${errText}`);
      }

      const data = await response.json();
      return {
        id: data.id,
        status: data.status, // authorized, paused, cancelled, past_due
        external_reference: data.external_reference, // tenant_id
        next_payment_date: data.next_payment_date,
      };
    } catch (error: any) {
      this.logger.error(`Error al consultar suscripción en Mercado Pago: ${error.message}`);
      throw error;
    }
  }
}
