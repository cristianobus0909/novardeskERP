import { Module } from '@nestjs/common';
import { ListasPrecioService } from './listas-precio.service';
import { ListasPrecioController } from './listas-precio.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantContextModule } from '../common/context/tenant-context.module';

@Module({
  imports: [PrismaModule, TenantContextModule],
  controllers: [ListasPrecioController],
  providers: [ListasPrecioService],
  exports: [ListasPrecioService],
})
export class ListasPrecioModule {}
