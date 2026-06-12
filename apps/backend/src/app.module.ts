import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantContextModule } from './common/context/tenant-context.module';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { ProductosModule } from './productos/productos.module';
import { VentasModule } from './ventas/ventas.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { UsersModule } from './users/users.module';
import { CajaModule } from './caja/caja.module';
import { ClientesModule } from './clientes/clientes.module';
import { PromocionesModule } from './promociones/promociones.module';
import { MercadoPagoModule } from './mercadopago/mp.module';
import { FinanzasModule } from './finanzas/finanzas.module';
import { ProveedoresModule } from './proveedores/proveedores.module';
import { GastosModule } from './gastos/gastos.module';
import { ImportModule } from './import/import.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TenantContextModule,
    PrismaModule,
    AuthModule,
    ProductosModule,
    VentasModule,
    SubscriptionsModule,
    UsersModule,
    CajaModule,
    ClientesModule,
    PromocionesModule,
    MercadoPagoModule,
    FinanzasModule,
    ProveedoresModule,
    GastosModule,
    ImportModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantInterceptor,
    },
  ],
})
export class AppModule {}
