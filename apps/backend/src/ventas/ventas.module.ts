import { Module } from '@nestjs/common';
import { VentasController } from './ventas.controller';
import { VentasService } from './ventas.service';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextModule } from '../common/context/tenant-context.module';

@Module({
  imports: [PrismaModule, TenantContextModule],
  controllers: [VentasController],
  providers: [VentasService],
  exports: [VentasService],
})
export class VentasModule {}
