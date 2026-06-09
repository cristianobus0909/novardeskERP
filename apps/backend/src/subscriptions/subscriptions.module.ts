import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextModule } from '../common/context/tenant-context.module';
import { TenantsController } from './tenants.controller';
import { WebhooksController } from './webhooks.controller';
import { MercadoPagoService } from './mercadopago.service';

@Module({
  imports: [PrismaModule, TenantContextModule],
  controllers: [TenantsController, WebhooksController],
  providers: [MercadoPagoService],
  exports: [MercadoPagoService],
})
export class SubscriptionsModule {}
